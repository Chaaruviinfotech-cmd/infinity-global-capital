<?php
// backend/config/mail_config.php
// SMTP & Email Configuration for Infinity Global Capital

return [
    // Set to true to attempt real SMTP delivery, false for simulation/logging only
    'smtp_enabled' => true, // Real SMTP delivery activated

    // SMTP Server Credentials (Gmail, Hostinger, cPanel, SendGrid, etc.)
    'smtp_host' => 'smtp.gmail.com',     // e.g. smtp.gmail.com
    'smtp_port' => 587,                   // 587 (TLS) or 465 (SSL)
    'smtp_encryption' => 'tls',           // 'tls' or 'ssl'
    'smtp_username' => 'bikramnahak9714@gmail.com',                // Your full email address (e.g. trading@gmail.com)
    'smtp_password' => 'cftoecvfntbtfoim',                // 16-character Google App Password or SMTP password
    
    // Sender Information
    'from_email' => 'bikramnahak9714@gmail.com',
    'from_name' => 'INFINITY GLOBAL CAPITAL',

    // Security & OTP Settings
    'otp_validity_minutes' => 10,
    'allow_demo_otp' => false,            // Strictly verify against real email OTP only

    // Debugging & Audit Log
    'debug_log' => true,
    'log_file' => __DIR__ . '/../logs/email_log.txt',
];
