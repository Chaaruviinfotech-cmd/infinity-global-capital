<?php
// api/get_portfolio.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once __DIR__ . '/../config/db.php';

$user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 1;

$response = ['success' => false, 'data' => null, 'message' => ''];

try {
    // 1. Fetch live stock prices dynamically from watchlist_stocks table
    $live_prices = [];
    $wp_res = mysqli_query($conn, "SELECT symbol, current_price FROM watchlist_stocks");
    if ($wp_res) {
        while ($wp = mysqli_fetch_assoc($wp_res)) {
            $live_prices[$wp['symbol']] = (float)$wp['current_price'];
        }
    }

    // Check if user exists
    $u_res = @mysqli_query($conn, "SELECT id FROM users WHERE id = $user_id");
    if (!$u_res || mysqli_num_rows($u_res) == 0) {
        require_once __DIR__ . '/../config/socket_notify.php';
        broadcast_socket_event('FORCE_LOGOUT', ['user_id' => $user_id, 'reason' => 'user_deleted']);
        echo json_encode(['success' => false, 'is_deleted' => true, 'message' => 'User does not exist.']);
        exit;
    }

    // 2. Fetch user's holdings
    $holdings_res = mysqli_query($conn, "SELECT * FROM holdings WHERE user_id = $user_id ORDER BY id ASC");

    $holdings = [];
    $total_invested = 0;
    $total_current_value = 0;

    if ($holdings_res) {
        while ($row = mysqli_fetch_assoc($holdings_res)) {
            $qty = (int)$row['quantity'];
            $avg_price = (float)$row['avg_price'];
            $invested = $qty * $avg_price;
            $total_invested += $invested;
            
            $sym = $row['stock_symbol'];
            $curr_price = isset($live_prices[$sym]) ? $live_prices[$sym] : ($avg_price * 1.05);
            $val = $qty * $curr_price;
            $total_current_value += $val;
            
            $pnl = $val - $invested;
            $pnl_percent = $invested > 0 ? ($pnl / $invested) * 100 : 0;

            $holdings[] = [
                'id' => (int)$row['id'],
                'user_id' => (int)$row['user_id'],
                'stock_symbol' => $sym,
                'company_name' => !empty($row['company_name']) ? $row['company_name'] : $sym,
                'quantity' => $qty,
                'avg_price' => $avg_price,
                'current_price' => $curr_price,
                'invested_amount' => $invested,
                'current_value' => $val,
                'pnl' => $pnl,
                'pnl_percent' => $pnl_percent,
                'created_at' => $row['created_at']
            ];
        }
    }

    $total_pnl = $total_current_value - $total_invested;
    $total_pnl_percent = $total_invested > 0 ? ($total_pnl / $total_invested) * 100 : 0;

    $response['success'] = true;
    $response['data'] = [
        'summary' => [
            'invested' => $total_invested,
            'current_value' => $total_current_value,
            'total_pnl' => $total_pnl,
            'pnl_percent' => $total_pnl_percent
        ],
        'holdings' => $holdings
    ];
    $response['message'] = "Portfolio fetched successfully.";

} catch (Exception $e) {
    $response['message'] = "Error: " . $e->getMessage();
}

echo json_encode($response);
?>
