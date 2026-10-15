<?php
// api/submit_kyc.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/socket_notify.php';

// Get POST data
$user_id = isset($_POST['user_id']) ? (int)$_POST['user_id'] : 0;
$full_name = isset($_POST['full_name']) ? mysqli_real_escape_string($conn, $_POST['full_name']) : '';
$pan_number = isset($_POST['pan_number']) ? mysqli_real_escape_string($conn, $_POST['pan_number']) : '';
$dob = isset($_POST['dob']) ? mysqli_real_escape_string($conn, $_POST['dob']) : '';
$account_no = isset($_POST['account_no']) ? mysqli_real_escape_string($conn, $_POST['account_no']) : '';
$ifsc_code = isset($_POST['ifsc_code']) ? mysqli_real_escape_string($conn, $_POST['ifsc_code']) : '';

if ($user_id == 0 || empty($full_name) || empty($pan_number)) {
    echo json_encode(['success' => false, 'message' => 'Please fill all required fields']);
    exit;
}

// Insert or Update KYC data
$check_kyc = mysqli_query($conn, "SELECT id FROM kyc_details WHERE user_id = $user_id LIMIT 1");
if ($check_kyc && mysqli_num_rows($check_kyc) > 0) {
    $kyc_row = mysqli_fetch_assoc($check_kyc);
    $k_id = (int)$kyc_row['id'];
    $save_query = "UPDATE kyc_details SET full_name = '$full_name', pan_number = '$pan_number', dob = '$dob', account_no = '$account_no', ifsc_code = '$ifsc_code', status = 'Pending' WHERE id = $k_id";
} else {
    $save_query = "INSERT INTO kyc_details (user_id, full_name, pan_number, dob, account_no, ifsc_code, status) 
                   VALUES ($user_id, '$full_name', '$pan_number', '$dob', '$account_no', '$ifsc_code', 'Pending')";
}

if (mysqli_query($conn, $save_query)) {
    // Update user status to show KYC is submitted (pending approval) and clear kyc_requested alert flag
    mysqli_query($conn, "UPDATE users SET is_kyc_verified = 0, kyc_requested = 0 WHERE id = $user_id");
    
    // Real-Time Socket Broadcast to Admin Web & Mobile
    broadcast_socket_event('KYC_STATUS_UPDATED', [
        'user_id' => $user_id,
        'kyc_status' => 'Pending',
        'is_kyc_verified' => 0,
        'kyc_requested' => 0,
        'full_name' => $full_name,
        'pan_number' => $pan_number
    ]);
    broadcast_socket_event('REFRESH_DATA', ['target' => 'kyc', 'user_id' => $user_id]);

    echo json_encode(['success' => true, 'message' => 'KYC submitted successfully. Waiting for admin approval.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . mysqli_error($conn)]);
}
?>
