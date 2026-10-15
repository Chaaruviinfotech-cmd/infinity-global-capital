<?php
// api/register.php
// Compulsory Email OTP registration for new trading accounts
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    require_once __DIR__ . '/../config/db.php';
    require_once __DIR__ . '/../helpers/email_service.php';

    // Parse input from all possible sources
    $raw_input = file_get_contents('php://input');
    if (!empty($raw_input)) {
        $json_data = json_decode($raw_input, true);
        if (is_array($json_data)) {
            if (isset($json_data['_parts']) && is_array($json_data['_parts'])) {
                foreach ($json_data['_parts'] as $part) {
                    if (isset($part[0]) && isset($part[1])) {
                        $_POST[$part[0]] = $part[1];
                    }
                }
            } else {
                foreach ($json_data as $k => $v) {
                    if (!isset($_POST[$k])) {
                        $_POST[$k] = $v;
                    }
                }
            }
        } else if (strpos($raw_input, '=') !== false) {
            parse_str($raw_input, $parsed_raw);
            if (is_array($parsed_raw)) {
                foreach ($parsed_raw as $k => $v) {
                    if (!isset($_POST[$k])) {
                        $_POST[$k] = $v;
                    }
                }
            }
        }
    }

    $raw_name = $_POST['name'] ?? $_POST['full_name'] ?? $_REQUEST['name'] ?? $_REQUEST['full_name'] ?? '';
    $raw_mobile = $_POST['mobile'] ?? $_REQUEST['mobile'] ?? '';
    $raw_email = $_POST['email'] ?? $_REQUEST['email'] ?? '';

    $name = mysqli_real_escape_string($conn, trim((string)$raw_name));
    $mobile = mysqli_real_escape_string($conn, trim((string)$raw_mobile));
    $email = mysqli_real_escape_string($conn, trim((string)$raw_email));

    if (empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Full Name is required for registration.']);
        exit;
    }

    if (empty($mobile) || strlen($mobile) < 10) {
        echo json_encode(['success' => false, 'message' => 'Valid 10-digit mobile number is required.']);
        exit;
    }

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Valid email address is required for OTP verification.']);
        exit;
    }

    // Ensure full_name & kyc_requested columns exist in users table
    $col_check = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'full_name'");
    if ($col_check && mysqli_num_rows($col_check) == 0) {
        mysqli_query($conn, "ALTER TABLE users ADD COLUMN full_name VARCHAR(100) DEFAULT NULL AFTER email");
    }
    $col_kr = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'kyc_requested'");
    if ($col_kr && mysqli_num_rows($col_kr) == 0) {
        mysqli_query($conn, "ALTER TABLE users ADD COLUMN kyc_requested TINYINT(1) DEFAULT 0 AFTER is_kyc_verified");
    }

    $safe_email_lower = strtolower($email);

    // Check if account already exists with either mobile OR email
    $check = mysqli_query($conn, "SELECT id, mobile, email FROM users WHERE mobile = '$mobile' OR LOWER(email) = '$safe_email_lower' LIMIT 1");
    if ($check && mysqli_num_rows($check) > 0) {
        $existing = mysqli_fetch_assoc($check);
        if ($existing['mobile'] === $mobile && strtolower($existing['email']) === $safe_email_lower) {
            $msg = 'An account is already registered with this mobile and email. Please log in directly.';
        } else if ($existing['mobile'] === $mobile) {
            $msg = 'This mobile number is already registered. Please log in or use another number.';
        } else {
            $msg = 'This email address is already registered. Please log in or use another email.';
        }
        echo json_encode(['success' => false, 'already_registered' => true, 'message' => $msg]);
        exit;
    }

    // Insert user with status active until OTP verified
    $insert = "INSERT INTO users (full_name, mobile, email, is_kyc_verified, status) VALUES ('$name', '$mobile', '$email', 0, 'active')";
    if (mysqli_query($conn, $insert)) {
        $user_id = mysqli_insert_id($conn);
        // Create initial empty wallet
        mysqli_query($conn, "INSERT INTO wallets (user_id, available_balance, total_invested) VALUES ($user_id, 0.00, 0.00)");
        
        // Also insert initial kyc_details row with registered name
        mysqli_query($conn, "INSERT INTO kyc_details (user_id, full_name, pan_number, dob, account_no, ifsc_code, status) VALUES ($user_id, '$name', '', '', '', '', 'Pending')");

        // Generate secure dynamic 4-digit OTP
        $otp = (string)rand(1000, 9999);
        $expires_at = date('Y-m-d H:i:s', strtotime('+15 minutes'));

        // Save OTP to otp_verifications for both email and mobile identifiers
        mysqli_query($conn, "INSERT INTO otp_verifications (identifier, otp_code, action_type, expires_at) VALUES ('$email', '$otp', 'registration', '$expires_at')");
        mysqli_query($conn, "INSERT INTO otp_verifications (identifier, otp_code, action_type, expires_at) VALUES ('$mobile', '$otp', 'registration', '$expires_at')");

        // Dispatch compulsory registration email OTP via SMTP safely
        $smtp_dispatched = false;
        $mailError = '';
        try {
            $mailResult = EmailService::sendOtpEmail($email, $otp, 'Registration & Demat Account Setup', $name);
            $smtp_dispatched = !empty($mailResult['sent_smtp']);
            if (!empty($mailResult['error'])) {
                $mailError = $mailResult['error'];
            }
        } catch (Throwable $mEx) {
            $mailError = $mEx->getMessage();
        }

        echo json_encode([
            'success' => true, 
            'message' => 'Security verification OTP dispatched to your registered email (' . htmlspecialchars($email) . '). Please verify to activate your account.',
            'email' => $email,
            'mobile' => $mobile,
            'user_id' => $user_id,
            'smtp_dispatched' => $smtp_dispatched,
            'smtp_error' => $mailError ? $mailError : null
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Registration database error: ' . mysqli_error($conn)]);
    }

} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
    exit;
}
?>
