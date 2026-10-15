<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/email_service.php';

// Check auth
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: index.php");
    exit;
}

$msg = '';
$err = '';

// Handle Admin Add / Credit Funds Form Submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'admin_add_funds') {
    $target_user_id = (int)$_POST['user_id'];
    $amount = (float)$_POST['amount'];
    $type = mysqli_real_escape_string($conn, $_POST['type']); // 'Deposit' or 'Withdrawal'
    $payment_method = mysqli_real_escape_string($conn, $_POST['payment_method'] ?? 'UPI / Admin Credit');
    $utr_no = !empty($_POST['utr_no']) ? mysqli_real_escape_string($conn, $_POST['utr_no']) : ('UTR' . date('Ymd') . rand(100000, 999999));

    if ($target_user_id > 0 && $amount > 0) {
        mysqli_begin_transaction($conn);
        try {
            // Check wallet
            $w_check = mysqli_query($conn, "SELECT available_balance FROM wallets WHERE user_id = $target_user_id FOR UPDATE");
            if (mysqli_num_rows($w_check) == 0) {
                mysqli_query($conn, "INSERT INTO wallets (user_id, available_balance, total_invested) VALUES ($target_user_id, 0, 0)");
                $curr_bal = 0.00;
            } else {
                $w_row = mysqli_fetch_assoc($w_check);
                $curr_bal = (float)$w_row['available_balance'];
            }

            if ($type === 'Withdrawal' && $amount > $curr_bal) {
                throw new Exception("Withdrawal amount cannot exceed user's available margin (₹" . number_format($curr_bal, 2) . ")");
            }

            $new_bal = ($type === 'Deposit') ? ($curr_bal + $amount) : ($curr_bal - $amount);
            mysqli_query($conn, "UPDATE wallets SET available_balance = $new_bal WHERE user_id = $target_user_id");

            // Insert transaction
            $ins_sql = "INSERT INTO transactions (user_id, amount, type, payment_method, status, txn_id, created_at) 
                        VALUES ($target_user_id, $amount, '$type', '$payment_method', 'Completed', '$utr_no', NOW())";
            if (!mysqli_query($conn, $ins_sql)) {
                mysqli_query($conn, "INSERT INTO transactions (user_id, amount, type, status) VALUES ($target_user_id, $amount, '$type', 'Completed')");
            }

            mysqli_commit($conn);

            // Send Transaction Slip Email to user
            $u_res = mysqli_query($conn, "SELECT u.id, u.email, u.mobile, k.full_name 
                                          FROM users u 
                                          LEFT JOIN kyc_details k ON u.id = k.user_id 
                                          WHERE u.id = $target_user_id");
            if ($u_res && $u_row = mysqli_fetch_assoc($u_res)) {
                $userEmail = !empty($u_row['email']) ? $u_row['email'] : null;
                if ($userEmail) {
                    EmailService::sendTransactionSlipEmail($userEmail, [
                        'type' => $type,
                        'amount' => $amount,
                        'txn_id' => $utr_no,
                        'payment_method' => $payment_method,
                        'new_balance' => $new_bal,
                        'created_at' => date('Y-m-d H:i:s'),
                        'user_name' => !empty($u_row['full_name']) ? $u_row['full_name'] : 'Valued Investor',
                        'user_id' => $target_user_id
                    ]);
                }
            }

            $msg = "Funds successfully " . ($type === 'Deposit' ? 'credited to' : 'debited from') . " user account! New balance: ₹" . number_format($new_bal, 2) . " (Transaction slip sent to email)";
        } catch (Exception $e) {
            mysqli_rollback($conn);
            $err = $e->getMessage();
        }
    } else {
        $err = "Please select a valid user and enter amount greater than 0.";
    }
}

// Handle Send Bank Statement Email to User
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'admin_send_statement') {
    $target_user_id = (int)$_POST['user_id'];
    if ($target_user_id > 0) {
        $u_query = mysqli_query($conn, "SELECT u.id, u.email, u.mobile, k.full_name, k.pan_number, k.account_no, k.ifsc_code 
                                         FROM users u 
                                         LEFT JOIN kyc_details k ON u.id = k.user_id 
                                         WHERE u.id = $target_user_id");
        $u_row = mysqli_fetch_assoc($u_query);
        
        $toEmail = !empty($u_row['email']) ? $u_row['email'] : 'bikramnahak9714@gmail.com';
        
        // Fetch user wallet
        $w_query = mysqli_query($conn, "SELECT available_balance, total_invested FROM wallets WHERE user_id = $target_user_id");
        $walletData = mysqli_fetch_assoc($w_query) ?: ['available_balance' => 0.00, 'total_invested' => 0.00];

        // Fetch user transactions
        $tx_query = mysqli_query($conn, "SELECT * FROM transactions WHERE user_id = $target_user_id ORDER BY created_at DESC LIMIT 20");
        $txList = [];
        while($t = mysqli_fetch_assoc($tx_query)) {
            $txList[] = $t;
        }

        $sent = EmailService::sendBankStatementEmail($toEmail, $u_row ?: ['id' => $target_user_id], $txList, $walletData);
        if ($sent && !empty($sent['success'])) {
            $pdfFilename = $sent['pdf_filename'] ?? 'Bank_Statement.pdf';
            $msg = "Official Passbook Bank Statement (PDF attached: {$pdfFilename}) successfully emailed to " . htmlspecialchars($toEmail) . " (User #UID-" . str_pad($target_user_id, 4, '0', STR_PAD_LEFT) . ")!";
        } else {
            $err = "Failed to dispatch statement email. Please verify SMTP settings.";
        }
    } else {
        $err = "Please select a valid user to send the statement.";
    }
}

// Fetch users for dropdown with KYC names
$users_list = mysqli_query($conn, "SELECT u.id, u.mobile, u.email, k.full_name 
                                    FROM users u 
                                    LEFT JOIN kyc_details k ON u.id = k.user_id 
                                    ORDER BY u.id ASC");

// Fetch transactions with dynamic user & KYC info
$query = "SELECT t.*, u.mobile, u.email, k.full_name 
          FROM transactions t 
          LEFT JOIN users u ON t.user_id = u.id 
          LEFT JOIN kyc_details k ON t.user_id = k.user_id 
          ORDER BY t.created_at DESC, t.id DESC";
$result = mysqli_query($conn, $query);

// Summary stats
$deposit_sum = mysqli_query($conn, "SELECT SUM(amount) as total FROM transactions WHERE type='Deposit'");
$dep_row = mysqli_fetch_assoc($deposit_sum);
$total_deposits = $dep_row['total'] ?? 0;

$withdraw_sum = mysqli_query($conn, "SELECT SUM(amount) as total FROM transactions WHERE type='Withdrawal'");
$wit_row = mysqli_fetch_assoc($withdraw_sum);
$total_withdrawals = $wit_row['total'] ?? 0;

$k_res = mysqli_query($conn, "SELECT COUNT(*) as count FROM kyc_details WHERE status = 'Pending'");
$pendingKyc = ($k_res && $row = mysqli_fetch_assoc($k_res)) ? (int)$row['count'] : 0;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Funds Ledger & Bank Statement - Infinity Global Capital</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
    <style>
        :root {
            --sidebar-bg: #090E1A;
            --accent-green: #10B981;
            --accent-red: #EF4444;
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
        
        .stat-widget { background: var(--card-bg); border-radius: 16px; padding: 1.5rem; border: 1px solid var(--border-color); }

        .btn-add-funds-glow {
            background: linear-gradient(135deg, #10B981, #059669);
            color: #FFFFFF;
            font-weight: 800;
            font-size: 14px;
            padding: 9px 20px;
            border-radius: 10px;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        /* Bank Passbook Table Styling */
        .table-bank {
            --bs-table-bg: transparent;
            --bs-table-border-color: rgba(255, 255, 255, 0.06);
            color: #FFFFFF;
        }
        .table-bank thead th {
            color: #94A3B8;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            background: rgba(15, 23, 42, 0.7);
            border-bottom: 1px solid var(--border-color);
            padding: 14px 16px;
        }
        .table-bank tbody td {
            padding: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .badge-cr {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(52, 211, 153, 0.35);
            color: #34D399;
            font-weight: 800;
            padding: 5px 10px;
            border-radius: 6px;
            font-size: 11px;
        }
        .badge-dr {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(248, 113, 113, 0.35);
            color: #F87171;
            font-weight: 800;
            padding: 5px 10px;
            border-radius: 6px;
            font-size: 11px;
        }
        .utr-pill {
            font-family: monospace;
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid #334155;
            padding: 4px 8px;
            border-radius: 6px;
            color: #38BDF8;
            font-size: 12px;
        }
        .channel-pill {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #E2E8F0;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
        }

        /* Modal Customization */
        .modal-content-dark {
            background: #0F172A;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            color: #FFFFFF;
        }
        .form-control-dark, .form-select-dark {
            background: #1E293B;
            border: 1px solid #334155;
            color: #FFFFFF;
            border-radius: 10px;
            padding: 11px 14px;
        }
        .form-control-dark:focus, .form-select-dark:focus {
            background: #1E293B;
            border-color: #38BDF8;
            color: #FFFFFF;
            box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
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
            <li><a href="funds_ledger.php" class="active"><i class="bi bi-wallet-fill"></i> Funds Ledger</a></li>
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
            <div class="d-flex align-items-center gap-2">
                <span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 fw-bold">
                    <i class="bi bi-bank me-1"></i> Bank Gateway: Active
                </span>
            </div>
            <div>
                <button type="button" class="btn-add-funds-glow" data-bs-toggle="modal" data-bs-target="#addFundsModal">
                    <i class="bi bi-plus-circle-fill"></i> Add / Credit User Funds
                </button>
            </div>
        </header>

        <main class="dashboard-body">
            
            <?php if($msg): ?>
                <div class="alert alert-success alert-dismissible fade show mb-4" style="background: rgba(16, 185, 129, 0.2); border-color: rgba(52, 211, 153, 0.4); color: #6EE7B7;">
                    <i class="bi bi-check-circle-fill me-2"></i> <?php echo $msg; ?>
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            <?php endif; ?>

            <?php if($err): ?>
                <div class="alert alert-danger alert-dismissible fade show mb-4" style="background: rgba(239, 68, 68, 0.2); border-color: rgba(248, 113, 113, 0.4); color: #FCA5A5;">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i> <?php echo $err; ?>
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            <?php endif; ?>

            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 class="h3 fw-bold mb-1 text-white">Funds Ledger & Bank Passbook</h1>
                    <p class="text-white mb-0 small">Official transaction settlement statement, UTR records, and ledger credits</p>
                </div>
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-outline-info btn-sm fw-bold px-3 py-2" data-bs-toggle="modal" data-bs-target="#emailStatementModal">
                        <i class="bi bi-envelope-paper-fill me-1"></i> Email Statement
                    </button>
                    <button type="button" class="btn btn-outline-success btn-sm fw-bold px-3 py-2" data-bs-toggle="modal" data-bs-target="#addFundsModal">
                        <i class="bi bi-plus-lg me-1"></i> New Transaction
                    </button>
                </div>
            </div>

            <div class="row g-4 mb-4">
                <div class="col-md-6">
                    <div class="stat-widget" style="border-top: 4px solid #10B981;">
                        <span class="text-white text-uppercase fw-bold small">Total Platform Deposits (Credits)</span>
                        <h2 class="text-success fw-bold mt-2">₹<?php echo number_format($total_deposits, 2); ?></h2>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="stat-widget" style="border-top: 4px solid #EF4444;">
                        <span class="text-white text-uppercase fw-bold small">Total Platform Withdrawals (Debits)</span>
                        <h2 class="text-danger fw-bold mt-2">₹<?php echo number_format($total_withdrawals, 2); ?></h2>
                    </div>
                </div>
            </div>
            
            <!-- Bank Statement Passbook Card -->
            <div class="card border-0 shadow-sm rounded-4" style="background: var(--card-bg); border: 1px solid var(--border-color)!important;">
                <div class="card-header py-3 px-4 d-flex justify-content-between align-items-center border-bottom text-white" style="background: transparent; border-color: var(--border-color)!important;">
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-journal-text text-info"></i>
                        <span class="fw-bold">Bank Statement / Transaction History</span>
                    </div>
                    <span class="badge bg-dark text-info border border-secondary px-3 py-1">Passbook View</span>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-bank table-hover align-middle mb-0">
                            <thead>
                                <tr>
                                    <th class="ps-4">Value Date & Time</th>
                                    <th>UTR / Reference No</th>
                                    <th>Account / User</th>
                                    <th>Channel / Mode</th>
                                    <th>Dr / Cr</th>
                                    <th class="text-end">Amount (INR)</th>
                                    <th>Status</th>
                                    <th class="text-end pe-4">Statement Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if($result && mysqli_num_rows($result) > 0): ?>
                                    <?php while($row = mysqli_fetch_assoc($result)): 
                                        $txn_date = !empty($row['created_at']) && $row['created_at'] !== '0000-00-00 00:00:00' 
                                             ? date('d M Y, h:i A', strtotime($row['created_at'])) 
                                             : date('d M Y, h:i A');
                                         
                                        $utr_ref = !empty($row['txn_id']) ? $row['txn_id'] : ('UTR' . date('Ymd') . str_pad($row['id'], 6, '0', STR_PAD_LEFT));
                                        $pay_mode = !empty($row['payment_method']) ? $row['payment_method'] : 'UPI / NetBanking';
                                        $is_credit = ($row['type'] === 'Deposit');
                                        $user_display = !empty($row['full_name']) ? htmlspecialchars($row['full_name']) : (!empty($row['mobile']) ? htmlspecialchars($row['mobile']) : 'Investor');
                                    ?>
                                        <tr>
                                            <td class="ps-4">
                                                <div class="fw-bold text-white"><?php echo $txn_date; ?></div>
                                                <small class="text-white">Settlement Date</small>
                                            </td>
                                            <td>
                                                <span class="utr-pill"><?php echo $utr_ref; ?></span>
                                            </td>
                                            <td>
                                                <div class="fw-bold text-white"><?php echo $user_display; ?></div>
                                                <small class="text-white">UID: #<?php echo str_pad($row['user_id'], 4, '0', STR_PAD_LEFT); ?> <?php if(!empty($row['mobile'])): ?>• <?php echo htmlspecialchars($row['mobile']); ?><?php endif; ?></small>
                                            </td>
                                            <td>
                                                <span class="channel-pill">
                                                    <i class="bi bi-wallet2 me-1 text-info"></i><?php echo $pay_mode; ?>
                                                </span>
                                            </td>
                                            <td>
                                                <?php if($is_credit): ?>
                                                    <span class="badge-cr"><i class="bi bi-arrow-down-left me-1"></i>CR</span>
                                                <?php else: ?>
                                                    <span class="badge-dr"><i class="bi bi-arrow-up-right me-1"></i>DR</span>
                                                <?php endif; ?>
                                            </td>
                                            <td class="text-end">
                                                <span class="fw-bold fs-6 <?php echo $is_credit ? 'text-success' : 'text-danger'; ?>">
                                                    <?php echo $is_credit ? '+' : '-'; ?>₹<?php echo number_format($row['amount'], 2); ?>
                                                </span>
                                            </td>
                                            <td>
                                                <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                                                    <i class="bi bi-check2-circle me-1"></i>Completed
                                                </span>
                                            </td>
                                            <td class="text-end pe-4">
                                                <form method="POST" action="" class="d-inline" onsubmit="return confirm('Email certified passbook statement to <?php echo addslashes($user_display); ?>?');">
                                                    <input type="hidden" name="action" value="admin_send_statement">
                                                    <input type="hidden" name="user_id" value="<?php echo $row['user_id']; ?>">
                                                    <button type="submit" class="btn btn-sm btn-outline-info fw-semibold py-1 px-2" title="Email Passbook Statement to User">
                                                        <i class="bi bi-envelope-at-fill me-1"></i> Email Passbook
                                                    </button>
                                                </form>
                                            </td>
                                        </tr>
                                    <?php endwhile; ?>
                                <?php else: ?>
                                    <tr><td colspan="8" class="text-center text-white py-5">No transactions recorded in passbook.</td></tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- ADD FUNDS MODAL -->
    <div class="modal fade" id="addFundsModal" tabindex="-1" aria-labelledby="addFundsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content modal-content-dark">
                <div class="modal-header border-bottom" style="border-color: var(--border-color)!important;">
                    <h5 class="modal-title fw-bold text-white" id="addFundsModalLabel">
                        <i class="bi bi-wallet2 text-success me-2"></i>Add / Credit Funds to User
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <form method="POST" action="">
                    <input type="hidden" name="action" value="admin_add_funds">
                    <div class="modal-body p-4">
                        
                        <div class="mb-3">
                            <label class="form-label text-white small fw-bold">SELECT USER</label>
                            <select name="user_id" class="form-select form-select-dark" required>
                                <option value="">-- Choose User Account --</option>
                                <?php 
                                mysqli_data_seek($users_list, 0);
                                while($u = mysqli_fetch_assoc($users_list)): 
                                ?>
                                    <option value="<?php echo $u['id']; ?>">
                                        #UID-<?php echo str_pad($u['id'], 4, '0', STR_PAD_LEFT); ?>: <?php echo !empty($u['full_name']) ? htmlspecialchars($u['full_name']) : 'User #'.$u['id']; ?> (<?php echo $u['mobile']; ?> - <?php echo $u['email'] ?? 'No Email'; ?>)
                                    </option>
                                <?php endwhile; ?>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label text-white small fw-bold">TRANSACTION TYPE</label>
                            <select name="type" class="form-select form-select-dark" required>
                                <option value="Deposit">Deposit / Credit (+ Add Margin)</option>
                                <option value="Withdrawal">Withdrawal / Debit (- Deduct Margin)</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label text-white small fw-bold">AMOUNT (₹)</label>
                            <div class="input-group">
                                <span class="input-group-text bg-dark border-secondary text-white">₹</span>
                                <input type="number" step="0.01" name="amount" class="form-control form-control-dark" placeholder="e.g. 50000" required>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label text-white small fw-bold">PAYMENT CHANNEL / MODE</label>
                            <select name="payment_method" class="form-select form-select-dark">
                                <option value="UPI / Instant Transfer">UPI / GPay / PhonePe</option>
                                <option value="IMPS Bank Transfer">IMPS Bank Transfer</option>
                                <option value="NEFT / RTGS">NEFT / RTGS</option>
                                <option value="Net Banking">Net Banking</option>
                                <option value="Cheque / DD Deposit">Cheque / DD Deposit</option>
                                <option value="Admin Special Credit">Admin Manual Adjustment</option>
                            </select>
                        </div>

                        <div class="mb-2">
                            <label class="form-label text-white small fw-bold">UTR / BANK REFERENCE (OPTIONAL)</label>
                            <input type="text" name="utr_no" class="form-control form-control-dark" placeholder="Auto-generated if left blank">
                        </div>

                    </div>
                    <div class="modal-footer border-top" style="border-color: var(--border-color)!important;">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-success fw-bold px-4">
                            <i class="bi bi-check-circle-fill me-1"></i> Submit Transaction
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- EMAIL STATEMENT MODAL -->
    <div class="modal fade" id="emailStatementModal" tabindex="-1" aria-labelledby="emailStatementModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content modal-content-dark">
                <div class="modal-header border-bottom" style="border-color: var(--border-color)!important;">
                    <h5 class="modal-title fw-bold text-white" id="emailStatementModalLabel">
                        <i class="bi bi-envelope-paper-fill text-info me-2"></i>Email Bank Statement to User
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <form method="POST" action="">
                    <input type="hidden" name="action" value="admin_send_statement">
                    <div class="modal-body p-4">
                        <div class="alert alert-info py-2 px-3 small border-0 mb-3" style="background: rgba(56, 189, 248, 0.12); color: #38BDF8;">
                            <i class="bi bi-info-circle-fill me-1"></i> Dispatches an institutional bank passbook summary with transaction ledgers and digital stamp via Gmail SMTP.
                        </div>

                        <div class="mb-3">
                            <label class="form-label text-white small fw-bold">SELECT INVESTOR ACCOUNT</label>
                            <select name="user_id" class="form-select form-select-dark" required>
                                <option value="">-- Choose User Account --</option>
                                <?php 
                                mysqli_data_seek($users_list, 0);
                                while($u = mysqli_fetch_assoc($users_list)): 
                                ?>
                                    <option value="<?php echo $u['id']; ?>">
                                        #UID-<?php echo str_pad($u['id'], 4, '0', STR_PAD_LEFT); ?>: <?php echo !empty($u['full_name']) ? htmlspecialchars($u['full_name']) : 'User #'.$u['id']; ?> (<?php echo $u['mobile']; ?> - <?php echo $u['email'] ?? 'No Email'; ?>)
                                    </option>
                                <?php endwhile; ?>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer border-top" style="border-color: var(--border-color)!important;">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-info text-white fw-bold px-4">
                            <i class="bi bi-send-fill me-1"></i> Dispatch Statement Now
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Bootstrap JS for modal functionality -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Auto open modal if URL has ?action=add
        const urlParams = new URLSearchParams(window.location.search);
        if(urlParams.get('action') === 'add') {
            const addModal = new bootstrap.Modal(document.getElementById('addFundsModal'));
            addModal.show();
        }
    </script>
</body>
</html>
