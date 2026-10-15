<?php
// api/get_funds.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once __DIR__ . '/../config/db.php';

$user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 1; // Default to 1 for demo

$response = ['success' => false, 'data' => null, 'message' => ''];

try {
    // Check if user exists
    $u_res = @mysqli_query($conn, "SELECT id FROM users WHERE id = $user_id");
    if (!$u_res || mysqli_num_rows($u_res) == 0) {
        require_once __DIR__ . '/../config/socket_notify.php';
        broadcast_socket_event('FORCE_LOGOUT', ['user_id' => $user_id, 'reason' => 'user_deleted']);
        echo json_encode(['success' => false, 'is_deleted' => true, 'message' => 'User does not exist.']);
        exit;
    }

    // Get wallet
    $wallet_res = mysqli_query($conn, "SELECT available_balance FROM wallets WHERE user_id = $user_id");
    $balance = 0.00;
    if ($wallet_res && mysqli_num_rows($wallet_res) > 0) {
        $row = mysqli_fetch_assoc($wallet_res);
        $balance = (float)$row['available_balance'];
    }

    // Get transactions
    $tx_res = mysqli_query($conn, "SELECT * FROM transactions WHERE user_id = $user_id ORDER BY created_at DESC LIMIT 10");
    $transactions = [];
    if ($tx_res) {
        while($tx = mysqli_fetch_assoc($tx_res)) {
            $transactions[] = $tx;
        }
    }

    $response['success'] = true;
    $response['data'] = [
        'available_margin' => $balance,
        'history' => $transactions
    ];
} catch (Exception $e) {
    $response['message'] = "Error: " . $e->getMessage();
}

echo json_encode($response);
?>
