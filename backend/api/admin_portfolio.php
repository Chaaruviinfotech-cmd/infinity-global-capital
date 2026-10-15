<?php
// backend/api/admin_portfolio.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';

$response = [
    'success' => false,
    'data' => null,
    'message' => ''
];

try {
    // 1. Fetch live prices from watchlist_stocks
    $live_prices = [];
    $wp_q = mysqli_query($conn, "SELECT symbol, current_price, company_name FROM watchlist_stocks");
    if ($wp_q) {
        while ($wp = mysqli_fetch_assoc($wp_q)) {
            $live_prices[$wp['symbol']] = [
                'price' => (float)$wp['current_price'],
                'name' => $wp['company_name']
            ];
        }
    }

    // 2. Fetch all holdings joined with user & KYC
    $holdings_query = "SELECT h.*, u.mobile, u.email, k.full_name 
                       FROM holdings h 
                       JOIN users u ON h.user_id = u.id 
                       LEFT JOIN kyc_details k ON u.id = k.user_id 
                       ORDER BY h.created_at DESC, h.id DESC";
    $res = mysqli_query($conn, $holdings_query);

    $total_inv = 0.00;
    $total_cur = 0.00;
    $holdings_list = [];

    if ($res) {
        while ($row = mysqli_fetch_assoc($res)) {
            $sym = $row['stock_symbol'];
            $qty = (int)$row['quantity'];
            $avg_buy = (float)$row['avg_price'];
            $inv = $qty * $avg_buy;

            $curr_price = isset($live_prices[$sym]) ? $live_prices[$sym]['price'] : ($avg_buy * 1.05);
            $company_name = isset($live_prices[$sym]) ? $live_prices[$sym]['name'] : $sym;
            $cur_val = $qty * $curr_price;
            $pnl = $cur_val - $inv;
            $pnl_pct = ($inv > 0) ? ($pnl / $inv) * 100 : 0.00;

            $total_inv += $inv;
            $total_cur += $cur_val;

            $holdings_list[] = [
                'id' => (int)$row['id'],
                'user_id' => (int)$row['user_id'],
                'user_name' => !empty($row['full_name']) ? $row['full_name'] : 'Investor #' . $row['user_id'],
                'mobile' => $row['mobile'] ?? 'N/A',
                'email' => $row['email'] ?? '',
                'stock_symbol' => $sym,
                'company_name' => $company_name,
                'quantity' => $qty,
                'avg_price' => $avg_buy,
                'current_price' => $curr_price,
                'invested_val' => $inv,
                'current_val' => $cur_val,
                'pnl' => $pnl,
                'pnl_pct' => round($pnl_pct, 2),
                'created_at' => $row['created_at']
            ];
        }
    }

    $total_profit = $total_cur - $total_inv;
    $total_profit_pct = ($total_inv > 0) ? round(($total_profit / $total_inv) * 100, 2) : 0.00;

    $response['success'] = true;
    $response['data'] = [
        'summary' => [
            'total_invested' => $total_inv,
            'total_current' => $total_cur,
            'total_profit' => $total_profit,
            'total_profit_pct' => $total_profit_pct,
            'holdings_count' => count($holdings_list)
        ],
        'holdings' => $holdings_list
    ];
    $response['message'] = "Portfolio holdings loaded successfully.";
} catch (Exception $e) {
    $response['message'] = "Error: " . $e->getMessage();
}

echo json_encode($response);
?>
