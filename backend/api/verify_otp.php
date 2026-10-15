<?php
// api/verify_otp.php
// Verifies compulsory registration OTP and marks account active
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

    $raw_mobile = $_POST['mobile'] ?? $_REQUEST['mobile'] ?? '';
    $raw_email = $_POST['email'] ?? $_REQUEST['email'] ?? '';
    $raw_otp = $_POST['otp'] ?? $_REQUEST['otp'] ?? '';

    $mobile = mysqli_real_escape_string($conn, trim((string)$raw_mobile));
    $email = mysqli_real_escape_string($conn, trim((string)$raw_email));
    $otp = trim((string)$raw_otp);

    if ((empty($mobile) && empty($email)) || empty($otp)) {
        echo json_encode(['success' => false, 'message' => 'Mobile/Email and 4-digit OTP are required.']);
        exit;
    }

    $isVerified = false;

    // Verify against DB otp_verifications table
    $now = date('Y-m-d H:i:s');
    $check_sql = "SELECT id, identifier FROM otp_verifications 
                  WHERE (identifier = '$mobile' OR identifier = '$email') 
                    AND otp_code = '$otp' 
                    AND is_verified = 0 
                    AND expires_at >= '$now' 
                  ORDER BY id DESC LIMIT 1";
    $check_res = mysqli_query($conn, $check_sql);

    if ($check_res && mysqli_num_rows($check_res) > 0) {
        $otpRow = mysqli_fetch_assoc($check_res);
        $otpId = (int)$otpRow['id'];
        mysqli_query($conn, "UPDATE otp_verifications SET is_verified = 1 WHERE id = $otpId");
        $isVerified = true;
    }

    if ($isVerified) {
        if (!empty($mobile) && !empty($email)) {
            $where = "(u.mobile = '$mobile' OR u.email = '$email')";
        } else if (!empty($mobile)) {
            $where = "u.mobile = '$mobile'";
        } else {
            $where = "u.email = '$email'";
        }
        
        // Activate user account
        mysqli_query($conn, "UPDATE users u SET status = 'active' WHERE $where");

        $query = "SELECT u.id, u.mobile, u.email, u.is_kyc_verified, u.status, u.created_at,
                         k.full_name, k.pan_number, k.dob, k.account_no, k.ifsc_code, k.status AS kyc_status 
                  FROM users u 
                  LEFT JOIN kyc_details k ON u.id = k.user_id 
                  WHERE $where 
                  LIMIT 1";
        
        $result = mysqli_query($conn, $query);
        $user = ($result && mysqli_num_rows($result) > 0) ? mysqli_fetch_assoc($result) : null;

        echo json_encode([
            'success' => true, 
            'verified' => true,
            'message' => 'OTP verified successfully! Your trading demat account is active. Please log in with your credentials to continue.',
            'data' => $user
        ]);
        exit;
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid or expired OTP code. Please enter the valid code sent to your email.']);
        exit;
    }

} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
    exit;
}
?>
