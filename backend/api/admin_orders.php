<?php
// backend/api/admin_orders.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/socket_notify.php';

$response = [
    'success' => false,
    'data' => [],
    'stats' => null,
    'message' => ''
];

try {
    // Auto-migrate orders.status column to VARCHAR(20) to permanently prevent "Data truncated for column 'status'"
    @mysqli_query($conn, "ALTER TABLE orders MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'EXECUTED'");
    @mysqli_query($conn, "ALTER TABLE transactions MODIFY COLUMN payment_method VARCHAR(100) DEFAULT 'Net Banking/UPI'");

    // Self-healing integrity reconciliation for active executed orders & holdings
    $active_orders_q = mysqli_query($conn, "SELECT * FROM orders WHERE user_id = 1 AND status = 'EXECUTED' AND order_type = 'BUY'");
    if ($active_orders_q && mysqli_num_rows($active_orders_q) > 0) {
        $calc_inv = 0.00;
        while ($ao = mysqli_fetch_assoc($active_orders_q)) {
            $ao_sym = mysqli_real_escape_string($conn, $ao['stock_symbol']);
            $ao_qty = (int)$ao['quantity'];
            $ao_price = (float)$ao['price'];
            $calc_inv += ($ao_qty * $ao_price);
            
            // Check if holding exists for this stock
            $ch = mysqli_query($conn, "SELECT id FROM holdings WHERE user_id = 1 AND stock_symbol = '$ao_sym'");
            if (!$ch || mysqli_num_rows($ch) == 0) {
                mysqli_query($conn, "INSERT INTO holdings (user_id, stock_symbol, company_name, quantity, avg_price, created_at)
                                     VALUES (1, '$ao_sym', '{$ao_sym} Ltd', $ao_qty, $ao_price, NOW())");
            }
        }
        // Ensure wallet reflects the active invested amount
        mysqli_query($conn, "UPDATE wallets SET total_invested = $calc_inv WHERE user_id = 1 AND total_invested = 0");
    }

    // ----------------------------------------------------
    // POST REQUEST: ORDER RETURN / REFUND ENGINE
    // ----------------------------------------------------
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = $_POST;
        $raw = file_get_contents('php://input');
        if (!empty($raw)) {
            $json = json_decode($raw, true);
            if (is_array($json)) {
                $input = array_merge($input, $json);
            }
        }

        $action = isset($input['action']) ? trim($input['action']) : '';

        if ($action === 'return_order' || $action === 'cancel_order') {
            $order_id = isset($input['order_id']) ? (int)$input['order_id'] : 0;
            if ($order_id <= 0) {
                echo json_encode(['success' => false, 'message' => 'Valid Order ID is required.']);
                exit;
            }

            // Fetch order details
            $ord_res = mysqli_query($conn, "SELECT * FROM orders WHERE id = $order_id LIMIT 1");
            if (!$ord_res || mysqli_num_rows($ord_res) === 0) {
                echo json_encode(['success' => false, 'message' => "Order #ORD-{$order_id} not found."]);
                exit;
            }
            $order = mysqli_fetch_assoc($ord_res);

            $current_status = strtoupper($order['status'] ?? '');
            if ($current_status === 'RETURNED' || $current_status === 'CANCELLED') {
                echo json_encode(['success' => false, 'message' => "Order #ORD-{$order_id} has already been returned/cancelled."]);
                exit;
            }

            $user_id = (int)$order['user_id'];
            $stock_symbol = $order['stock_symbol'];
            $safe_symbol = mysqli_real_escape_string($conn, $stock_symbol);
            $order_type = strtoupper($order['order_type'] ?? 'BUY');
            $quantity = (int)$order['quantity'];
            $price = (float)$order['price'];
            $total_amount = round($quantity * $price, 2);

            // Fetch user's wallet
            $w_res = mysqli_query($conn, "SELECT * FROM wallets WHERE user_id = $user_id LIMIT 1");
            if (!$w_res || mysqli_num_rows($w_res) === 0) {
                mysqli_query($conn, "INSERT INTO wallets (user_id, available_balance, total_invested) VALUES ($user_id, 0.00, 0.00)");
                $cur_avail = 0.00;
                $cur_inv = 0.00;
            } else {
                $wallet = mysqli_fetch_assoc($w_res);
                $cur_avail = (float)$wallet['available_balance'];
                $cur_inv = (float)$wallet['total_invested'];
            }

            // ATOMIC RETURN OPERATION WITH TRANSACTION
            mysqli_begin_transaction($conn);

            // Step 1: Atomically lock and update order status FIRST
            $final_status = 'RETURNED';
            $up = mysqli_query($conn, "UPDATE orders SET status = 'RETURNED' WHERE id = $order_id AND status NOT IN ('RETURNED', 'CANCELLED')");
            if (!$up || mysqli_affected_rows($conn) === 0) {
                // Fallback attempt with CANCELLED if ENUM constraint restricts RETURNED
                $up_fallback = mysqli_query($conn, "UPDATE orders SET status = 'CANCELLED' WHERE id = $order_id AND status NOT IN ('RETURNED', 'CANCELLED')");
                if (!$up_fallback || mysqli_affected_rows($conn) === 0) {
                    mysqli_rollback($conn);
                    echo json_encode(['success' => false, 'message' => "Order #ORD-{$order_id} has already been returned/cancelled or cannot be updated."]);
                    exit;
                }
                $final_status = 'CANCELLED';
            }

            // Step 2: Now that status is updated, apply wallet and holdings adjustments safely
            if ($order_type === 'BUY') {
                // Refund funds to user's wallet & deduct from total_invested
                $new_avail = round($cur_avail + $total_amount, 2);
                $new_inv = round(max(0, $cur_inv - $total_amount), 2);
                mysqli_query($conn, "UPDATE wallets SET available_balance = $new_avail, total_invested = $new_inv, updated_at = NOW() WHERE user_id = $user_id");

                // Deduct shares from holdings
                $h_res = mysqli_query($conn, "SELECT * FROM holdings WHERE user_id = $user_id AND stock_symbol = '$safe_symbol' LIMIT 1");
                if ($h_res && mysqli_num_rows($h_res) > 0) {
                    $holding = mysqli_fetch_assoc($h_res);
                    $hold_qty = (int)$holding['quantity'];
                    if ($hold_qty <= $quantity) {
                        mysqli_query($conn, "DELETE FROM holdings WHERE id = " . (int)$holding['id']);
                    } else {
                        $new_hold_qty = $hold_qty - $quantity;
                        mysqli_query($conn, "UPDATE holdings SET quantity = $new_hold_qty, updated_at = NOW() WHERE id = " . (int)$holding['id']);
                    }
                }

                // Record credit ledger transaction
                mysqli_query($conn, "INSERT INTO transactions (user_id, amount, type, payment_method, status, txn_id, created_at) 
                                     VALUES ($user_id, $total_amount, 'Deposit', 'Order Return #ORD-{$order_id} ({$safe_symbol})', 'Completed', '$txn_ref', NOW())");

            } else {
                // SELL order reversal
                $new_avail = round(max(0, $cur_avail - $total_amount), 2);
                $new_inv = $cur_inv;
                mysqli_query($conn, "UPDATE wallets SET available_balance = $new_avail, updated_at = NOW() WHERE user_id = $user_id");

                // Restore shares to holdings
                $h_res = mysqli_query($conn, "SELECT * FROM holdings WHERE user_id = $user_id AND stock_symbol = '$safe_symbol' LIMIT 1");
                if ($h_res && mysqli_num_rows($h_res) > 0) {
                    $holding = mysqli_fetch_assoc($h_res);
                    $new_hold_qty = (int)$holding['quantity'] + $quantity;
                    mysqli_query($conn, "UPDATE holdings SET quantity = $new_hold_qty, updated_at = NOW() WHERE id = " . (int)$holding['id']);
                } else {
                    mysqli_query($conn, "INSERT INTO holdings (user_id, stock_symbol, company_name, quantity, avg_price, created_at) 
                                         VALUES ($user_id, '$safe_symbol', '{$safe_symbol} Ltd', $quantity, $price, NOW())");
                }

                // Record reversal in transactions
                mysqli_query($conn, "INSERT INTO transactions (user_id, amount, type, payment_method, status, txn_id, created_at) 
                                     VALUES ($user_id, $total_amount, 'Withdrawal', 'Sell Order Return #ORD-{$order_id} ({$safe_symbol})', 'Completed', '$txn_ref', NOW())");
            }

            // Step 3: Commit atomic transaction
            mysqli_commit($conn);

            // Broadcast real-time WebSocket events
            $event_payload = [
                'order_id' => $order_id,
                'id' => $order_id,
                'user_id' => $user_id,
                'stock_symbol' => $stock_symbol,
                'symbol' => $stock_symbol,
                'order_type' => $order_type,
                'type' => $order_type,
                'quantity' => $quantity,
                'price' => $price,
                'total_amount' => $total_amount,
                'status' => $final_status,
                'created_at' => $order['created_at'] ?? date('Y-m-d H:i:s')
            ];

            broadcast_socket_event('ORDER_UPDATED', $event_payload);
            broadcast_socket_event('ORDER_PLACED', $event_payload);
            broadcast_socket_event('FUNDS_UPDATED', [
                'user_id' => $user_id,
                'available_balance' => $new_avail,
                'available_margin' => $new_avail,
                'total_invested' => $new_inv
            ]);
            broadcast_socket_event('REFRESH_DATA', ['target' => 'all', 'user_id' => $user_id]);

            echo json_encode([
                'success' => true,
                'message' => "Order #ORD-{$order_id} successfully returned! ₹" . number_format($total_amount, 2) . " refunded to user's wallet.",
                'order_id' => $order_id,
                'status' => $final_status,
                'refund_amount' => $total_amount,
                'available_balance' => $new_avail
            ]);
            exit;
        }

        echo json_encode(['success' => false, 'message' => "Invalid action: {$action}"]);
        exit;
    }

    // ----------------------------------------------------
    // GET REQUEST: FETCH ORDERS DIRECTORY
    // ----------------------------------------------------
    $orders_query = "SELECT o.*, u.mobile, u.email, k.full_name 
                     FROM orders o 
                     LEFT JOIN users u ON o.user_id = u.id 
                     LEFT JOIN kyc_details k ON o.user_id = k.user_id 
                     ORDER BY o.created_at DESC, o.id DESC";
    $result = mysqli_query($conn, $orders_query);

    $orders = [];
    $buyCount = 0;
    $sellCount = 0;

    if ($result) {
        while ($o = mysqli_fetch_assoc($result)) {
            $side = strtoupper($o['order_type'] ?? 'BUY');
            if ($side === 'BUY') $buyCount++;
            else $sellCount++;

            $qty = (int)$o['quantity'];
            $price = (float)$o['price'];
            $val = $qty * $price;
            $createdTs = !empty($o['created_at']) && $o['created_at'] !== '0000-00-00 00:00:00' ? strtotime($o['created_at']) : time();

            $orders[] = [
                'id' => (int)$o['id'],
                'order_ref' => '#ORD-' . $o['id'],
                'stock_symbol' => $o['stock_symbol'],
                'order_type' => $side,
                'quantity' => $qty,
                'price' => $price,
                'total_amount' => $val,
                'status' => $o['status'] ?? 'Executed',
                'user_id' => (int)$o['user_id'],
                'uid_formatted' => '#UID-' . str_pad($o['user_id'], 4, '0', STR_PAD_LEFT),
                'user_name' => !empty($o['full_name']) ? $o['full_name'] : (!empty($o['mobile']) ? $o['mobile'] : 'Investor #' . $o['user_id']),
                'mobile' => $o['mobile'] ?? 'N/A',
                'email' => $o['email'] ?? '',
                'created_at' => $o['created_at'],
                'date_formatted' => date('d M Y, h:i A', $createdTs)
            ];
        }
    }

    $response['success'] = true;
    $response['data'] = $orders;
    $response['stats'] = [
        'total' => count($orders),
        'buy_count' => $buyCount,
        'sell_count' => $sellCount
    ];
    $response['message'] = "Orders fetched successfully.";
} catch (Exception $e) {
    $response['message'] = "Error: " . $e->getMessage();
}

echo json_encode($response);
?>
