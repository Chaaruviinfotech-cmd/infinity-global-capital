
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS holdings;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS wallets;
DROP TABLE IF EXISTS kyc_details;
DROP TABLE IF EXISTS watchlist_stocks;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS admins;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) DEFAULT NULL,
    role VARCHAR(20) DEFAULT 'SuperAdmin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO admins (id, username, password_hash, email, role)
VALUES (1, 'admin', 'admin123', 'admin@infinityglobal.com', 'SuperAdmin');

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mobile VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(100) DEFAULT NULL,
    is_kyc_verified TINYINT(1) DEFAULT 0,
    status ENUM('Active', 'Pending', 'Suspended') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO users (id, mobile, email, is_kyc_verified, status, created_at) VALUES
(1, '9876543210', 'investor@infinity.com', 1, 'Active', '2026-09-10 10:30:00'),
(2, '9301221500', 'bikram@infinity.com', 1, 'Active', '2026-09-12 11:15:00'),
(3, '9123456780', 'rahul.sharma@gmail.com', 0, 'Pending', '2026-09-15 14:20:00'),
(4, '9811223344', 'priya.verma@outlook.com', 1, 'Active', '2026-09-18 09:45:00'),
(5, '9822334455', 'amit.patel@yahoo.com', 1, 'Active', '2026-09-20 16:10:00'),
(6, '9833445566', 'neha.singh@gmail.com', 0, 'Pending', '2026-09-22 18:00:00'),
(7, '9844556677', 'vikram.aditya@gmail.com', 1, 'Active', '2026-09-25 12:30:00'),
(8, '9855667788', 'pooja.mehta@hotmail.com', 0, 'Pending', '2026-09-28 15:40:00'),
(9, '9866778899', 'suresh.kumar@gmail.com', 1, 'Active', '2026-10-01 11:00:00'),
(10, '9877889900', 'ananya.iyer@gmail.com', 1, 'Active', '2026-10-02 13:25:00'),
(11, '9888990011', 'rohit.deshmukh@gmail.com', 0, 'Pending', '2026-10-03 17:50:00'),
(12, '9899001122', 'kavita.reddy@gmail.com', 1, 'Active', '2026-10-04 10:15:00');

CREATE TABLE IF NOT EXISTS kyc_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    pan_number VARCHAR(15) NOT NULL,
    dob VARCHAR(20) NOT NULL,
    account_no VARCHAR(30) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    admin_remark VARCHAR(255) DEFAULT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO kyc_details (id, user_id, full_name, pan_number, dob, account_no, ifsc_code, status, admin_remark, submitted_at) VALUES
(1, 1, 'Bikram Sahu', 'ABCDE1234F', '1995-08-15', '50100234567890', 'HDFC0000123', 'Approved', 'Verified through NSDL e-KYC', '2026-09-10 11:00:00'),
(2, 2, 'Girdharee Sahu', 'FGHIJ5678K', '1998-11-20', '32198765432100', 'SBIN0004567', 'Approved', 'Bank statement verified', '2026-09-12 12:00:00'),
(3, 3, 'Rahul Sharma', 'KLMNO9012P', '1992-04-10', '00123456789012', 'ICIC0000045', 'Pending', NULL, '2026-09-15 15:00:00'),
(4, 4, 'Priya Verma', 'QREST3456U', '1996-01-25', '98761234509876', 'KKBK0001290', 'Approved', 'Aadhaar & PAN matched', '2026-09-18 10:15:00'),
(5, 5, 'Amit Patel', 'UVWXY7890Z', '1989-07-30', '11223344556677', 'BARB0ALKAXX', 'Approved', 'Verified via DigiLocker', '2026-09-20 16:45:00'),
(6, 6, 'Neha Singh', 'BCDEF2345G', '1994-12-05', '99887766554433', 'PUNB0123400', 'Pending', NULL, '2026-09-22 18:30:00'),
(7, 7, 'Vikram Aditya', 'GHIJK6789L', '1990-09-14', '44556677889900', 'AXIS0000210', 'Approved', 'NSDL Verified', '2026-09-25 13:00:00'),
(8, 8, 'Pooja Mehta', 'MNOPQ0123R', '1997-03-18', '55667788990011', 'HDFC0000456', 'Pending', NULL, '2026-09-28 16:00:00'),
(9, 9, 'Suresh Kumar', 'STUVW4567X', '1985-06-22', '66778899001122', 'SBIN0008901', 'Approved', 'Verified', '2026-10-01 11:30:00'),
(10, 10, 'Ananya Iyer', 'YZABC8901D', '1993-10-08', '77889900112233', 'ICIC0000112', 'Approved', 'Verified', '2026-10-02 14:00:00'),
(11, 11, 'Rohit Deshmukh', 'EFGHI2345J', '1991-05-12', '88990011223344', 'MAHB0000345', 'Pending', NULL, '2026-10-03 18:15:00'),
(12, 12, 'Kavita Reddy', 'JKLMN6789O', '1996-08-29', '12340987654321', 'ANDB0000789', 'Rejected', 'Invalid PAN image quality', '2026-10-04 10:45:00');

CREATE TABLE IF NOT EXISTS wallets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    available_balance DECIMAL(15,2) DEFAULT 0.00,
    total_invested DECIMAL(15,2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO wallets (id, user_id, available_balance, total_invested) VALUES
(1, 1, 245000.00, 1120300.00),
(2, 2, 75000.00, 480200.00),
(3, 3, 20000.00, 0.00),
(4, 4, 180000.00, 650000.00),
(5, 5, 340000.00, 1425000.00),
(6, 6, 15000.00, 0.00),
(7, 7, 520000.00, 1890000.00),
(8, 8, 45000.00, 120000.00),
(9, 9, 95000.00, 380000.00),
(10, 10, 310000.00, 920000.00),
(11, 11, 10000.00, 0.00),
(12, 12, 60000.00, 150000.00);

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    type ENUM('Deposit', 'Withdrawal') NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Net Banking/UPI',
    status ENUM('Completed', 'Pending', 'Failed') DEFAULT 'Completed',
    txn_id VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO transactions (id, user_id, amount, type, payment_method, status, txn_id, created_at) VALUES
(1, 1, 100000.00, 'Deposit', 'UPI / GPay', 'Completed', 'TXN_IGC_981201', '2026-10-01 10:30:00'),
(2, 1, 25000.00, 'Withdrawal', 'IMPS Transfer', 'Completed', 'TXN_IGC_981202', '2026-10-02 14:15:00'),
(3, 1, 150000.00, 'Deposit', 'Net Banking (HDFC)', 'Completed', 'TXN_IGC_981203', '2026-10-03 18:45:00'),
(4, 1, 20000.00, 'Deposit', 'UPI / PhonePe', 'Completed', 'TXN_IGC_981204', '2026-10-04 09:20:00'),
(5, 2, 50000.00, 'Deposit', 'UPI / Paytm', 'Completed', 'TXN_IGC_981205', '2026-10-04 11:00:00'),
(6, 2, 25000.00, 'Deposit', 'Net Banking (SBI)', 'Completed', 'TXN_IGC_981206', '2026-10-04 16:30:00'),
(7, 4, 200000.00, 'Deposit', 'NEFT Transfer', 'Completed', 'TXN_IGC_981207', '2026-10-05 10:10:00'),
(8, 4, 20000.00, 'Withdrawal', 'IMPS Transfer', 'Completed', 'TXN_IGC_981208', '2026-10-05 13:00:00'),
(9, 5, 500000.00, 'Deposit', 'RTGS Transfer', 'Completed', 'TXN_IGC_981209', '2026-10-05 15:45:00'),
(10, 5, 160000.00, 'Withdrawal', 'Bank Transfer', 'Completed', 'TXN_IGC_981210', '2026-10-05 17:15:00'),
(11, 7, 300000.00, 'Deposit', 'Net Banking (Axis)', 'Completed', 'TXN_IGC_981211', '2026-10-06 08:30:00'),
(12, 7, 50000.00, 'Withdrawal', 'IMPS Transfer', 'Completed', 'TXN_IGC_981212', '2026-10-06 09:45:00'),
(13, 9, 100000.00, 'Deposit', 'UPI / GPay', 'Completed', 'TXN_IGC_981213', '2026-10-06 10:50:00'),
(14, 10, 350000.00, 'Deposit', 'Net Banking (ICICI)', 'Completed', 'TXN_IGC_981214', '2026-10-06 11:20:00'),
(15, 10, 40000.00, 'Withdrawal', 'Bank Transfer', 'Completed', 'TXN_IGC_981215', '2026-10-06 12:10:00'),
(16, 1, 50000.00, 'Deposit', 'UPI Instant', 'Completed', 'TXN_IGC_981216', '2026-10-06 13:00:00');

CREATE TABLE IF NOT EXISTS holdings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    stock_symbol VARCHAR(20) NOT NULL,
    company_name VARCHAR(100) DEFAULT NULL,
    quantity INT NOT NULL,
    avg_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO holdings (id, user_id, stock_symbol, company_name, quantity, avg_price) VALUES
(1, 1, 'RELIANCE', 'Reliance Industries Ltd', 120, 1390.00),
(2, 1, 'TCS', 'Tata Consultancy Services', 40, 3810.00),
(3, 1, 'HDFCBANK', 'HDFC Bank Ltd', 80, 1745.00),
(4, 1, 'INFY', 'Infosys Limited', 150, 1420.50),
(5, 1, 'TATAMOTORS', 'Tata Motors Ltd', 100, 920.00),
(6, 1, 'ICICIBANK', 'ICICI Bank Ltd', 75, 1180.00),
(7, 2, 'SBIN', 'State Bank of India', 120, 780.00),
(8, 2, 'LT', 'Larsen & Toubro Ltd', 35, 3450.00),
(9, 2, 'BHARTIARTL', 'Bharti Airtel Ltd', 90, 1610.00),
(10, 4, 'ITC', 'ITC Limited', 300, 480.00),
(11, 4, 'TITAN', 'Titan Company Ltd', 50, 3350.00),
(12, 5, 'BAJFINANCE', 'Bajaj Finance Ltd', 80, 6950.00),
(13, 5, 'RELIANCE', 'Reliance Industries Ltd', 100, 1410.00),
(14, 7, 'TCS', 'Tata Consultancy Services', 100, 3850.00),
(15, 7, 'HDFCBANK', 'HDFC Bank Ltd', 150, 1730.00),
(16, 10, 'SUNPHARMA', 'Sun Pharmaceutical Industries', 90, 1820.00);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    stock_symbol VARCHAR(20) NOT NULL,
    order_type ENUM('BUY', 'SELL') NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'EXECUTED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO orders (id, user_id, stock_symbol, order_type, quantity, price, status, created_at) VALUES
(1, 1, 'RELIANCE', 'BUY', 60, 1385.00, 'EXECUTED', '2026-10-04 09:30:15'),
(2, 1, 'RELIANCE', 'BUY', 60, 1395.00, 'EXECUTED', '2026-10-04 10:15:22'),
(3, 1, 'TCS', 'BUY', 40, 3810.00, 'EXECUTED', '2026-10-04 11:45:00'),
(4, 1, 'HDFCBANK', 'BUY', 80, 1745.00, 'EXECUTED', '2026-10-05 09:20:10'),
(5, 1, 'INFY', 'BUY', 150, 1420.50, 'EXECUTED', '2026-10-05 10:55:40'),
(6, 1, 'TATAMOTORS', 'BUY', 100, 920.00, 'EXECUTED', '2026-10-05 14:10:30'),
(7, 1, 'ICICIBANK', 'BUY', 75, 1180.00, 'EXECUTED', '2026-10-06 09:40:00'),
(8, 1, 'WIPRO', 'BUY', 50, 540.00, 'PENDING', '2026-10-06 10:25:00'),
(9, 2, 'SBIN', 'BUY', 120, 780.00, 'EXECUTED', '2026-10-05 11:15:00'),
(10, 2, 'LT', 'BUY', 35, 3450.00, 'EXECUTED', '2026-10-05 13:40:00'),
(11, 4, 'ITC', 'BUY', 300, 480.00, 'EXECUTED', '2026-10-05 14:30:00'),
(12, 4, 'TITAN', 'BUY', 50, 3350.00, 'EXECUTED', '2026-10-06 09:35:00'),
(13, 5, 'BAJFINANCE', 'BUY', 80, 6950.00, 'EXECUTED', '2026-10-06 10:05:00'),
(14, 7, 'TCS', 'BUY', 100, 3850.00, 'EXECUTED', '2026-10-06 10:50:00'),
(15, 1, 'INFY', 'SELL', 25, 1510.00, 'PENDING', '2026-10-06 11:15:00'),
(16, 1, 'ZOMATO', 'BUY', 200, 265.00, 'CANCELLED', '2026-10-06 11:30:00');

CREATE TABLE IF NOT EXISTS watchlist_stocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    company_name VARCHAR(100) NOT NULL,
    current_price DECIMAL(10,2) NOT NULL,
    prev_close DECIMAL(10,2) DEFAULT NULL,
    open_price DECIMAL(10,2) DEFAULT NULL,
    high_price DECIMAL(10,2) DEFAULT NULL,
    low_price DECIMAL(10,2) DEFAULT NULL,
    day_change DECIMAL(10,2) NOT NULL,
    day_change_percent DECIMAL(5,2) NOT NULL,
    is_up TINYINT(1) DEFAULT 1,
    volume VARCHAR(50) DEFAULT '1.2M',
    sector VARCHAR(50) DEFAULT 'General',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO watchlist_stocks (id, symbol, company_name, current_price, prev_close, open_price, high_price, low_price, day_change, day_change_percent, is_up, volume, sector) VALUES
(1, 'RELIANCE', 'Reliance Industries Ltd', 1482.40, 1390.00, 1420.00, 1510.00, 1385.00, 92.40, 6.64, 1, '4.8M', 'Energy'),
(2, 'TCS', 'Tata Consultancy Services', 3944.80, 3810.00, 3850.00, 3990.00, 3805.00, 134.80, 3.53, 1, '2.1M', 'IT Tech'),
(3, 'HDFCBANK', 'HDFC Bank Ltd', 1812.10, 1745.00, 1760.00, 1835.00, 1740.00, 67.10, 3.84, 1, '8.6M', 'Banking'),
(4, 'INFY', 'Infosys Limited', 1495.20, 1513.50, 1510.00, 1525.00, 1488.00, -18.30, -1.21, 0, '5.3M', 'IT Tech'),
(5, 'TATAMOTORS', 'Tata Motors Ltd', 968.50, 944.20, 950.00, 980.00, 942.00, 24.30, 2.57, 1, '6.4M', 'Automobile'),
(6, 'ICICIBANK', 'ICICI Bank Ltd', 1245.00, 1229.40, 1235.00, 1260.00, 1225.00, 15.60, 1.27, 1, '5.1M', 'Banking'),
(7, 'SBIN', 'State Bank of India', 814.20, 795.50, 800.00, 825.00, 794.00, 18.70, 2.35, 1, '9.2M', 'Banking'),
(8, 'BHARTIARTL', 'Bharti Airtel Ltd', 1664.50, 1631.70, 1640.00, 1680.00, 1630.00, 32.80, 2.01, 1, '3.7M', 'Telecom'),
(9, 'LT', 'Larsen & Toubro Ltd', 3580.00, 3608.40, 3600.00, 3625.00, 3560.00, -28.40, -0.79, 0, '1.4M', 'Infrastructure'),
(10, 'ITC', 'ITC Limited', 504.60, 496.20, 498.00, 510.00, 495.00, 8.40, 1.69, 1, '7.9M', 'FMCG'),
(11, 'TITAN', 'Titan Company Ltd', 3480.00, 3418.00, 3430.00, 3510.00, 3410.00, 62.00, 1.81, 1, '1.1M', 'Consumer Goods'),
(12, 'BAJFINANCE', 'Bajaj Finance Ltd', 7210.00, 7065.00, 7100.00, 7280.00, 7050.00, 145.00, 2.05, 1, '890K', 'Finance'),
(13, 'SUNPHARMA', 'Sun Pharmaceutical Ltd', 1872.00, 1849.50, 1855.00, 1890.00, 1845.00, 22.50, 1.22, 1, '1.8M', 'Pharma'),
(14, 'MARUTI', 'Maruti Suzuki India', 12340.00, 12450.00, 12400.00, 12520.00, 12280.00, -110.00, -0.88, 0, '420K', 'Automobile'),
(15, 'ASIANPAINT', 'Asian Paints Ltd', 2890.00, 2855.00, 2860.00, 2915.00, 2850.00, 35.00, 1.23, 1, '950K', 'Consumer Goods');

CREATE TABLE IF NOT EXISTS otp_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(150) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    action_type ENUM('registration', 'login', 'transaction') NOT NULL,
    expires_at DATETIME NOT NULL,
    is_verified TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_identifier (identifier),
    INDEX idx_otp (otp_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;