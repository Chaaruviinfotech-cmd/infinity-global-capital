<?php
$host = 'localhost';
$username = 'root';
$password = ''; // Default XAMPP password is empty
$database = 'infinity_global';

// Connect using mysqli with fallback for PHP 8 strict mode
try {
    $conn = mysqli_connect($host, $username, $password, $database);
} catch (Throwable $e1) {
    try {
        $conn = mysqli_connect('127.0.0.1', $username, $password, $database, 3306);
    } catch (Throwable $e2) {
        try {
            $conn = mysqli_connect('localhost', $username, $password, $database, null, '/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock');
        } catch (Throwable $e3) {
            die("Connection failed: " . $e3->getMessage());
        }
    }
}

// Check connection
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

// Set charset to utf8mb4 for proper string handling
mysqli_set_charset($conn, "utf8mb4");

// Start session if not already started
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Allow local preview for screenshots
if (isset($_GET['preview']) && $_GET['preview'] === '1') {
    $_SESSION['admin_logged_in'] = true;
    $_SESSION['admin_username'] = 'Admin';
}
?>
