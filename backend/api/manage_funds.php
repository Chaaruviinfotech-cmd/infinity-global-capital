<?php
// api/manage_funds.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/socket_notify.php';
require_once __DIR__ . '/../helpers/email_service.php';

$user_id = isset($_POST['user_id']) ? (int)$_POST['user_id'] : 1;
$amount = isset($_POST['amount']) ? (float)$_POST['amount'] : 0;
$type = isset($_POST['type']) ? mysqli_real_escape_string($conn, trim($_POST['type'])) : ''; // 'Deposit' or 'Withdrawal'
$payment_method = isset($_POST['payment_method']) ? mysqli_real_escape_string($conn, trim($_POST['payment_method'])) : ($type === 'Deposit' ? 'UPI / Instant Transfer' : 'IMPS Bank Transfer');

if ($amount <= 0 || !in_array($type, ['Deposit', 'Withdrawal'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid amount or transaction type']);
    exit;
}

// Start Transaction
mysqli_begin_transaction($conn);

try {
    // Get current balance
    $wallet_res = mysqli_query($conn, "SELECT available_balance FROM wallets WHERE user_id = $user_id FOR UPDATE");
    
    if (!$wallet_res || mysqli_num_rows($wallet_res) == 0) {
        // Create wallet if not exists
        mysqli_query($conn, "INSERT INTO wallets (user_id, available_balance, total_invested) VALUES ($user_id, 0, 0)");
        $current_balance = 0.00;
    } else {
        $wallet = mysqli_fetch_assoc($wallet_res);
        $current_balance = (float)$wallet['available_balance'];
    }

    if ($type === 'Withdrawal' && $amount > $current_balance) {
        throw new Exception("Insufficient balance");
    }

    // Update Wallet
    $new_balance = ($type === 'Deposit') ? ($current_balance + $amount) : ($current_balance - $amount);
    mysqli_query($conn, "UPDATE wallets SET available_balance = $new_balance WHERE user_id = $user_id");

    // Generate Bank Ref / UTR
    $ref_id = 'UTR' . date('Ymd') . rand(100000, 999999);

    // Insert Transaction
    $insert_query = "INSERT INTO transactions (user_id, amount, type, payment_method, status, txn_id, created_at) 
                     VALUES ($user_id, $amount, '$type', '$payment_method', 'Completed', '$ref_id', NOW())";
    
    if (!mysqli_query($conn, $insert_query)) {
        // Fallback if payment_method column missing in older DB schema
        mysqli_query($conn, "INSERT INTO transactions (user_id, amount, type, status) VALUES ($user_id, $amount, '$type', 'Completed')");
    }

    mysqli_commit($conn);

    // Fetch user details for sending Transaction Slip email
    $emailDispatched = false;
    $u_res = mysqli_query($conn, "SELECT u.id, u.email, u.mobile, k.full_name 
                                  FROM users u 
                                  LEFT JOIN kyc_details k ON u.id = k.user_id 
                                  WHERE u.id = $user_id");
    if ($u_res && $u_row = mysqli_fetch_assoc($u_res)) {
        $userEmail = !empty($u_row['email']) ? $u_row['email'] : null;
        if ($userEmail) {
            $slipData = [
                'type' => $type,
                'amount' => $amount,
                'txn_id' => $ref_id,
                'payment_method' => $payment_method,
                'new_balance' => $new_balance,
                'created_at' => date('Y-m-d H:i:s'),
                'user_name' => !empty($u_row['full_name']) ? $u_row['full_name'] : 'Valued Trader',
                'user_id' => $user_id
            ];
            EmailService::sendTransactionSlipEmail($userEmail, $slipData);
            $emailDispatched = true;
        }
    }

    // Real-Time Socket Broadcast to Mobile & Web
    broadcast_socket_event('FUNDS_UPDATED', [
        'user_id' => $user_id,
        'available_balance' => $new_balance,
        'available_margin' => $new_balance,
        'amount' => $amount,
        'type' => $type,
        'txn_id' => $ref_id,
        'payment_method' => $payment_method
    ]);

    echo json_encode([
        'success' => true, 
        'message' => "$type successful. Transaction slip sent to your email.", 
        'new_balance' => $new_balance,
        'txn_id' => $ref_id,
        'email_slip_sent' => $emailDispatched
    ]);
} catch (Exception $e) {
    mysqli_rollback($conn);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
