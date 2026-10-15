<?php
// backend/api/admin_users.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/socket_notify.php';

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
    $input = array_merge($_GET, $input);
    $action = isset($input['action']) ? trim($input['action']) : '';

    // ----------------------------------------------------
    // ACTION: APPROVE OR REJECT KYC
    // ----------------------------------------------------
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && in_array($action, ['approve', 'reject'])) {
        $kyc_id = isset($input['kyc_id']) ? (int)$input['kyc_id'] : 0;
        $user_id = isset($input['user_id']) ? (int)$input['user_id'] : 0;

        if ($user_id <= 0) {
            $response['message'] = "Valid user ID is required.";
            echo json_encode($response);
            exit;
        }

        $new_status = ($action === 'approve') ? 'Approved' : 'Rejected';

        // Check if kyc_details record exists
        if ($kyc_id > 0) {
            $up_kyc = "UPDATE kyc_details SET status = '$new_status' WHERE id = $kyc_id";
        } else {
            $up_kyc = "UPDATE kyc_details SET status = '$new_status' WHERE user_id = $user_id";
        }
        mysqli_query($conn, $up_kyc);

        if ($new_status === 'Approved') {
            mysqli_query($conn, "UPDATE users SET is_kyc_verified = 1, kyc_requested = 0 WHERE id = $user_id");
        } else {
            mysqli_query($conn, "UPDATE users SET is_kyc_verified = 0 WHERE id = $user_id");
        }

        // Real-Time Socket Broadcast to Mobile & Web
        broadcast_socket_event('KYC_STATUS_UPDATED', [
            'user_id' => $user_id,
            'kyc_status' => $new_status,
            'is_kyc_verified' => ($new_status === 'Approved' ? 1 : 0),
            'kyc_requested' => 0
        ]);

        $response['success'] = true;
        $response['message'] = "KYC successfully marked as {$new_status} for User #{$user_id}.";
        $response['status'] = $new_status;
        echo json_encode($response);
        exit;
    }

    // ----------------------------------------------------
    // ACTION: REQUEST KYC (ALERT TO USER IN MOBILE APP)
    // ----------------------------------------------------
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'request_kyc') {
        $user_id = isset($input['user_id']) ? (int)$input['user_id'] : 0;
        if ($user_id <= 0) {
            echo json_encode(['success' => false, 'message' => 'Valid User ID is required.']);
            exit;
        }

        // Ensure kyc_requested column exists
        $col_kr = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'kyc_requested'");
        if ($col_kr && mysqli_num_rows($col_kr) == 0) {
            mysqli_query($conn, "ALTER TABLE users ADD COLUMN kyc_requested TINYINT(1) DEFAULT 0 AFTER is_kyc_verified");
        }

        $upd = mysqli_query($conn, "UPDATE users SET kyc_requested = 1 WHERE id = $user_id");
        if ($upd) {
            // Real-Time Socket Broadcast: Instantly alert Mobile app!
            broadcast_socket_event('KYC_STATUS_UPDATED', [
                'user_id' => $user_id,
                'kyc_requested' => 1,
                'is_kyc_verified' => 0
            ]);

            echo json_encode([
                'success' => true,
                'message' => "KYC request alert sent to User #UID-" . str_pad($user_id, 4, '0', STR_PAD_LEFT) . " successfully."
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => "Failed to update KYC request status: " . mysqli_error($conn)
            ]);
        }
        exit;
    }

    // ----------------------------------------------------
    // ACTION: DELETE USER & TRIGGER AUTOMATIC LOGOUT
    // ----------------------------------------------------
    if (in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST']) && $action === 'delete_user') {
        $user_id = isset($input['user_id']) ? (int)$input['user_id'] : 0;
        if ($user_id <= 0) {
            echo json_encode(['success' => false, 'message' => 'Valid User ID is required.']);
            exit;
        }

        // Clean up all related tables
        @mysqli_query($conn, "DELETE FROM kyc_details WHERE user_id = $user_id");
        @mysqli_query($conn, "DELETE FROM wallets WHERE user_id = $user_id");
        @mysqli_query($conn, "DELETE FROM holdings WHERE user_id = $user_id");
        @mysqli_query($conn, "DELETE FROM orders WHERE user_id = $user_id");
        $chk_tx = @mysqli_query($conn, "SHOW TABLES LIKE 'transactions'");
        if ($chk_tx && mysqli_num_rows($chk_tx) > 0) {
            @mysqli_query($conn, "DELETE FROM transactions WHERE user_id = $user_id");
        }

        $del_user = mysqli_query($conn, "DELETE FROM users WHERE id = $user_id");

        if ($del_user) {
            // Instantly notify mobile app & all connected clients to force logout
            broadcast_socket_event('USER_DELETED', [
                'user_id' => $user_id,
                'message' => "Your account has been deleted by administrator."
            ]);
            broadcast_socket_event('FORCE_LOGOUT', [
                'user_id' => $user_id,
                'reason' => 'user_deleted'
            ]);
            broadcast_socket_event('REFRESH_DATA', [
                'target' => 'all'
            ]);

            echo json_encode([
                'success' => true,
                'message' => "User #UID-" . str_pad($user_id, 4, '0', STR_PAD_LEFT) . " and all associated data deleted successfully."
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => "Failed to delete user: " . mysqli_error($conn)
            ]);
        }
        exit;
    }

    // Ensure kyc_requested column exists
    $col_kr = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'kyc_requested'");
    if ($col_kr && mysqli_num_rows($col_kr) == 0) {
        mysqli_query($conn, "ALTER TABLE users ADD COLUMN kyc_requested TINYINT(1) DEFAULT 0 AFTER is_kyc_verified");
    }

    $query = "SELECT u.id AS user_id, u.mobile, u.email, u.created_at, u.is_kyc_verified, u.kyc_requested,
                     COALESCE(u.full_name, k.full_name, 'Not Submitted') AS full_name,
                     k.id AS kyc_id, k.pan_number, k.status AS kyc_status, k.account_no, k.ifsc_code, k.dob 
              FROM users u 
              LEFT JOIN kyc_details k ON u.id = k.user_id 
              ORDER BY u.id ASC";
    $result = mysqli_query($conn, $query);

    $users = [];
    $pending = 0;
    $approved = 0;
    $rejected = 0;

    if ($result) {
        while ($row = mysqli_fetch_assoc($result)) {
            $kStatus = $row['kyc_status'] ?? 'Not Submitted';
            if ($kStatus === 'Pending') $pending++;
            elseif ($kStatus === 'Approved') $approved++;
            elseif ($kStatus === 'Rejected') $rejected++;

            $users[] = [
                'user_id' => (int)$row['user_id'],
                'uid_formatted' => '#UID-' . str_pad($row['user_id'], 4, '0', STR_PAD_LEFT),
                'mobile' => $row['mobile'],
                'email' => $row['email'] ?? '',
                'full_name' => $row['full_name'] ?? 'Not Submitted',
                'pan_number' => $row['pan_number'] ?? '-',
                'account_no' => $row['account_no'] ?? '-',
                'ifsc_code' => $row['ifsc_code'] ?? '-',
                'dob' => $row['dob'] ?? '-',
                'kyc_status' => $kStatus,
                'is_kyc_verified' => (int)($row['is_kyc_verified'] ?? 0),
                'kyc_requested' => (int)($row['kyc_requested'] ?? 0),
                'kyc_id' => (int)($row['kyc_id'] ?? 0),
                'created_at' => $row['created_at']
            ];
        }
    }

    $response['success'] = true;
    $response['data'] = $users;
    $response['stats'] = [
        'total' => count($users),
        'pending' => $pending,
        'approved' => $approved,
        'rejected' => $rejected
    ];
    $response['message'] = "Users and KYC details loaded successfully.";
} catch (Exception $e) {
    $response['message'] = "Error: " . $e->getMessage();
}

echo json_encode($response);
?>
