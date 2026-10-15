<?php
// backend/api/admin_funds_ledger.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/email_service.php';

$response = [
    'success' => false,
    'message' => ''
];

try {
    // Read input (support JSON and POST)
    $input = $_POST;
    $raw = file_get_contents('php://input');
    if (!empty($raw)) {
        $json = json_decode($raw, true);
        if (is_array($json)) {
            $input = array_merge($input, $json);
        }
    }

    $action = isset($input['action']) ? trim($input['action']) : '';

    // ----------------------------------------------------
    // ACTION 1: ADD / CREDIT / DEBIT USER FUNDS
    // ----------------------------------------------------
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'admin_add_funds') {
        $target_user_id = isset($input['user_id']) ? (int)$input['user_id'] : 0;
        $amount = isset($input['amount']) ? (float)$input['amount'] : 0.00;
        $type = isset($input['type']) ? mysqli_real_escape_string($conn, trim($input['type'])) : 'Deposit'; // 'Deposit' or 'Withdrawal'
        $payment_method = isset($input['payment_method']) ? mysqli_real_escape_string($conn, trim($input['payment_method'])) : 'UPI / Admin Credit';
        $utr_no = !empty($input['utr_no']) ? mysqli_real_escape_string($conn, trim($input['utr_no'])) : ('UTR' . date('Ymd') . rand(100000, 999999));

        if ($target_user_id <= 0 || $amount <= 0) {
            $response['message'] = "Please select a valid user and enter an amount greater than 0.";
            echo json_encode($response);
            exit;
        }

        mysqli_begin_transaction($conn);
        try {
            // Check or initialize wallet
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

            // Send Transaction Slip Email
            $u_res = mysqli_query($conn, "SELECT u.id, u.email, u.mobile, k.full_name FROM users u LEFT JOIN kyc_details k ON u.id = k.user_id WHERE u.id = $target_user_id");
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

            $response['success'] = true;
            $response['message'] = "Funds successfully " . ($type === 'Deposit' ? 'credited' : 'debited') . "! New Balance: ₹" . number_format($new_bal, 2);
            $response['new_balance'] = $new_bal;
            echo json_encode($response);
            exit;
        } catch (Exception $e) {
            mysqli_rollback($conn);
            $response['message'] = "Transaction Failed: " . $e->getMessage();
            echo json_encode($response);
            exit;
        }
    }

    // ----------------------------------------------------
    // ACTION 2: SEND STATEMENT EMAIL TO USER
    // ----------------------------------------------------
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'admin_send_statement') {
        $target_user_id = isset($input['user_id']) ? (int)$input['user_id'] : 0;
        if ($target_user_id <= 0) {
            $response['message'] = "Valid user ID is required.";
            echo json_encode($response);
            exit;
        }

        $u_query = mysqli_query($conn, "SELECT u.id, u.email, u.mobile, k.full_name, k.pan_number, k.account_no, k.ifsc_code 
                                         FROM users u 
                                         LEFT JOIN kyc_details k ON u.id = k.user_id 
                                         WHERE u.id = $target_user_id");
        $u_row = mysqli_fetch_assoc($u_query);
        $toEmail = !empty($u_row['email']) ? $u_row['email'] : 'bikramnahak9714@gmail.com';

        // Fetch wallet
        $w_query = mysqli_query($conn, "SELECT available_balance, total_invested FROM wallets WHERE user_id = $target_user_id");
        $walletData = mysqli_fetch_assoc($w_query) ?: ['available_balance' => 0.00, 'total_invested' => 0.00];

        // Fetch transactions
        $tx_query = mysqli_query($conn, "SELECT * FROM transactions WHERE user_id = $target_user_id ORDER BY created_at DESC LIMIT 20");
        $txList = [];
        while ($t = mysqli_fetch_assoc($tx_query)) {
            $txList[] = $t;
        }

        $sent = EmailService::sendBankStatementEmail($toEmail, $u_row ?: ['id' => $target_user_id], $txList, $walletData);
        if ($sent && !empty($sent['success'])) {
            $pdfFilename = $sent['pdf_filename'] ?? 'Bank_Statement.pdf';
            $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
            $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
            $pdfUrl = "{$scheme}://{$host}/INFINITY_GLOBAL_CAPITAL/backend/statements/{$pdfFilename}";

            $response['success'] = true;
            $response['message'] = "Certified Bank Passbook Statement (PDF attached: {$pdfFilename}) emailed successfully to " . $toEmail;
            $response['pdf_attached'] = true;
            $response['pdf_filename'] = $pdfFilename;
            $response['pdf_url'] = $pdfUrl;
            $response['mail_result'] = $sent;
        } else {
            $response['message'] = "Failed to dispatch email. Please verify SMTP settings.";
        }
        echo json_encode($response);
        exit;
    }

    // ----------------------------------------------------
    // DEFAULT GET: FETCH PASSBOOK LEDGER & USERS LIST
    // ----------------------------------------------------
    // 1. Transactions
    $query = "SELECT t.*, u.mobile, u.email, k.full_name 
              FROM transactions t 
              LEFT JOIN users u ON t.user_id = u.id 
              LEFT JOIN kyc_details k ON t.user_id = k.user_id 
              ORDER BY t.created_at DESC, t.id DESC";
    $result = mysqli_query($conn, $query);

    $transactions = [];
    if ($result) {
        while ($row = mysqli_fetch_assoc($result)) {
            $txn_date = !empty($row['created_at']) && $row['created_at'] !== '0000-00-00 00:00:00' 
                ? date('d M Y, h:i A', strtotime($row['created_at'])) 
                : date('d M Y, h:i A');
            $utr_ref = !empty($row['txn_id']) ? $row['txn_id'] : ('UTR' . date('Ymd') . str_pad($row['id'], 6, '0', STR_PAD_LEFT));

            $transactions[] = [
                'id' => (int)$row['id'],
                'user_id' => (int)$row['user_id'],
                'uid_formatted' => '#UID-' . str_pad($row['user_id'], 4, '0', STR_PAD_LEFT),
                'user_name' => !empty($row['full_name']) ? $row['full_name'] : (!empty($row['mobile']) ? $row['mobile'] : 'Investor #' . $row['user_id']),
                'mobile' => $row['mobile'] ?? 'N/A',
                'email' => $row['email'] ?? '',
                'amount' => (float)$row['amount'],
                'type' => $row['type'],
                'is_credit' => ($row['type'] === 'Deposit'),
                'payment_method' => !empty($row['payment_method']) ? $row['payment_method'] : 'UPI / NetBanking',
                'status' => $row['status'] ?? 'Completed',
                'txn_id' => $utr_ref,
                'created_at' => $row['created_at'],
                'date_formatted' => $txn_date
            ];
        }
    }

    // 2. Summary stats
    $deposit_sum = mysqli_query($conn, "SELECT SUM(amount) as total FROM transactions WHERE type='Deposit'");
    $dep_row = mysqli_fetch_assoc($deposit_sum);
    $total_deposits = (float)($dep_row['total'] ?? 0);

    $withdraw_sum = mysqli_query($conn, "SELECT SUM(amount) as total FROM transactions WHERE type='Withdrawal'");
    $wit_row = mysqli_fetch_assoc($withdraw_sum);
    $total_withdrawals = (float)($wit_row['total'] ?? 0);

    // 3. Users list for dropdown
    $users_list = [];
    $u_res = mysqli_query($conn, "SELECT u.id, u.mobile, u.email, k.full_name FROM users u LEFT JOIN kyc_details k ON u.id = k.user_id ORDER BY u.id ASC");
    if ($u_res) {
        while ($u = mysqli_fetch_assoc($u_res)) {
            $users_list[] = [
                'id' => (int)$u['id'],
                'uid_formatted' => '#UID-' . str_pad($u['id'], 4, '0', STR_PAD_LEFT),
                'full_name' => !empty($u['full_name']) ? $u['full_name'] : 'User #' . $u['id'],
                'mobile' => $u['mobile'],
                'email' => $u['email'] ?? ''
            ];
        }
    }

    $response['success'] = true;
    $response['data'] = [
        'transactions' => $transactions,
        'summary' => [
            'total_deposits' => $total_deposits,
            'total_withdrawals' => $total_withdrawals,
            'total_transactions' => count($transactions)
        ],
        'users_list' => $users_list
    ];
    $response['message'] = "Funds ledger data fetched successfully.";
} catch (Exception $e) {
    $response['message'] = "Error: " . $e->getMessage();
}

echo json_encode($response);
?>
