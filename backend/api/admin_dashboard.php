<?php
// backend/api/admin_dashboard.php
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
    // 1. Total Registered Users
    $u_res = mysqli_query($conn, "SELECT COUNT(*) as count FROM users");
    $totalUsers = ($u_res && $row = mysqli_fetch_assoc($u_res)) ? (int)$row['count'] : 0;

    // 2. Pending KYC Verifications
    $k_res = mysqli_query($conn, "SELECT COUNT(*) as count FROM kyc_details WHERE status = 'Pending'");
    $pendingKyc = ($k_res && $row = mysqli_fetch_assoc($k_res)) ? (int)$row['count'] : 0;

    // 3. Wallets Capital & Margin
    $avail_funds = 0.00;
    $total_invested = 0.00;
    $w_res = mysqli_query($conn, "SELECT SUM(available_balance) as avail, SUM(total_invested) as inv FROM wallets");
    if ($w_res && $w_row = mysqli_fetch_assoc($w_res)) {
        if (!empty($w_row['avail'])) $avail_funds = (float)$w_row['avail'];
        if (!empty($w_row['inv'])) $total_invested = (float)$w_row['inv'];
    }

    // 4. Holdings Count
    $h_res = mysqli_query($conn, "SELECT COUNT(*) as cnt FROM holdings");
    $holdings_count = ($h_res && $h_row = mysqli_fetch_assoc($h_res)) ? (int)$h_row['cnt'] : 0;

    // 5. Live Portfolio Day P&L
    $day_pnl = 0.00;
    $total_portfolio_value = 0.00;
    $live_pnl_res = mysqli_query($conn, "
        SELECT SUM(h.quantity * ws.day_change) as total_day_pnl, 
               SUM(h.quantity * ws.current_price) as total_curr_val
        FROM holdings h 
        JOIN watchlist_stocks ws ON h.stock_symbol = ws.symbol
    ");
    if ($live_pnl_res && $lp = mysqli_fetch_assoc($live_pnl_res)) {
        if ($lp['total_day_pnl'] !== null) $day_pnl = (float)$lp['total_day_pnl'];
        if ($lp['total_curr_val'] !== null) $total_portfolio_value = (float)$lp['total_curr_val'];
    }

    if ($total_portfolio_value == 0) {
        $total_portfolio_value = $total_invested + $day_pnl;
    }
    $day_pnl_pct = ($total_portfolio_value > 0) ? round(($day_pnl / $total_portfolio_value) * 100, 2) : 0.00;

    // 6. Top Gainers Strip
    $stocks_res = mysqli_query($conn, "SELECT symbol, company_name, current_price, day_change, day_change_percent FROM watchlist_stocks ORDER BY day_change_percent DESC LIMIT 4");
    $topGainers = [];
    if ($stocks_res) {
        while ($stk = mysqli_fetch_assoc($stocks_res)) {
            $topGainers[] = [
                'symbol' => $stk['symbol'],
                'company_name' => $stk['company_name'],
                'current_price' => (float)$stk['current_price'],
                'day_change' => (float)$stk['day_change'],
                'day_change_percent' => (float)$stk['day_change_percent']
            ];
        }
    }

    $response['success'] = true;
    $response['data'] = [
        'total_users' => $totalUsers,
        'pending_kyc' => $pendingKyc,
        'available_funds' => $avail_funds,
        'total_invested' => $total_invested,
        'total_portfolio_value' => $total_portfolio_value,
        'day_pnl' => $day_pnl,
        'day_pnl_pct' => $day_pnl_pct,
        'holdings_count' => $holdings_count,
        'top_gainers' => $topGainers
    ];
    $response['message'] = "Dashboard data fetched successfully.";
} catch (Exception $e) {
    $response['message'] = "Error: " . $e->getMessage();
}

echo json_encode($response);
?>
