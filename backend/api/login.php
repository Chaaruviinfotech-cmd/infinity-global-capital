<?php
// api/login.php
// Direct login verification against MySQL database (No OTP during login)
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

    // Parse input from all possible sources (Raw JSON, React Native _parts, urlencoded, $_POST, $_REQUEST)
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

    $mobile = mysqli_real_escape_string($conn, trim((string)$raw_mobile));
    $email = mysqli_real_escape_string($conn, trim((string)$raw_email));

    if (empty($mobile)) {
        echo json_encode([
            'success' => false, 
            'message' => 'Mobile number is required for login.'
        ]);
        exit;
    }

    if (empty($email)) {
        echo json_encode([
            'success' => false, 
            'message' => 'Registered Email address is required for login.'
        ]);
        exit;
    }

    // Exact match check: Both Mobile AND Email must match in database
    // Ensure kyc_requested column exists
    $col_kr = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'kyc_requested'");
    if ($col_kr && mysqli_num_rows($col_kr) == 0) {
        mysqli_query($conn, "ALTER TABLE users ADD COLUMN kyc_requested TINYINT(1) DEFAULT 0 AFTER is_kyc_verified");
    }

    $safe_email_lower = strtolower($email);
    $check_sql = "SELECT u.id, u.mobile, u.email, u.is_kyc_verified, u.kyc_requested, u.status, u.created_at,
                         COALESCE(u.full_name, k.full_name, 'Valued Trader') AS full_name, 
                         k.pan_number, k.dob, k.account_no, k.ifsc_code, k.status AS kyc_status 
                  FROM users u 
                  LEFT JOIN kyc_details k ON u.id = k.user_id 
                  WHERE u.mobile = '$mobile' AND LOWER(u.email) = '$safe_email_lower' 
                  LIMIT 1";

    $check_res = mysqli_query($conn, $check_sql);

    if ($check_res && mysqli_num_rows($check_res) > 0) {
        $user = mysqli_fetch_assoc($check_res);

        // Account status check
        if (!empty($user['status']) && $user['status'] === 'blocked') {
            echo json_encode([
                'success' => false,
                'message' => 'Your trading account has been suspended. Please contact institutional support.'
            ]);
            exit;
        }

        // DIRECT LOGIN - NO OTP REQUIRED!
        echo json_encode([
            'success' => true,
            'direct_login' => true,
            'message' => 'Login successful. Welcome back to Infinity Global Capital!',
            'data' => [
                'id' => (int)$user['id'],
                'mobile' => $user['mobile'],
                'email' => $user['email'],
                'full_name' => !empty($user['full_name']) ? $user['full_name'] : 'Investor',
                'is_kyc_verified' => (int)$user['is_kyc_verified'],
                'kyc_status' => !empty($user['kyc_status']) ? $user['kyc_status'] : 'Not Submitted',
                'kyc_requested' => (int)($user['kyc_requested'] ?? 0),
                'status' => $user['status'],
                'created_at' => $user['created_at']
            ]
        ]);
        exit;
    } else {
        // Check if mobile exists with different email or vice-versa to give helpful message
        $mob_check = mysqli_query($conn, "SELECT id FROM users WHERE mobile = '$mobile' LIMIT 1");
        $has_mob = ($mob_check && mysqli_num_rows($mob_check) > 0);

        $msg = 'Account not found with this Mobile & Email. Please register your account.';
        if ($has_mob) {
            $msg = 'The email address does not match this registered mobile number. Please check your credentials or register a new account.';
        }

        echo json_encode([
            'success' => false,
            'not_registered' => true,
            'message' => $msg
        ]);
        exit;
    }

} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
    exit;
}
?>
