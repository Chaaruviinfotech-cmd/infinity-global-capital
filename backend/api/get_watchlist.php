<?php
// api/get_watchlist.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once __DIR__ . '/../config/db.php';

$category = isset($_GET['category']) ? trim($_GET['category']) : 'All';
$search = isset($_GET['search']) ? trim($_GET['search']) : '';

$response = ['success' => false, 'data' => [], 'message' => ''];

try {
    // Ensure table exists and has initial stocks if empty
    $tbl_chk = mysqli_query($conn, "SHOW TABLES LIKE 'watchlist_stocks'");
    if (!$tbl_chk || mysqli_num_rows($tbl_chk) == 0) {
        mysqli_query($conn, "CREATE TABLE IF NOT EXISTS watchlist_stocks (
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
            category VARCHAR(50) DEFAULT 'Equities',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }

    // Ensure category column exists
    $col_cat = mysqli_query($conn, "SHOW COLUMNS FROM watchlist_stocks LIKE 'category'");
    if ($col_cat && mysqli_num_rows($col_cat) == 0) {
        @mysqli_query($conn, "ALTER TABLE watchlist_stocks ADD COLUMN category VARCHAR(50) DEFAULT 'Equities'");
        @mysqli_query($conn, "UPDATE watchlist_stocks SET category = sector");
    }

    $cnt_chk = mysqli_query($conn, "SELECT COUNT(*) as cnt FROM watchlist_stocks");
    $cnt_row = ($cnt_chk) ? mysqli_fetch_assoc($cnt_chk) : null;
    if (!$cnt_row || (int)$cnt_row['cnt'] === 0) {
        $ins = mysqli_query($conn, "INSERT INTO watchlist_stocks (symbol, company_name, current_price, prev_close, open_price, high_price, low_price, day_change, day_change_percent, is_up, volume, sector, category) VALUES
            ('AJ', 'AJ Ltd', 2400.00, 2300.00, 2345.00, 2420.00, 2330.00, 100.00, 4.35, 1, '3.5M', 'Banking', 'Banking'),
            ('RELIANCE', 'Reliance Industries Ltd', 2942.50, 2904.30, 2924.00, 2955.00, 2915.00, 38.20, 1.31, 1, '7.2M', 'Energy', 'Energy'),
            ('TCS', 'Tata Consultancy Services', 4215.80, 4167.20, 4208.00, 4235.00, 4195.00, 48.60, 1.17, 1, '3.4M', 'IT Tech', 'IT Tech'),
            ('HDFCBANK', 'HDFC Bank Ltd', 1682.40, 1694.70, 1696.00, 1702.00, 1678.00, -12.30, -0.73, 0, '9.1M', 'Banking', 'Banking'),
            ('INFY', 'Infosys Limited', 1945.20, 1918.40, 1940.00, 1960.00, 1932.00, 26.80, 1.40, 1, '5.8M', 'IT Tech', 'IT Tech'),
            ('TATAMOTORS', 'Tata Motors Ltd', 968.50, 950.30, 964.00, 978.00, 956.00, 18.20, 1.91, 1, '11.4M', 'Automobile', 'Automobile'),
            ('ICICIBANK', 'ICICI Bank Ltd', 1245.00, 1229.40, 1235.00, 1260.00, 1225.00, 15.60, 1.27, 1, '5.1M', 'Banking', 'Banking')
        ");
        if (!$ins) {
            $response['db_error'] = mysqli_error($conn);
        }
    }

    $whereClauses = [];

    if ($category !== 'All' && !empty($category)) {
        if ($category === 'Banking') {
            $whereClauses[] = "sector LIKE '%Bank%'";
        } elseif ($category === 'IT Tech') {
            $whereClauses[] = "sector LIKE '%IT%'";
        } elseif ($category === 'Automobile') {
            $whereClauses[] = "sector LIKE '%Auto%'";
        } elseif ($category === 'Energy') {
            $whereClauses[] = "sector LIKE '%Energy%'";
        } elseif ($category === 'Pharma') {
            $whereClauses[] = "sector LIKE '%Pharma%'";
        }
    }

    if (!empty($search)) {
        $safeSearch = mysqli_real_escape_string($conn, $search);
        $whereClauses[] = "(symbol LIKE '%$safeSearch%' OR company_name LIKE '%$safeSearch%')";
    }

    $sql = "SELECT * FROM watchlist_stocks";
    if (count($whereClauses) > 0) {
        $sql .= " WHERE " . implode(' AND ', $whereClauses);
    }
    $sql .= " ORDER BY current_price DESC";

    $res = mysqli_query($conn, $sql);
    $stocks = [];

    if ($res) {
        while ($row = mysqli_fetch_assoc($res)) {
            $stocks[] = [
                'id' => (int)$row['id'],
                'symbol' => $row['symbol'],
                'name' => $row['company_name'],
                'company_name' => $row['company_name'],
                'sector' => $row['sector'],
                'current_price' => (float)$row['current_price'],
                'price' => number_format((float)$row['current_price'], 2),
                'prev_close' => isset($row['prev_close']) ? (float)$row['prev_close'] : (float)$row['current_price'],
                'prev_close_formatted' => isset($row['prev_close']) ? number_format((float)$row['prev_close'], 2) : number_format((float)$row['current_price'], 2),
                'open_price' => isset($row['open_price']) ? (float)$row['open_price'] : (float)$row['current_price'],
                'high_price' => isset($row['high_price']) ? (float)$row['high_price'] : (float)$row['current_price'],
                'low_price' => isset($row['low_price']) ? (float)$row['low_price'] : (float)$row['current_price'],
                'day_change' => (float)$row['day_change'],
                'change' => ($row['day_change'] >= 0 ? '+' : '') . number_format((float)$row['day_change'], 2),
                'day_change_percent' => (float)$row['day_change_percent'],
                'changePercent' => ($row['day_change_percent'] >= 0 ? '+' : '') . number_format((float)$row['day_change_percent'], 2) . '%',
                'isUp' => (bool)$row['is_up'],
                'is_up' => (int)$row['is_up'],
                'volume' => isset($row['volume']) ? $row['volume'] : '1.2M',
                'updated_at' => isset($row['updated_at']) ? $row['updated_at'] : date('Y-m-d H:i:s')
            ];
        }
    }

    $response['success'] = true;
    $response['data'] = $stocks;
    $response['message'] = "Watchlist fetched successfully.";
} catch (Exception $e) {
    $response['message'] = "Error: " . $e->getMessage();
}

echo json_encode($response);
?>
