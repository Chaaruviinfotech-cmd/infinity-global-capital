<?php
// backend/api/place_order.php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    require_once __DIR__ . '/../config/db.php';
    require_once __DIR__ . '/../config/socket_notify.php';

    // Parse input from JSON body, React Native _parts, urlencoded, or $_POST/$_REQUEST
    $input = $_POST;
    $raw_input = file_get_contents('php://input');
    if (!empty($raw_input)) {
        $json_data = json_decode($raw_input, true);
        if (is_array($json_data)) {
            if (isset($json_data['_parts']) && is_array($json_data['_parts'])) {
                foreach ($json_data['_parts'] as $part) {
                    if (isset($part[0]) && isset($part[1])) {
                        $input[$part[0]] = $part[1];
                    }
                }
            } else {
                $input = array_merge($input, $json_data);
            }
        } else if (strpos($raw_input, '=') !== false) {
            parse_str($raw_input, $parsed_raw);
            if (is_array($parsed_raw)) {
                $input = array_merge($input, $parsed_raw);
            }
        }
    }
    $input = array_merge($_REQUEST, $input);

    $user_id = isset($input['user_id']) ? (int)$input['user_id'] : 1;
    $stock_symbol = isset($input['stock_symbol']) ? strtoupper(trim((string)$input['stock_symbol'])) : (isset($input['symbol']) ? strtoupper(trim((string)$input['symbol'])) : '');
    $quantity = isset($input['quantity']) ? (int)$input['quantity'] : (isset($input['qty']) ? (int)$input['qty'] : 0);
    $order_type = isset($input['order_type']) ? strtoupper(trim((string)$input['order_type'])) : (isset($input['type']) ? strtoupper(trim((string)$input['type'])) : 'BUY');
    $custom_price = isset($input['price']) ? floatval($input['price']) : 0;

    if ($user_id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Valid User ID is required.']);
        exit;
    }
    if (empty($stock_symbol)) {
        echo json_encode(['success' => false, 'message' => 'Stock symbol is required (e.g. RELIANCE).']);
        exit;
    }
    if ($quantity <= 0) {
        echo json_encode(['success' => false, 'message' => 'Quantity must be at least 1 share.']);
        exit;
    }

    // Prevent duplicate rapid submissions (within 3 seconds)
    $safe_symbol_check = mysqli_real_escape_string($conn, $stock_symbol);
    $safe_type_check = mysqli_real_escape_string($conn, $order_type);
    $dup_check = mysqli_query($conn, "SELECT id FROM orders 
                                       WHERE user_id = $user_id 
                                         AND stock_symbol = '$safe_symbol_check' 
                                         AND order_type = '$safe_type_check' 
                                         AND quantity = $quantity 
                                         AND created_at >= NOW() - INTERVAL 3 SECOND 
                                       ORDER BY id DESC LIMIT 1");
    if ($dup_check && mysqli_num_rows($dup_check) > 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Duplicate order prevented. You just submitted an identical order a moment ago.'
        ]);
        exit;
    }

    // Verify stock exists in watchlist_stocks
    $safe_symbol = mysqli_real_escape_string($conn, $stock_symbol);
    $stock_res = mysqli_query($conn, "SELECT * FROM watchlist_stocks WHERE symbol = '$safe_symbol' LIMIT 1");
    if (!$stock_res || mysqli_num_rows($stock_res) === 0) {
        echo json_encode(['success' => false, 'message' => "Stock '{$stock_symbol}' is not registered in the market desk."]);
        exit;
    }
    $stock = mysqli_fetch_assoc($stock_res);
    $company_name = !empty($stock['company_name']) ? $stock['company_name'] : ($stock_symbol . ' Ltd');

    // Determine execution price
    $execution_price = ($custom_price > 0) ? $custom_price : floatval($stock['current_price']);
    if ($execution_price <= 0) {
        echo json_encode(['success' => false, 'message' => "Invalid execution price for '{$stock_symbol}'."]);
        exit;
    }

    $total_cost = round($quantity * $execution_price, 2);

    // Fetch user wallet
    $wallet_res = mysqli_query($conn, "SELECT * FROM wallets WHERE user_id = $user_id LIMIT 1");
    if (!$wallet_res || mysqli_num_rows($wallet_res) === 0) {
        // Auto initialize wallet if missing
        mysqli_query($conn, "INSERT INTO wallets (user_id, available_balance, total_invested) VALUES ($user_id, 0.00, 0.00)");
        $available_balance = 0.00;
        $total_invested = 0.00;
    } else {
        $wallet = mysqli_fetch_assoc($wallet_res);
        $available_balance = (float)$wallet['available_balance'];
        $total_invested = (float)$wallet['total_invested'];
    }

    // ========================================================
    // ORDER TYPE: BUY
    // ========================================================
    if ($order_type === 'BUY') {
        if ($available_balance < $total_cost) {
            echo json_encode([
                'success' => false,
                'message' => "Insufficient margin balance. Available: ₹" . number_format($available_balance, 2) . ", Required: ₹" . number_format($total_cost, 2) . ". Please add funds to your wallet.",
                'available_balance' => $available_balance,
                'required_amount' => $total_cost,
                'shortfall' => round($total_cost - $available_balance, 2)
            ]);
            exit;
        }

        // 1. Deduct from wallet & add to total_invested
        $new_available = round($available_balance - $total_cost, 2);
        $new_invested = round($total_invested + $total_cost, 2);
        mysqli_query($conn, "UPDATE wallets SET available_balance = $new_available, total_invested = $new_invested, updated_at = NOW() WHERE user_id = $user_id");

        // 2. Insert into orders table
        $ins_order = "INSERT INTO orders (user_id, stock_symbol, order_type, quantity, price, status, created_at) 
                      VALUES ($user_id, '$safe_symbol', 'BUY', $quantity, $execution_price, 'EXECUTED', NOW())";
        mysqli_query($conn, $ins_order);
        $order_id = mysqli_insert_id($conn);

        // 3. Record transaction ledger entry
        $txn_ref = 'ORD-' . date('Ymd') . '-' . str_pad($order_id, 5, '0', STR_PAD_LEFT);
        $safe_company = mysqli_real_escape_string($conn, $company_name);
        $ins_txn = "INSERT INTO transactions (user_id, amount, type, payment_method, status, txn_id, created_at) 
                    VALUES ($user_id, $total_cost, 'Withdrawal', 'Buy {$safe_symbol}', 'Completed', '$txn_ref', NOW())";
        mysqli_query($conn, $ins_txn);

        // 4. Update or Insert into holdings table
        $hold_res = mysqli_query($conn, "SELECT * FROM holdings WHERE user_id = $user_id AND stock_symbol = '$safe_symbol' LIMIT 1");
        if ($hold_res && mysqli_num_rows($hold_res) > 0) {
            $existing_hold = mysqli_fetch_assoc($hold_res);
            $hold_id = (int)$existing_hold['id'];
            $old_qty = (int)$existing_hold['quantity'];
            $old_avg = (float)$existing_hold['avg_price'];

            $new_qty = $old_qty + $quantity;
            $new_avg = round((($old_qty * $old_avg) + ($quantity * $execution_price)) / $new_qty, 2);

            mysqli_query($conn, "UPDATE holdings SET quantity = $new_qty, avg_price = $new_avg, updated_at = NOW() WHERE id = $hold_id");
        } else {
            mysqli_query($conn, "INSERT INTO holdings (user_id, stock_symbol, company_name, quantity, avg_price, created_at) 
                                 VALUES ($user_id, '$safe_symbol', '$safe_company', $quantity, $execution_price, NOW())");
        }

        // Real-Time Socket Broadcasts
        broadcast_socket_event('ORDER_PLACED', [
            'order_id' => $order_id,
            'id' => $order_id,
            'user_id' => $user_id,
            'stock_symbol' => $stock_symbol,
            'symbol' => $stock_symbol,
            'company_name' => $company_name,
            'order_type' => 'BUY',
            'type' => 'BUY',
            'quantity' => $quantity,
            'price' => $execution_price,
            'total_amount' => $total_cost,
            'status' => 'EXECUTED',
            'created_at' => date('Y-m-d H:i:s')
        ]);

        broadcast_socket_event('FUNDS_UPDATED', [
            'user_id' => $user_id,
            'available_balance' => $new_available,
            'available_margin' => $new_available,
            'total_invested' => $new_invested
        ]);

        echo json_encode([
            'success' => true,
            'message' => "Order Executed Successfully! Purchased {$quantity} shares of {$stock_symbol} at ₹" . number_format($execution_price, 2) . " (Total: ₹" . number_format($total_cost, 2) . ").",
            'data' => [
                'order_id' => $order_id,
                'symbol' => $stock_symbol,
                'company_name' => $company_name,
                'order_type' => 'BUY',
                'quantity' => $quantity,
                'price' => $execution_price,
                'total_cost' => $total_cost,
                'status' => 'EXECUTED',
                'txn_id' => $txn_ref,
                'available_balance' => $new_available,
                'total_invested' => $new_invested,
                'executed_at' => date('Y-m-d H:i:s')
            ]
        ]);
        exit;
    }

    // ========================================================
    // ORDER TYPE: SELL
    // ========================================================
    if ($order_type === 'SELL') {
        $hold_res = mysqli_query($conn, "SELECT * FROM holdings WHERE user_id = $user_id AND stock_symbol = '$safe_symbol' LIMIT 1");
        if (!$hold_res || mysqli_num_rows($hold_res) === 0) {
            echo json_encode(['success' => false, 'message' => "You do not hold any shares of {$stock_symbol} to sell."]);
            exit;
        }
        $existing_hold = mysqli_fetch_assoc($hold_res);
        $current_qty = (int)$existing_hold['quantity'];
        if ($current_qty < $quantity) {
            echo json_encode(['success' => false, 'message' => "Insufficient holding quantity. You only hold {$current_qty} shares of {$stock_symbol}."]);
            exit;
        }

        $proceeds = round($quantity * $execution_price, 2);
        $new_available = round($available_balance + $proceeds, 2);
        mysqli_query($conn, "UPDATE wallets SET available_balance = $new_available, updated_at = NOW() WHERE user_id = $user_id");

        // Insert order
        mysqli_query($conn, "INSERT INTO orders (user_id, stock_symbol, order_type, quantity, price, status, created_at) 
                             VALUES ($user_id, '$safe_symbol', 'SELL', $quantity, $execution_price, 'EXECUTED', NOW())");
        $order_id = mysqli_insert_id($conn);

        // Record transaction
        $txn_ref = 'ORD-' . date('Ymd') . '-' . str_pad($order_id, 5, '0', STR_PAD_LEFT);
        mysqli_query($conn, "INSERT INTO transactions (user_id, amount, type, payment_method, status, txn_id, created_at) 
                             VALUES ($user_id, $proceeds, 'Deposit', 'Sell {$safe_symbol}', 'Completed', '$txn_ref', NOW())");

        // Update holdings
        $remaining_qty = $current_qty - $quantity;
        if ($remaining_qty <= 0) {
            mysqli_query($conn, "DELETE FROM holdings WHERE id = " . (int)$existing_hold['id']);
        } else {
            mysqli_query($conn, "UPDATE holdings SET quantity = $remaining_qty, updated_at = NOW() WHERE id = " . (int)$existing_hold['id']);
        }

        // Real-Time Socket Broadcasts
        broadcast_socket_event('ORDER_PLACED', [
            'order_id' => $order_id,
            'id' => $order_id,
            'user_id' => $user_id,
            'stock_symbol' => $stock_symbol,
            'symbol' => $stock_symbol,
            'order_type' => 'SELL',
            'type' => 'SELL',
            'quantity' => $quantity,
            'price' => $execution_price,
            'total_amount' => $proceeds,
            'status' => 'EXECUTED',
            'created_at' => date('Y-m-d H:i:s')
        ]);

        broadcast_socket_event('FUNDS_UPDATED', [
            'user_id' => $user_id,
            'available_balance' => $new_available,
            'available_margin' => $new_available
        ]);

        echo json_encode([
            'success' => true,
            'message' => "Sell Order Executed Successfully! Sold {$quantity} shares of {$stock_symbol} at ₹" . number_format($execution_price, 2) . " (Credited: ₹" . number_format($proceeds, 2) . ").",
            'data' => [
                'order_id' => $order_id,
                'symbol' => $stock_symbol,
                'order_type' => 'SELL',
                'quantity' => $quantity,
                'price' => $execution_price,
                'proceeds' => $proceeds,
                'status' => 'EXECUTED',
                'available_balance' => $new_available
            ]
        ]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => "Unsupported order type: {$order_type}."]);

} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
?>
