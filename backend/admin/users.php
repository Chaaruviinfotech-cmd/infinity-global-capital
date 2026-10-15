<?php
require_once __DIR__ . '/../config/db.php';

// Check auth
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: index.php");
    exit;
}

// Fetch users with their KYC details
$query = "SELECT u.id AS user_id, u.mobile, u.email, u.created_at, k.full_name, k.pan_number, k.status as kyc_status, k.id as kyc_id 
          FROM users u 
          LEFT JOIN kyc_details k ON u.id = k.user_id 
          ORDER BY u.id ASC";
$result = mysqli_query($conn, $query);

$k_res = mysqli_query($conn, "SELECT COUNT(*) as count FROM kyc_details WHERE status = 'Pending'");
$pendingKyc = ($k_res && $row = mysqli_fetch_assoc($k_res)) ? (int)$row['count'] : 0;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Users & KYC - Infinity Global Capital</title>
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

    <!-- Sidebar -->
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
            <li><a href="orders.php"><i class="bi bi-arrow-left-right"></i> Orders</a></li>
            <li><a href="funds_ledger.php"><i class="bi bi-wallet-fill"></i> Funds Ledger</a></li>
            <li>
                <a href="users.php" class="active">
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
        <main class="dashboard-body">
            <h1 class="h3 fw-bold mb-4 text-white">Manage User KYC & Verification</h1>
            
            <?php
            if(isset($_SESSION['msg'])){
                echo "<div class='alert alert-success alert-dismissible fade show' style='background: rgba(16, 185, 129, 0.2); border-color: rgba(52, 211, 153, 0.4); color: #6EE7B7;'>".$_SESSION['msg']."<button type='button' class='btn-close' data-bs-dismiss='alert'></button></div>";
                unset($_SESSION['msg']);
            }
            ?>

            <div class="card border-0 shadow-sm rounded-4" style="background: var(--card-bg); border: 1px solid var(--border-color)!important;">
                <div class="card-body p-0">
                    <table class="table table-dark-custom table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th class="ps-4">User ID</th>
                                <th>Mobile & Email</th>
                                <th>Full Name (KYC)</th>
                                <th>PAN Number</th>
                                <th>KYC Status</th>
                                <th class="text-end pe-4">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if(mysqli_num_rows($result) > 0): ?>
                                <?php while($row = mysqli_fetch_assoc($result)): ?>
                                    <tr>
                                        <td class="ps-4">
                                            <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38BDF8; border: 1px solid rgba(56, 189, 248, 0.35); font-family: monospace; font-size: 13px; font-weight: 700; padding: 6px 12px; border-radius: 8px;">
                                                #UID-<?php echo str_pad($row['user_id'], 4, '0', STR_PAD_LEFT); ?>
                                            </span>
                                        </td>
                                        <td class="fw-bold text-white">
                                            <div><?php echo $row['mobile']; ?></div>
                                            <?php if(!empty($row['email'])): ?><small class="text-white fw-normal" style="font-size: 11px;"><?php echo $row['email']; ?></small><?php endif; ?>
                                        </td>
                                        <td><?php echo $row['full_name'] ? '<span class="text-light fw-semibold">'.$row['full_name'].'</span>' : '<span class="text-white fst-italic">Not Submitted</span>'; ?></td>
                                        <td><code><?php echo $row['pan_number'] ? $row['pan_number'] : '-'; ?></code></td>
                                        <td>
                                            <?php 
                                                if($row['kyc_status'] == 'Pending') echo '<span class="badge bg-warning text-dark px-2 py-1">Pending</span>';
                                                elseif($row['kyc_status'] == 'Approved') echo '<span class="badge bg-success px-2 py-1">Approved</span>';
                                                elseif($row['kyc_status'] == 'Rejected') echo '<span class="badge bg-danger px-2 py-1">Rejected</span>';
                                                else echo '<span class="badge bg-secondary px-2 py-1">No Data</span>';
                                            ?>
                                        </td>
                                        <td class="text-end pe-4">
                                            <?php if($row['kyc_status'] == 'Pending'): ?>
                                                <a href="approve_kyc.php?id=<?php echo $row['kyc_id']; ?>&user_id=<?php echo $row['user_id']; ?>&action=approve" class="btn btn-sm btn-success px-3">Approve</a>
                                                <a href="approve_kyc.php?id=<?php echo $row['kyc_id']; ?>&user_id=<?php echo $row['user_id']; ?>&action=reject" class="btn btn-sm btn-danger px-3">Reject</a>
                                            <?php else: ?>
                                                <button class="btn btn-sm btn-outline-secondary" disabled>Verified</button>
                                            <?php endif; ?>
                                        </td>
                                    </tr>
                                <?php endwhile; ?>
                            <?php else: ?>
                                <tr><td colspan="6" class="text-center py-4 text-white">No users found.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    </div>
</body>
</html>
