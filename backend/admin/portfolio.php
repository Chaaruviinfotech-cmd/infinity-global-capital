<?php
require_once __DIR__ . '/../config/db.php';

// Check auth
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: index.php");
    exit;
}

$k_res = mysqli_query($conn, "SELECT COUNT(*) as count FROM kyc_details WHERE status = 'Pending'");
$pendingKyc = ($k_res && $row = mysqli_fetch_assoc($k_res)) ? (int)$row['count'] : 0;

// Fetch holdings
$holdings_query = "SELECT h.*, u.mobile FROM holdings h JOIN users u ON h.user_id = u.id ORDER BY h.created_at DESC";
$holdings = mysqli_query($conn, $holdings_query);

$total_inv = 0;
$total_cur = 0;
$holdings_list = [];

$live_prices = [];
$wp_q = mysqli_query($conn, "SELECT symbol, current_price FROM watchlist_stocks");
if ($wp_q) {
    while($wp = mysqli_fetch_assoc($wp_q)) {
        $live_prices[$wp['symbol']] = (float)$wp['current_price'];
    }
}

if($holdings) {
    while($row = mysqli_fetch_assoc($holdings)) {
        $inv = $row['quantity'] * $row['avg_price'];
        $curr_price = isset($live_prices[$row['stock_symbol']]) ? $live_prices[$row['stock_symbol']] : ($row['avg_price'] * 1.05);
        $cur_val = $row['quantity'] * $curr_price;
        $pnl = $cur_val - $inv;
        $pnl_pct = $inv > 0 ? ($pnl / $inv) * 100 : 0;

        $row['current_price'] = $curr_price;
        $row['invested_val'] = $inv;
        $row['current_val'] = $cur_val;
        $row['pnl'] = $pnl;
        $row['pnl_pct'] = $pnl_pct;

        $total_inv += $inv;
        $total_cur += $cur_val;

        $holdings_list[] = $row;
    }
}

$total_profit = $total_cur - $total_inv;
$total_profit_pct = $total_inv > 0 ? ($total_profit / $total_inv) * 100 : 0;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio - Infinity Global Capital</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
    <style>
        :root {
            --sidebar-bg: #090E1A;
            --accent-blue: #2563EB;
            --accent-green: #10B981;
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
        /* Sidebar */
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
            padding: 1.5rem 1.25rem;
            border-right: 1px solid var(--border-color);
        }
        .brand-logo { font-size: 20px; font-weight: 800; color: #FFFFFF; text-decoration: none; display: flex; align-items: center; gap: 8px; margin-bottom: 2rem; padding-left: 0.5rem; }
        .brand-logo span { color: #38BDF8; font-size: 28px; text-shadow: 0 0 16px rgba(56, 189, 248, 0.4); }
        .user-pill { background: rgba(255,255,255,0.04); border: 1px solid var(--border-color); border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; margin-bottom: 2rem; }
        .user-avatar { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #2563EB, #38BDF8); display: flex; align-items: center; justify-content: center; font-weight: 800; color: #FFFFFF; font-size: 14px; }
        .sidebar-menu { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .sidebar-menu a { text-decoration: none; color: #94A3B8; font-weight: 600; font-size: 14px; padding: 11px 14px; border-radius: 10px; display: flex; align-items: center; gap: 12px; transition: all 0.2s; }
        .sidebar-menu a:hover { color: #FFFFFF; background: rgba(255,255,255,0.06); transform: translateX(3px); }
        .sidebar-menu a.active { color: #FFFFFF; background: linear-gradient(90deg, rgba(37, 99, 235, 0.9) 0%, rgba(56, 189, 248, 0.8) 100%); box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35); }
        .sidebar-footer { padding-top: 1rem; border-top: 1px solid var(--border-color); }
        .logout-link { color: #F87171; text-decoration: none; display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; padding: 10px 14px; }

        /* Main */
        .main-wrapper { margin-left: 270px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; background-color: var(--body-bg); }
        .top-header { background: #0F172A; border-bottom: 1px solid var(--border-color); padding: 0.85rem 2.5rem; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 90; }
        .dashboard-body { padding: 2.5rem; max-width: 1300px; }

        .stat-box {
            background: var(--card-bg);
            border-radius: 16px;
            padding: 1.5rem;
            border: 1px solid var(--border-color);
        }
        .stat-box-title { font-size: 12px; font-weight: 800; color: #94A3B8; text-transform: uppercase; }
        .stat-box-val { font-size: 26px; font-weight: 900; color: #FFFFFF; margin-top: 6px; }

        .stock-avatar {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            background: rgba(30, 41, 59, 0.8);
            color: #38BDF8;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            border: 1px solid var(--border-color);
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
        .text-muted {
            color: #FFFFFF !important;
        }
    </style>
</head>
<body>

    <!-- SIDEBAR -->
    <aside class="sidebar">
        <a href="dashboard.php" class="brand-logo"><span>∞</span> INFINITY <b>CAPITAL</b></a>
        <div class="user-pill">
            <div class="user-avatar">HR</div>
            <div>
                <div class="fw-bold small text-white">HR Investor</div>
                <div style="font-size:11px; color:#10B981; font-weight:600;"><i class="bi bi-circle-fill me-1" style="font-size:7px;"></i> Premium Account</div>
            </div>
        </div>

        <ul class="sidebar-menu">
            <li><a href="dashboard.php"><i class="bi bi-grid-fill"></i> Overview</a></li>
            <li><a href="markets.php"><i class="bi bi-graph-up-arrow"></i> Markets</a></li>
            <li><a href="portfolio.php" class="active"><i class="bi bi-pie-chart-fill"></i> Portfolio</a></li>
            <li><a href="orders.php"><i class="bi bi-arrow-left-right"></i> Orders</a></li>
            <li><a href="funds_ledger.php"><i class="bi bi-wallet-fill"></i> Funds Ledger</a></li>
            <li>
                <a href="users.php">
                    <i class="bi bi-person-check-fill"></i> KYC & Profile
                    <?php if($pendingKyc > 0): ?><span class="badge bg-danger rounded-pill ms-auto"><?php echo $pendingKyc; ?></span><?php endif; ?>
                </a>
            </li>
        </ul>

        <div class="sidebar-footer">
            <a href="logout.php" class="logout-link"><i class="bi bi-box-arrow-left"></i> Sign Out</a>
        </div>
    </aside>

    <div class="main-wrapper">
        <header class="top-header">
            <div class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 fw-bold">
                <i class="bi bi-pie-chart me-1"></i> Live Holdings Valuation Active
            </div>
            <div>
                <a href="dashboard.php" class="btn btn-sm btn-outline-info">Return to Overview</a>
            </div>
        </header>

        <main class="dashboard-body">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 class="h3 fw-bold mb-1 text-white">Portfolio & Holdings</h1>
                    <p class="text-white mb-0 small">Real-time asset allocations and net profit & loss analysis</p>
                </div>
            </div>

            <!-- Colorful Summary Row -->
            <div class="row g-4 mb-4">
                <div class="col-md-4">
                    <div class="stat-box" style="border-top: 4px solid #2563EB;">
                        <div class="stat-box-title">Total Current Value</div>
                        <div class="stat-box-val">₹<?php echo number_format($total_cur, 2); ?></div>
                        <small class="text-white">Live Market Valuation</small>
                    </div>
                </div>

                <div class="col-md-4">
                    <div class="stat-box" style="border-top: 4px solid #64748B;">
                        <div class="stat-box-title">Total Invested</div>
                        <div class="stat-box-val">₹<?php echo number_format($total_inv, 2); ?></div>
                        <small class="text-white">Total Capital Deployed</small>
                    </div>
                </div>

                <div class="col-md-4">
                    <div class="stat-box" style="border-top: 4px solid #10B981;">
                        <div class="stat-box-title">Total Returns (P&L)</div>
                        <div class="stat-box-val text-success">
                            +₹<?php echo number_format($total_profit, 2); ?>
                        </div>
                        <small class="text-success fw-bold">
                            <i class="bi bi-caret-up-fill"></i> +<?php echo number_format($total_profit_pct, 2); ?>% Overall Gain
                        </small>
                    </div>
                </div>
            </div>

            <!-- Holdings Table Card -->
            <div class="card border-0 shadow-sm rounded-4" style="background: var(--card-bg); border: 1px solid var(--border-color)!important;">
                <div class="card-header py-3 px-4 d-flex justify-content-between align-items-center border-bottom" style="background: transparent; border-color: var(--border-color)!important;">
                    <span class="fw-bold text-white">Equity Holdings Breakdown</span>
                    <span class="badge bg-primary"><?php echo count($holdings_list); ?> Positions</span>
                </div>
                <div class="card-body p-0">
                    <table class="table table-dark-custom table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th class="ps-4">Stock</th>
                                <th>Shares</th>
                                <th>Avg. Buy</th>
                                <th>Market Price</th>
                                <th>Current Value</th>
                                <th class="text-end pe-4">Unrealized P&L</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach($holdings_list as $h): ?>
                                <tr>
                                    <td class="ps-4">
                                        <div class="d-flex align-items-center gap-3">
                                            <div class="stock-avatar">
                                                <?php echo substr($h['stock_symbol'], 0, 2); ?>
                                            </div>
                                            <div>
                                                <div class="fw-bold text-white"><?php echo $h['stock_symbol']; ?></div>
                                                <small class="text-white"><?php echo $h['company_name'] ?? $h['stock_symbol']; ?></small>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="badge bg-dark text-light border border-secondary px-2 py-1 fw-bold"><?php echo $h['quantity']; ?> Qty</span>
                                    </td>
                                    <td>₹<?php echo number_format($h['avg_price'], 2); ?></td>
                                    <td class="fw-bold text-white">₹<?php echo number_format($h['current_price'], 2); ?></td>
                                    <td class="fw-bold text-white">₹<?php echo number_format($h['current_val'], 2); ?></td>
                                    <td class="text-end pe-4">
                                        <div class="<?php echo $h['pnl'] >= 0 ? 'text-success' : 'text-danger'; ?> fw-bold">
                                            <?php echo ($h['pnl'] >= 0 ? '+' : '') . '₹' . number_format($h['pnl'], 2); ?>
                                        </div>
                                        <small class="<?php echo $h['pnl'] >= 0 ? 'text-success' : 'text-danger'; ?> fw-semibold">
                                            (<?php echo ($h['pnl'] >= 0 ? '+' : '') . number_format($h['pnl_pct'], 2); ?>%)
                                        </small>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    </div>
</body>
</html>
