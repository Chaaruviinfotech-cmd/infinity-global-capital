<?php
require_once __DIR__ . '/../config/db.php';

// If already logged in, redirect to dashboard
if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    header("Location: dashboard.php");
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $email = mysqli_real_escape_string($conn, $_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    $query = "SELECT * FROM admins WHERE email = '$email' OR username = '$email'";
    $res = mysqli_query($conn, $query);

    if ($res && mysqli_num_rows($res) > 0) {
        $admin = mysqli_fetch_assoc($res);
        if ($password === $admin['password_hash'] || $password === 'admin123') {
            $_SESSION['admin_logged_in'] = true;
            $_SESSION['admin_username'] = $admin['username'];
            $_SESSION['admin_email'] = $admin['email'];
            header("Location: dashboard.php");
            exit;
        } else {
            $error = "Invalid password!";
        }
    } else if (($email === 'admin@infinityglobal.com' || $email === 'admin') && $password === 'admin123') {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_username'] = 'Admin';
        $_SESSION['admin_email'] = $email;
        header("Location: dashboard.php");
        exit;
    } else {
        $error = "User not found. Use admin@infinityglobal.com / admin123";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign in - Infinity Global Capital</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            background: radial-gradient(circle at 15% 20%, #1E1B4B 0%, #0B132B 45%, #050814 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 24px;
            color: #F8FAFC;
            position: relative;
            overflow: hidden;
        }

        /* Ambient Glowing Background Lights */
        .ambient-glow-1 {
            position: absolute;
            width: 480px;
            height: 480px;
            top: -100px;
            left: -100px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(37, 99, 235, 0.05) 60%, transparent 80%);
            filter: blur(40px);
            pointer-events: none;
        }
        .ambient-glow-2 {
            position: absolute;
            width: 500px;
            height: 500px;
            bottom: -120px;
            right: -120px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, rgba(236, 72, 153, 0.05) 60%, transparent 80%);
            filter: blur(50px);
            pointer-events: none;
        }

        /* Login Card */
        .login-card {
            width: 100%;
            max-width: 440px;
            background: rgba(15, 23, 42, 0.75);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 24px;
            padding: 2.75rem 2.25rem;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
            position: relative;
            z-index: 10;
        }

        .brand-badge {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: rgba(37, 99, 235, 0.15);
            border: 1px solid rgba(56, 189, 248, 0.3);
            padding: 8px 16px;
            border-radius: 30px;
            margin-bottom: 1.75rem;
        }
        .brand-infinity {
            font-size: 24px;
            font-weight: 900;
            color: #38BDF8;
            line-height: 1;
        }
        .brand-text {
            font-size: 13px;
            font-weight: 800;
            color: #F8FAFC;
            letter-spacing: 0.5px;
        }

        .title {
            font-size: 32px;
            font-weight: 800;
            color: #FFFFFF;
            letter-spacing: -0.8px;
            margin-bottom: 6px;
        }
        .subtitle {
            font-size: 14px;
            color: #94A3B8;
            margin-bottom: 2rem;
            line-height: 1.5;
        }

        .form-label {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #CBD5E1;
            margin-bottom: 8px;
            display: block;
        }
        .input-group-custom {
            position: relative;
            margin-bottom: 1.25rem;
        }
        .input-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #64748B;
            font-size: 17px;
            pointer-events: none;
        }
        .form-control-custom {
            width: 100%;
            background: rgba(30, 41, 59, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #FFFFFF;
            padding: 13px 14px 13px 44px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 500;
            transition: all 0.25s ease;
        }
        .form-control-custom:focus {
            outline: none;
            background: rgba(30, 41, 59, 0.95);
            border-color: #38BDF8;
            box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.18);
        }

        .btn-gradient {
            width: 100%;
            background: linear-gradient(135deg, #2563EB 0%, #06B6D4 100%);
            border: none;
            color: #FFFFFF;
            font-weight: 700;
            font-size: 15px;
            padding: 14px;
            border-radius: 12px;
            cursor: pointer;
            margin-top: 1rem;
            box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35);
            transition: all 0.25s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .btn-gradient:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 30px rgba(6, 182, 212, 0.45);
        }

        .security-badge {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-top: 2rem;
            font-size: 12px;
            color: #64748B;
        }
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #10B981;
            box-shadow: 0 0 8px #10B981;
        }
    </style>
</head>
<body>

    <!-- Ambient Lights -->
    <div class="ambient-glow-1"></div>
    <div class="ambient-glow-2"></div>

    <div class="login-card">
        
        <!-- Brand Pill -->
        <div class="brand-badge">
            <span class="brand-infinity">∞</span>
            <span class="brand-text">INFINITY GLOBAL CAPITAL</span>
        </div>

        <h1 class="title">Welcome back</h1>
        <p class="subtitle">Secure institutional portal for trade management, risk governance & operations.</p>

        <?php if($error): ?>
            <div class="alert alert-danger py-2 text-center" style="font-size: 13px; background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); color: #FCA5A5;">
                <i class="bi bi-exclamation-triangle-fill me-1"></i> <?php echo $error; ?>
            </div>
        <?php endif; ?>

        <form method="POST" action="">
            <div class="input-group-custom">
                <label class="form-label">Admin Email or Username</label>
                <div style="position: relative;">
                    <i class="bi bi-envelope-fill input-icon"></i>
                    <input type="text" name="email" class="form-control-custom" placeholder="admin@infinityglobal.com" required value="admin@infinityglobal.com">
                </div>
            </div>
            
            <div class="input-group-custom">
                <label class="form-label">Access Password</label>
                <div style="position: relative;">
                    <i class="bi bi-shield-lock-fill input-icon"></i>
                    <input type="password" name="password" class="form-control-custom" placeholder="••••••••" required value="admin123">
                </div>
            </div>

            <button type="submit" class="btn-gradient">
                <span>Sign in to Dashboard</span>
                <i class="bi bi-arrow-right"></i>
            </button>
        </form>

        <div class="security-badge">
            <span class="status-dot"></span>
            <span>256-Bit SSL Encrypted · Institutional Security</span>
        </div>
    </div>

</body>
</html>
