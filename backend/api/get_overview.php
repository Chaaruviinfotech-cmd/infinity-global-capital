<?php
// api/get_overview.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once __DIR__ . '/../config/db.php';

$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 1;

$response = [
    'success' => false,
    'data' => null,
    'message' => ''
];

try {
    // Self-migrate missing columns in users table
    $chk_req = @mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'kyc_requested'");
    if ($chk_req && mysqli_num_rows($chk_req) == 0) {
        @mysqli_query($conn, "ALTER TABLE users ADD COLUMN kyc_requested TINYINT(1) DEFAULT 0");
    }
    $chk_name = @mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'full_name'");
    if ($chk_name && mysqli_num_rows($chk_name) == 0) {
        @mysqli_query($conn, "ALTER TABLE users ADD COLUMN full_name VARCHAR(100) NULL");
    }

    // 1. Fetch User details safely without column lock
    $user_info = [
        'id' => $user_id,
        'mobile' => '',
        'email' => '',
        'full_name' => 'Investor #' . str_pad($user_id, 4, '0', STR_PAD_LEFT),
        'pan_number' => '',
        'account_no' => '',
        'ifsc_code' => '',
        'kyc_status' => 'Pending',
        'is_kyc_verified' => 0,
        'kyc_requested' => 0
    ];

    $u_res = @mysqli_query($conn, "SELECT * FROM users WHERE id = $user_id");
    $u_row = ($u_res && mysqli_num_rows($u_res) > 0) ? mysqli_fetch_assoc($u_res) : null;
    if (!$u_row) {
        // User was deleted from the database! Broadcast FORCE_LOGOUT immediately
        require_once __DIR__ . '/../config/socket_notify.php';
        broadcast_socket_event('FORCE_LOGOUT', [
            'user_id' => $user_id,
            'reason' => 'user_deleted_from_database'
        ]);
        echo json_encode([
            'success' => false,
            'is_deleted' => true,
            'message' => 'User account does not exist or has been deleted from the database.'
        ]);
        exit;
    }

    $user_info['id'] = (int)$u_row['id'];
    $user_info['mobile'] = $u_row['mobile'] ?? '';
    $user_info['email'] = $u_row['email'] ?? '';
    $user_info['full_name'] = !empty($u_row['full_name']) ? $u_row['full_name'] : ('Trader #' . $u_row['id']);
    $user_info['is_kyc_verified'] = (int)($u_row['is_kyc_verified'] ?? 0);
    $user_info['kyc_requested'] = (int)($u_row['kyc_requested'] ?? 0);
    if (!empty($u_row['kyc_status'])) {
        $user_info['kyc_status'] = $u_row['kyc_status'];
    }

    $k_res = @mysqli_query($conn, "SELECT * FROM kyc_details WHERE user_id = $user_id ORDER BY id DESC LIMIT 1");
    $k_row = ($k_res && mysqli_num_rows($k_res) > 0) ? mysqli_fetch_assoc($k_res) : null;
    if ($k_row) {
        if (!empty($k_row['full_name']) && (empty($u_row) || empty($u_row['full_name']))) {
            $user_info['full_name'] = $k_row['full_name'];
        }
        $user_info['pan_number'] = $k_row['pan_number'] ?? '';
        $user_info['account_no'] = $k_row['account_no'] ?? '';
        $user_info['ifsc_code'] = $k_row['ifsc_code'] ?? '';
        if (!empty($k_row['status'])) {
            $user_info['kyc_status'] = $k_row['status'];
        }
    }

    // 2. Fetch Wallet Balance
    $wallet_query = "SELECT available_balance, total_invested FROM wallets WHERE user_id = $user_id";
    $wallet_result = mysqli_query($conn, $wallet_query);
    
    $available_margin = 0.00;
    $invested_amount = 0.00;

    if ($wallet_result && mysqli_num_rows($wallet_result) > 0) {
        $wallet_data = mysqli_fetch_assoc($wallet_result);
        $available_margin = (float)$wallet_data['available_balance'];
        $invested_amount = (float)$wallet_data['total_invested'];
    }

    // 3. Fetch Stock Live Prices to calculate dynamic holdings valuation
    $live_prices = [];
    $wp_res = mysqli_query($conn, "SELECT symbol, current_price, day_change, day_change_percent FROM watchlist_stocks");
    if ($wp_res) {
        while ($wp = mysqli_fetch_assoc($wp_res)) {
            $live_prices[$wp['symbol']] = [
                'price' => (float)$wp['current_price'],
                'day_change' => (float)$wp['day_change'],
                'day_change_percent' => (float)$wp['day_change_percent']
            ];
        }
    }

    // 4. Calculate User's Holdings Real-time Value and Day P&L
    $holdings_res = mysqli_query($conn, "SELECT * FROM holdings WHERE user_id = $user_id");
    if (!$holdings_res || mysqli_num_rows($holdings_res) == 0) {
        $holdings_res = mysqli_query($conn, "SELECT * FROM holdings WHERE user_id = 1");
    }

    $calculated_invested = 0;
    $calculated_current = 0;
    $calculated_day_pnl = 0;
    $holdings_count = 0;

    if ($holdings_res) {
        while ($h = mysqli_fetch_assoc($holdings_res)) {
            $holdings_count++;
            $qty = (int)$h['quantity'];
            $avg = (float)$h['avg_price'];
            $sym = $h['stock_symbol'];
            $inv = $qty * $avg;
            $calculated_invested += $inv;

            $curr = isset($live_prices[$sym]) ? $live_prices[$sym]['price'] : ($avg * 1.05);
            $day_chg = isset($live_prices[$sym]) ? $live_prices[$sym]['day_change'] : 0;
            
            $calculated_current += ($qty * $curr);
            $calculated_day_pnl += ($qty * $day_chg);
        }
    }

    if ($calculated_invested > 0) {
        $invested_amount = $calculated_invested;
    }
    // Real Portfolio Valuation: Current Stock Value + Available Cash Margin
    $total_portfolio_value = round($calculated_current + $available_margin, 2);
    $day_pnl = round($calculated_day_pnl, 2);
    $day_pnl_percent = $calculated_invested > 0 ? round(($day_pnl / $calculated_invested) * 100, 2) : 0.00;

    // 5. Fetch Top Market Gainers dynamically from DB
    $gainers_res = mysqli_query($conn, "SELECT * FROM watchlist_stocks WHERE is_up = 1 ORDER BY day_change_percent DESC LIMIT 4");
    $top_gainers = [];
    if ($gainers_res) {
        while ($g = mysqli_fetch_assoc($gainers_res)) {
            $top_gainers[] = [
                'symbol' => $g['symbol'],
                'name' => $g['company_name'],
                'sector' => $g['sector'],
                'price' => number_format((float)$g['current_price'], 2),
                'gain' => '+' . number_format((float)$g['day_change_percent'], 2) . '%',
                'change' => '+' . number_format((float)$g['day_change'], 2),
                'is_up' => true
            ];
        }
    }

    // Dynamic Market Indices from market_indices table
    $market_indices = [];
    $idx_check = mysqli_query($conn, "SHOW TABLES LIKE 'market_indices'");
    if ($idx_check && mysqli_num_rows($idx_check) > 0) {
        $idx_res = mysqli_query($conn, "SELECT * FROM market_indices ORDER BY id ASC");
        if ($idx_res) {
            while ($idx_row = mysqli_fetch_assoc($idx_res)) {
                $chg_pct = $idx_row['day_change_percent'];
                if (strpos($chg_pct, '%') === false) $chg_pct .= '%';
                $is_up = (strpos($chg_pct, '-') === false && floatval($idx_row['day_change']) >= 0);
                $market_indices[] = [
                    'name' => $idx_row['name'],
                    'value' => $idx_row['value'],
                    'change' => $chg_pct,
                    'is_up' => $is_up
                ];
            }
        }
    }
    if (empty($market_indices)) {
        $market_indices = [
            ['name' => 'NIFTY 50', 'value' => '25,420.35', 'change' => '+0.82%', 'is_up' => true],
            ['name' => 'SENSEX', 'value' => '83,210.44', 'change' => '+0.71%', 'is_up' => true],
            ['name' => 'BANK NIFTY', 'value' => '52,180.10', 'change' => '+1.15%', 'is_up' => true]
        ];
    }

    // Fetch all admin added stocks from watchlist_stocks for dynamic charts and trading
    $all_stocks = [];
    $all_stocks_res = @mysqli_query($conn, "SELECT * FROM watchlist_stocks ORDER BY id ASC");
    if ($all_stocks_res) {
        while ($st = mysqli_fetch_assoc($all_stocks_res)) {
            $curr_p = (float)$st['current_price'];
            $prev_p = isset($st['prev_close']) && $st['prev_close'] !== null ? (float)$st['prev_close'] : $curr_p;
            $open_p = isset($st['open_price']) && $st['open_price'] !== null ? (float)$st['open_price'] : $curr_p;
            $high_p = isset($st['high_price']) && $st['high_price'] !== null ? (float)$st['high_price'] : (max($open_p, $curr_p) * 1.01);
            $low_p = isset($st['low_price']) && $st['low_price'] !== null ? (float)$st['low_price'] : (min($open_p, $curr_p) * 0.99);
            $chg = (float)$st['day_change'];
            $chg_pct = (float)$st['day_change_percent'];

            $all_stocks[] = [
                'id' => (int)$st['id'],
                'symbol' => $st['symbol'],
                'name' => $st['company_name'],
                'company_name' => $st['company_name'],
                'sector' => $st['sector'] ?? 'General',
                'category' => $st['category'] ?? 'Equities',
                'current_price' => $curr_p,
                'prev_close' => $prev_p,
                'open_price' => $open_p,
                'high_price' => $high_p,
                'low_price' => $low_p,
                'day_change' => $chg,
                'day_change_percent' => $chg_pct,
                'is_up' => (bool)$st['is_up'],
                'volume' => !empty($st['volume']) ? $st['volume'] : '2.5M'
            ];
        }
    }

    $response['success'] = true;
    $response['data'] = [
        'user' => [
            'id' => (int)($user_info['id'] ?? $user_id),
            'mobile' => $user_info['mobile'] ?? '',
            'email' => $user_info['email'] ?? '',
            'full_name' => $user_info['full_name'] ?? 'Authorized Trader',
            'is_kyc_verified' => (int)($user_info['is_kyc_verified'] ?? 0),
            'kyc_status' => $user_info['kyc_status'] ?? 'Pending',
            'kyc_requested' => (int)($user_info['kyc_requested'] ?? 0),
            'status' => 'Active'
        ],
        'portfolio' => [
            'total_portfolio_value' => $total_portfolio_value,
            'total_value' => $total_portfolio_value,
            'invested_amount' => $invested_amount,
            'available_margin' => $available_margin,
            'day_pnl' => $day_pnl,
            'day_pnl_percent' => $day_pnl_percent,
            'holdings_count' => $holdings_count
        ],
        'market_indices' => $market_indices,
        'top_gainers' => $top_gainers,
        'stocks' => $all_stocks
    ];
    $response['message'] = "Dashboard data fetched successfully.";

} catch (Throwable $e) {
    $response['message'] = "Error fetching dashboard data: " . $e->getMessage();
}

echo json_encode($response);
?>
