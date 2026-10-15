<?php
require_once __DIR__ . '/../config/db.php';

// Check auth
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: index.php");
    exit;
}

// Stats
$u_res = mysqli_query($conn, "SELECT COUNT(*) as count FROM users");
$totalUsers = ($u_res && $row = mysqli_fetch_assoc($u_res)) ? (int)$row['count'] : 0;

$k_res = mysqli_query($conn, "SELECT COUNT(*) as count FROM kyc_details WHERE status = 'Pending'");
$pendingKyc = ($k_res && $row = mysqli_fetch_assoc($k_res)) ? (int)$row['count'] : 0;

$avail_funds = 0.00;
$total_invested = 0.00;
$day_pnl = 0.00;
$day_pnl_pct = 0.00;
$total_portfolio_value = 0.00;

$w_res = mysqli_query($conn, "SELECT SUM(available_balance) as avail, SUM(total_invested) as inv FROM wallets");
if($w_res && $w_row = mysqli_fetch_assoc($w_res)) {
    if(!empty($w_row['avail'])) $avail_funds = (float)$w_row['avail'];
    if(!empty($w_row['inv'])) $total_invested = (float)$w_row['inv'];
}

$h_res = mysqli_query($conn, "SELECT COUNT(*) as cnt FROM holdings");
$holdings_count = 0;
if ($h_res && $h_row = mysqli_fetch_assoc($h_res)) {
    $holdings_count = (int)$h_row['cnt'];
}

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
if ($total_portfolio_value > 0) {
    $day_pnl_pct = round(($day_pnl / $total_portfolio_value) * 100, 2);
}

$stocks_res = mysqli_query($conn, "SELECT * FROM watchlist_stocks ORDER BY day_change_percent DESC LIMIT 4");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Infinity Global Capital</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
    <style>
        :root {
            --sidebar-bg: #090E1A;
            --accent-blue: #2563EB;
            --accent-green: #10B981;
            --accent-purple: #8B5CF6;
            --accent-amber: #F59E0B;
            --body-bg: #090E1A;
            --card-bg: #1E293B;
            --border-color: rgba(255, 255, 255, 0.08);
        }
        body {
            background-color: var(--body-bg);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #FFFFFF;
            margin: 0;
            display: flex;
            min-height: 100vh;
        }

        /* ----------------- SIDEBAR ----------------- */
        .sidebar {
            width: 270px;
            background: linear-gradient(180deg, #060A14 0%, #0B132B 100%);
            color: #F8FAFC;
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            z-index: 100;
            border-right: 1px solid var(--border-color);
            padding: 1.5rem 1.25rem;
        }
        .brand-logo {
            font-size: 20px;
            font-weight: 800;
            color: #FFFFFF;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 2rem;
            padding-left: 0.5rem;
        }
        .brand-logo span {
            color: #38BDF8;
            font-size: 28px;
            text-shadow: 0 0 16px rgba(56, 189, 248, 0.4);
        }
        .user-pill {
            background: rgba(255,255,255,0.04);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 10px 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 2rem;
        }
        .user-avatar {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            background: linear-gradient(135deg, #2563EB, #38BDF8);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            color: #FFFFFF;
            font-size: 14px;
        }
        .user-info-name {
            font-size: 13px;
            font-weight: 700;
            color: #FFFFFF;
            line-height: 1.2;
        }
        .user-info-role {
            font-size: 11px;
            color: #10B981;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .status-dot {
            width: 6px;
            height: 6px;
            background-color: #10B981;
            border-radius: 50%;
        }

        .sidebar-menu {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 6px;
            flex: 1;
        }
        .sidebar-menu a {
            text-decoration: none;
            color: #94A3B8;
            font-weight: 600;
            font-size: 14px;
            padding: 11px 14px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.2s ease;
        }
        .sidebar-menu a:hover {
            color: #FFFFFF;
            background: rgba(255,255,255,0.06);
            transform: translateX(3px);
        }
        .sidebar-menu a.active {
            color: #FFFFFF;
            background: linear-gradient(90deg, rgba(37, 99, 235, 0.9) 0%, rgba(56, 189, 248, 0.8) 100%);
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
        }
        .sidebar-menu i {
            font-size: 18px;
        }

        .sidebar-footer {
            padding-top: 1rem;
            border-top: 1px solid var(--border-color);
        }
        .logout-link {
            color: #F87171;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            font-weight: 600;
            padding: 10px 14px;
            border-radius: 8px;
            transition: all 0.2s;
        }
        .logout-link:hover {
            background: rgba(239, 68, 68, 0.12);
            color: #EF4444;
        }

        .text-muted {
            color: #FFFFFF !important;
        }

        /* ----------------- MAIN LAYOUT ----------------- */
        .main-wrapper {
            margin-left: 270px;
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            background-color: var(--body-bg);
        }
        .top-header {
            background: #0F172A;
            border-bottom: 1px solid var(--border-color);
            padding: 0.85rem 2.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 90;
        }
        .market-pill {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(52, 211, 153, 0.35);
            color: #6EE7B7;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .header-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .btn-add-funds {
            background: linear-gradient(135deg, #10B981, #059669);
            color: #FFFFFF;
            font-weight: 700;
            font-size: 13px;
            padding: 8px 18px;
            border-radius: 8px;
            text-decoration: none;
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }
        .btn-add-funds:hover {
            background: linear-gradient(135deg, #059669, #047857);
            color: #FFFFFF;
        }

        .dashboard-body {
            padding: 2.5rem;
            max-width: 1300px;
        }

        /* ----------------- COLORFUL CARDS ----------------- */
        .hero-banner {
            background: linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #1E3A8A 100%);
            border-radius: 20px;
            padding: 2.5rem;
            color: #FFFFFF;
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            margin-bottom: 2rem;
            border: 1px solid var(--border-color);
        }
        .hero-banner::after {
            content: '';
            position: absolute;
            top: -60px;
            right: -60px;
            width: 220px;
            height: 220px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(37, 99, 235, 0) 70%);
            pointer-events: none;
        }
        .hero-tag {
            font-size: 12px;
            text-transform: uppercase;
            font-weight: 800;
            letter-spacing: 0.8px;
            color: #93C5FD;
            margin-bottom: 8px;
        }
        .hero-val {
            font-size: 48px;
            font-weight: 900;
            letter-spacing: -1.5px;
            margin-bottom: 10px;
        }
        .hero-pnl {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(16, 185, 129, 0.2);
            border: 1px solid rgba(52, 211, 153, 0.4);
            color: #6EE7B7;
            font-weight: 800;
            font-size: 15px;
            padding: 6px 14px;
            border-radius: 30px;
            margin-bottom: 2rem;
        }

        .hero-footer {
            border-top: 1px solid rgba(255,255,255,0.12);
            padding-top: 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .hero-avail-title {
            font-size: 12px;
            color: #94A3B8;
            font-weight: 700;
            text-transform: uppercase;
        }
        .hero-avail-val {
            font-size: 26px;
            font-weight: 800;
            color: #FFFFFF;
        }
        .btn-manage {
            background: rgba(255,255,255,0.12);
            border: 1px solid rgba(255,255,255,0.25);
            color: #FFFFFF;
            font-weight: 700;
            font-size: 13px;
            padding: 8px 18px;
            border-radius: 8px;
            text-decoration: none;
            transition: all 0.2s;
        }
        .btn-manage:hover {
            background: #FFFFFF;
            color: #0F172A;
        }

        /* 4 Colorful Metric Widgets */
        .color-card {
            background: var(--card-bg);
            border-radius: 16px;
            padding: 1.5rem;
            border: 1px solid var(--border-color);
            position: relative;
            overflow: hidden;
            height: 100%;
            transition: transform 0.2s;
        }
        .color-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        }
        .card-blue { border-top: 4px solid var(--accent-blue); }
        .card-green { border-top: 4px solid var(--accent-green); }
        .card-purple { border-top: 4px solid var(--accent-purple); }
        .card-amber { border-top: 4px solid var(--accent-amber); }

        .color-card-icon {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            margin-bottom: 14px;
        }
        .icon-blue { background: rgba(37, 99, 235, 0.2); color: #38BDF8; }
        .icon-green { background: rgba(16, 185, 129, 0.2); color: #34D399; }
        .icon-purple { background: rgba(139, 92, 246, 0.2); color: #A78BFA; }
        .icon-amber { background: rgba(245, 158, 11, 0.2); color: #FBBF24; }

        .color-card-title {
            font-size: 11px;
            font-weight: 800;
            color: #94A3B8;
            text-transform: uppercase;
            letter-spacing: 0.6px;
        }
        .color-card-val {
            font-size: 24px;
            font-weight: 900;
            color: #FFFFFF;
            margin: 4px 0;
        }
        .color-card-sub {
            font-size: 13px;
            font-weight: 700;
        }

        /* Table Panels */
        .panel-box {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 1.75rem;
            margin-top: 2rem;
        }
        .panel-box-title {
            font-size: 18px;
            font-weight: 800;
            color: #FFFFFF;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.25rem;
        }
        .table-dark-custom {
            --bs-table-bg: transparent;
            --bs-table-border-color: rgba(255, 255, 255, 0.06);
            color: #FFFFFF;
        }
        .table-dark-custom thead th {
            color: #94A3B8;
            font-size: 12px;
            text-transform: uppercase;
            background: rgba(15, 23, 42, 0.5);
            border-bottom: 1px solid var(--border-color);
        }
    </style>
</head>
<body>

    <!-- 1. LEFT SIDEBAR -->
    <aside class="sidebar">
        <a href="dashboard.php" class="brand-logo">
            <span>∞</span> INFINITY <b>CAPITAL</b>
        </a>

        <div class="user-pill">
            <div class="user-avatar">HR</div>
            <div>
                <div class="user-info-name">HR Investor</div>
                <div class="user-info-role">
                    <span class="status-dot"></span> Premium Account
                </div>
            </div>
        </div>

        <ul class="sidebar-menu">
            <li><a href="dashboard.php" class="active"><i class="bi bi-grid-fill"></i> Overview</a></li>
            <li><a href="markets.php"><i class="bi bi-graph-up-arrow"></i> Markets</a></li>
            <li><a href="portfolio.php"><i class="bi bi-pie-chart-fill"></i> Portfolio</a></li>
            <li><a href="orders.php"><i class="bi bi-arrow-left-right"></i> Orders</a></li>
            <li><a href="funds_ledger.php"><i class="bi bi-wallet-fill"></i> Funds Ledger</a></li>
            <li>
                <a href="users.php">
                    <i class="bi bi-person-check-fill"></i> KYC & Profile
                    <?php if($pendingKyc > 0): ?>
                        <span class="badge bg-danger rounded-pill ms-auto"><?php echo $pendingKyc; ?></span>
                    <?php endif; ?>
                </a>
            </li>
        </ul>

        <div class="sidebar-footer">
            <a href="logout.php" class="logout-link">
                <i class="bi bi-box-arrow-left"></i> Sign Out
            </a>
        </div>
    </aside>

    <!-- 2. MAIN CONTENT WRAPPER -->
    <div class="main-wrapper">
        
        <!-- Header -->
        <header class="top-header">
            <div class="market-pill">
                <i class="bi bi-broadcast"></i> Markets Open: NSE · BSE · Global
            </div>

            <div class="header-actions">
                <a href="funds_ledger.php?action=add" class="btn-add-funds">
                    <i class="bi bi-plus-circle me-1"></i> Add Funds
                </a>
                <span class="badge bg-primary px-3 py-2 fw-bold">Admin Portal</span>
            </div>
        </header>

        <!-- Body -->
        <main class="dashboard-body">
            
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 class="h3 fw-bold mb-1 text-white">Portfolio Overview</h1>
                    <p class="text-white mb-0 small">Real-time investment monitoring and asset valuation</p>
                </div>
            </div>

            <!-- Colorful Hero Banner -->
            <div class="hero-banner">
                <div class="hero-tag">Total Portfolio Value</div>
                <div class="hero-val">₹ <?php echo number_format($total_portfolio_value, 0); ?></div>
                <div class="hero-pnl">
                    <i class="bi bi-arrow-up-right"></i> +₹<?php echo number_format($day_pnl, 0); ?> (+<?php echo $day_pnl_pct; ?>%) Today
                </div>

                <div class="hero-footer">
                    <div>
                        <div class="hero-avail-title">Available Cash Margin</div>
                        <div class="hero-avail-val">₹ <?php echo number_format($avail_funds, 0); ?></div>
                    </div>
                    <div>
                        <a href="funds_ledger.php" class="btn-manage">Manage Funds →</a>
                    </div>
                </div>
            </div>

            <!-- 4 Colorful Metric Cards -->
            <div class="row g-4">
                <div class="col-md-3 col-sm-6">
                    <div class="color-card card-blue">
                        <div class="color-card-icon icon-blue">
                            <i class="bi bi-cash-stack"></i>
                        </div>
                        <div class="color-card-title">Invested Amount</div>
                        <div class="color-card-val">₹<?php echo number_format($total_invested / 100000, 2); ?>L</div>
                        <div class="color-card-sub text-success">+8.42% Gain</div>
                    </div>
                </div>

                <div class="col-md-3 col-sm-6">
                    <div class="color-card card-green">
                        <div class="color-card-icon icon-green">
                            <i class="bi bi-lightning-charge-fill"></i>
                        </div>
                        <div class="color-card-title">Day P&L</div>
                        <div class="color-card-val"><?php echo $day_pnl >= 0 ? '+' : ''; ?>₹<?php echo number_format(abs($day_pnl) / 100000, 2); ?>L</div>
                        <div class="color-card-sub text-success"><?php echo ($day_pnl_pct >= 0 ? '+' : '') . $day_pnl_pct; ?>% Today</div>
                    </div>
                </div>

                <div class="col-md-3 col-sm-6">
                    <div class="color-card card-purple">
                        <div class="color-card-icon icon-purple">
                            <i class="bi bi-graph-up"></i>
                        </div>
                        <div class="color-card-title">1 Year Return</div>
                        <div class="color-card-val">+₹<?php echo number_format(($total_invested * 0.184) / 100000, 2); ?>L</div>
                        <div class="color-card-sub" style="color: #A78BFA;">+18.4% Annual</div>
                    </div>
                </div>

                <div class="col-md-3 col-sm-6">
                    <div class="color-card card-amber">
                        <div class="color-card-icon icon-amber">
                            <i class="bi bi-pie-chart"></i>
                        </div>
                        <div class="color-card-title">Active Holdings</div>
                        <div class="color-card-val"><?php echo $holdings_count; ?> Stocks</div>
                        <div class="color-card-sub text-white">Diversified Portfolio</div>
                    </div>
                </div>
            </div>

            <!-- Panels Grid -->
            <div class="row g-4 mt-1">
                <div class="col-md-7">
                    <div class="panel-box mt-0 h-100">
                        <div class="panel-box-title">
                            <span>Top Market Gainers</span>
                            <a href="markets.php" class="text-info text-decoration-none small fw-bold">View Markets →</a>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-dark-custom align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th>Stock</th>
                                        <th>Price</th>
                                        <th>Change</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php while($stk = mysqli_fetch_assoc($stocks_res)): ?>
                                        <tr>
                                            <td>
                                                <div class="fw-bold text-white"><?php echo $stk['symbol']; ?></div>
                                                <small class="text-white"><?php echo $stk['company_name']; ?></small>
                                            </td>
                                            <td class="fw-bold text-white">₹<?php echo number_format($stk['current_price'], 2); ?></td>
                                            <td>
                                                <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                                                    +<?php echo $stk['day_change_percent']; ?>%
                                                </span>
                                            </td>
                                        </tr>
                                    <?php endwhile; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="col-md-5">
                    <div class="panel-box mt-0 h-100">
                        <div class="panel-box-title">
                            <span>Admin Quick Controls</span>
                        </div>
                        <div class="d-flex flex-column gap-3">
                            <a href="users.php" class="d-flex justify-content-between align-items-center p-3 border rounded-3 text-decoration-none text-white hover-shadow" style="background: rgba(15, 23, 42, 0.5); border-color: var(--border-color)!important;">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="color-card-icon icon-purple mb-0" style="width:36px; height:36px;">
                                        <i class="bi bi-person-badge"></i>
                                    </div>
                                    <div>
                                        <div class="fw-bold">User KYC Verification</div>
                                        <small class="text-white">PAN & Bank approvals</small>
                                    </div>
                                </div>
                                <span class="badge <?php echo $pendingKyc > 0 ? 'bg-danger' : 'bg-secondary'; ?> rounded-pill">
                                    <?php echo $pendingKyc; ?> Pending
                                </span>
                            </a>

                            <a href="funds_ledger.php" class="d-flex justify-content-between align-items-center p-3 border rounded-3 text-decoration-none text-white hover-shadow" style="background: rgba(15, 23, 42, 0.5); border-color: var(--border-color)!important;">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="color-card-icon icon-green mb-0" style="width:36px; height:36px;">
                                        <i class="bi bi-wallet2"></i>
                                    </div>
                                    <div>
                                        <div class="fw-bold">Funds & Ledger</div>
                                        <small class="text-white">Deposits & Payouts</small>
                                    </div>
                                </div>
                                <i class="bi bi-chevron-right text-white"></i>
                            </a>

                            <a href="orders.php" class="d-flex justify-content-between align-items-center p-3 border rounded-3 text-decoration-none text-white hover-shadow" style="background: rgba(15, 23, 42, 0.5); border-color: var(--border-color)!important;">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="color-card-icon icon-blue mb-0" style="width:36px; height:36px;">
                                        <i class="bi bi-shield-check"></i>
                                    </div>
                                    <div>
                                        <div class="fw-bold">Order Management (OMS)</div>
                                        <small class="text-white">Exchange executions</small>
                                    </div>
                                </div>
                                <i class="bi bi-chevron-right text-white"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>

        </main>
    </div>

</body>
</html>
