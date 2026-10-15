<?php
require_once __DIR__ . '/../config/db.php';

// Check auth
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: index.php");
    exit;
}

if(isset($_GET['id']) && isset($_GET['action']) && isset($_GET['user_id'])) {
    $kyc_id = (int)$_GET['id'];
    $user_id = (int)$_GET['user_id'];
    $action = $_GET['action'];
    
    $status = ($action == 'approve') ? 'Approved' : 'Rejected';
    
    // Update KYC table
    $update_kyc = "UPDATE kyc_details SET status = '$status' WHERE id = $kyc_id";
    if(mysqli_query($conn, $update_kyc)) {
        
        // If approved, update main user table
        if($status == 'Approved') {
            mysqli_query($conn, "UPDATE users SET is_kyc_verified = 1 WHERE id = $user_id");
        }
        
        $_SESSION['msg'] = "KYC successfully $status!";
    } else {
        $_SESSION['msg'] = "Error updating KYC.";
    }
}

header("Location: users.php");
exit;
?>
