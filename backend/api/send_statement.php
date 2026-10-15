<?php
// api/send_statement.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/email_service.php';

$user_id = isset($_REQUEST['user_id']) ? (int)$_REQUEST['user_id'] : 1;
$custom_email = isset($_REQUEST['email']) ? mysqli_real_escape_string($conn, trim($_REQUEST['email'])) : '';

if ($user_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'Valid User ID is required']);
    exit;
}

try {
    // 1. Fetch User and KYC details
    $u_query = "SELECT u.id, u.mobile, u.email, k.full_name, k.pan_number, k.account_no, k.ifsc_code, k.status AS kyc_status 
                FROM users u 
                LEFT JOIN kyc_details k ON u.id = k.user_id 
                WHERE u.id = $user_id";
    $u_res = mysqli_query($conn, $u_query);

    if (!$u_res || mysqli_num_rows($u_res) == 0) {
        echo json_encode(['success' => false, 'message' => 'User not found in system']);
        exit;
    }

    $userData = mysqli_fetch_assoc($u_res);
    $targetEmail = !empty($custom_email) ? $custom_email : (!empty($userData['email']) ? $userData['email'] : 'bikramnahak9714@gmail.com');

    // 2. Fetch Wallet
    $w_res = mysqli_query($conn, "SELECT available_balance, total_invested FROM wallets WHERE user_id = $user_id");
    $walletData = ['available_balance' => 0.00, 'total_invested' => 0.00];
    if ($w_res && $w_row = mysqli_fetch_assoc($w_res)) {
        $walletData = $w_row;
    }

    // 3. Fetch Transactions
    $tx_res = mysqli_query($conn, "SELECT * FROM transactions WHERE user_id = $user_id ORDER BY created_at DESC, id DESC LIMIT 50");
    $transactions = [];
    if ($tx_res) {
        while ($t = mysqli_fetch_assoc($tx_res)) {
            $transactions[] = $t;
        }
    }

    // 4. Dispatch Statement Email with PDF Attachment
    $mailResult = EmailService::sendBankStatementEmail($targetEmail, $userData, $transactions, $walletData);

    $pdfFilename = $mailResult['pdf_filename'] ?? ('Bank_Statement_STMT-' . date('Ymd') . '-' . str_pad($user_id, 4, '0', STR_PAD_LEFT) . '.pdf');
    $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $pdfUrl = "{$scheme}://{$host}/INFINITY_GLOBAL_CAPITAL/backend/statements/{$pdfFilename}";

    echo json_encode([
        'success' => true,
        'message' => "Certified Bank Statement & Passbook PDF emailed to " . htmlspecialchars($targetEmail),
        'email' => $targetEmail,
        'user_id' => $user_id,
        'transactions_count' => count($transactions),
        'pdf_attached' => true,
        'pdf_filename' => $pdfFilename,
        'pdf_url' => $pdfUrl,
        'stmt_ref' => $mailResult['stmt_ref'] ?? null,
        'mail_result' => $mailResult
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Failed to generate statement: ' . $e->getMessage()]);
}
?>
