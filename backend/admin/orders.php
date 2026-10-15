<?php
require_once __DIR__ . '/../config/db.php';

// Check auth
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: index.php");
    exit;
}

$k_res = mysqli_query($conn, "SELECT COUNT(*) as count FROM kyc_details WHERE status = 'Pending'");
$pendingKyc = ($k_res && $row = mysqli_fetch_assoc($k_res)) ? (int)$row['count'] : 0;

$orders_query = "SELECT o.*, u.mobile, u.email, k.full_name 
                 FROM orders o 
                 LEFT JOIN users u ON o.user_id = u.id 
                 LEFT JOIN kyc_details k ON o.user_id = k.user_id 
                 ORDER BY o.created_at DESC, o.id DESC";
$orders = mysqli_query($conn, $orders_query);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orders - Infinity Global Capital</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
    <style>
        :root {
            --sidebar-bg: #090E1A;
            --accent-blue: #2563EB;
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
        .dashboard-body { padding: 2.5rem; max-width: 1300px; }

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

    <!-- 1. LEFT SIDEBAR -->
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
            <li><a href="portfolio.php"><i class="bi bi-pie-chart-fill"></i> Portfolio</a></li>
            <li><a href="orders.php" class="active"><i class="bi bi-arrow-left-right"></i> Orders</a></li>
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

    <!-- 2. MAIN CONTENT -->
    <div class="main-wrapper">
        <main class="dashboard-body">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 class="h3 fw-bold mb-1 text-white">Order Management System (OMS)</h1>
                    <p class="text-white mb-0 small">Live exchange trade execution audits and order matching book</p>
                </div>
            </div>

            <div class="card border-0 shadow-sm rounded-4" style="background: var(--card-bg); border: 1px solid var(--border-color)!important;">
                <div class="card-header py-3 px-4 d-flex justify-content-between align-items-center border-bottom text-white" style="background: transparent; border-color: var(--border-color)!important;">
                    <span class="fw-bold">Trade Orders Book</span>
                    <span class="badge bg-success-subtle text-success border border-success-subtle">Engine Active</span>
                </div>
                <div class="card-body p-0">
                    <table class="table table-dark-custom table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th class="ps-4">Order ID</th>
                                <th>Stock</th>
                                <th>Side</th>
                                <th>Qty</th>
                                <th>Execution Price</th>
                                <th>Status</th>
                                <th>Account / Investor</th>
                                <th class="text-end pe-4">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if($orders && mysqli_num_rows($orders) > 0): ?>
                                <?php while($o = mysqli_fetch_assoc($orders)): ?>
                                    <tr>
                                        <td class="ps-4"><code class="text-info">#ORD-<?php echo $o['id']; ?></code></td>
                                        <td class="fw-bold text-white"><?php echo $o['stock_symbol']; ?></td>
                                        <td>
                                            <span class="badge <?php echo $o['order_type'] == 'BUY' ? 'bg-success' : 'bg-danger'; ?> px-2 py-1">
                                                <?php echo $o['order_type']; ?>
                                            </span>
                                        </td>
                                        <td class="fw-bold text-white"><?php echo $o['quantity']; ?></td>
                                        <td class="fw-bold text-white">₹<?php echo number_format($o['price'], 2); ?></td>
                                        <td>
                                            <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                                                <?php echo $o['status']; ?>
                                            </span>
                                        </td>
                                        <?php 
                                            $user_name = !empty($o['full_name']) ? htmlspecialchars($o['full_name']) : (!empty($o['mobile']) ? htmlspecialchars($o['mobile']) : 'Investor');
                                            $mobile_val = !empty($o['mobile']) ? htmlspecialchars($o['mobile']) : 'N/A';
                                            $time_val = (!empty($o['created_at']) && $o['created_at'] !== '0000-00-00 00:00:00') 
                                                ? date('d M Y, h:i A', strtotime($o['created_at'])) 
                                                : date('d M Y, h:i A');
                                        ?>
                                        <td class="text-light fw-medium">
                                            <div class="fw-bold text-white"><?php echo $user_name; ?></div>
                                            <small class="text-white">UID: #<?php echo str_pad($o['user_id'], 4, '0', STR_PAD_LEFT); ?> • <i class="bi bi-phone small text-info"></i> <?php echo $mobile_val; ?></small>
                                        </td>
                                        <td class="text-end pe-4 text-light fw-medium small">
                                            <i class="bi bi-clock me-1 text-info small"></i><?php echo $time_val; ?>
                                        </td>
                                    </tr>
                                <?php endwhile; ?>
                            <?php else: ?>
                                <tr><td colspan="8" class="text-center py-4 text-white">No orders found.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    </div>
</body>
</html>
