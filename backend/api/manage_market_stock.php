<?php
// backend/api/manage_market_stock.php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    require_once __DIR__ . '/../config/db.php';
    require_once __DIR__ . '/../config/socket_notify.php';

    // Parse input from JSON body, _parts, urlencoded, or $_POST/$_REQUEST
    $input = $_POST;
    $raw_input = file_get_contents('php://input');
    if (!empty($raw_input)) {
        $json_data = json_decode($raw_input, true);
        if (is_array($json_data)) {
            if (isset($json_data['_parts']) && is_array($json_data['_parts'])) {
                foreach ($json_data['_parts'] as $part) {
                    if (isset($part[0]) && isset($part[1])) {
                        $input[$part[0]] = $part[1];
                    }
                }
            } else {
                $input = array_merge($input, $json_data);
            }
        } else if (strpos($raw_input, '=') !== false) {
            parse_str($raw_input, $parsed_raw);
            if (is_array($parsed_raw)) {
                $input = array_merge($input, $parsed_raw);
            }
        }
    }
    $input = array_merge($_REQUEST, $input);

    $action = isset($input['action']) ? strtolower(trim($input['action'])) : 'create';

    // Helper to ensure market_indices table exists with initial 3 indices
    function ensureMarketIndicesTable($conn) {
        $create_sql = "CREATE TABLE IF NOT EXISTS market_indices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE,
            value VARCHAR(50) NOT NULL,
            day_change VARCHAR(50) DEFAULT '0.00',
            day_change_percent VARCHAR(50) DEFAULT '0.00%',
            badge VARCHAR(30) DEFAULT 'NSE LIVE',
            color VARCHAR(30) DEFAULT '#10B981',
            is_up TINYINT(1) DEFAULT 1,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        mysqli_query($conn, $create_sql);

        $chk = mysqli_query($conn, "SELECT COUNT(*) as cnt FROM market_indices");
        if ($chk) {
            $row = mysqli_fetch_assoc($chk);
            if ((int)$row['cnt'] === 0) {
                mysqli_query($conn, "INSERT INTO market_indices (name, value, day_change, day_change_percent, badge, color, is_up) VALUES
                    ('NIFTY 50', '25,420.35', '+207.45', '+0.82%', 'NSE LIVE', '#10B981', 1),
                    ('SENSEX', '83,210.44', '+586.20', '+0.71%', 'BSE LIVE', '#2563EB', 1),
                    ('BANK NIFTY', '52,180.10', '+592.80', '+1.15%', 'NSE LIVE', '#8B5CF6', 1)
                ");
            }
        }
    }

    // ========================================================
    // ACTION: GET INDICES
    // ========================================================
    if ($action === 'get_indices') {
        ensureMarketIndicesTable($conn);
        $res = mysqli_query($conn, "SELECT * FROM market_indices ORDER BY id ASC");
        $indices = [];
        if ($res) {
            while ($row = mysqli_fetch_assoc($res)) {
                $indices[] = [
                    'id' => (int)$row['id'],
                    'name' => $row['name'],
                    'value' => $row['value'],
                    'day_change' => $row['day_change'],
                    'day_change_percent' => $row['day_change_percent'],
                    'badge' => $row['badge'],
                    'color' => $row['color'],
                    'is_up' => (int)$row['is_up'] === 1
                ];
            }
        }
        echo json_encode(['success' => true, 'data' => $indices]);
        exit;
    }

    // ========================================================
    // ACTION: UPDATE INDEX
    // ========================================================
    if ($action === 'update_index') {
        ensureMarketIndicesTable($conn);
        $index_id = isset($input['id']) ? (int)$input['id'] : 0;
        $name = isset($input['name']) ? trim($input['name']) : '';
        $value = isset($input['value']) ? trim($input['value']) : '';
        $day_change = isset($input['day_change']) ? trim($input['day_change']) : '0.00';
        $day_change_percent = isset($input['day_change_percent']) ? trim($input['day_change_percent']) : '0.00%';
        $badge = isset($input['badge']) ? trim($input['badge']) : 'NSE LIVE';
        $color = isset($input['color']) ? trim($input['color']) : '#10B981';

        if ($index_id <= 0 && empty($name)) {
            echo json_encode(['success' => false, 'message' => 'Index ID or Name is required.']);
            exit;
        }

        $lookup = $index_id > 0 ? "id = $index_id" : "name = '" . mysqli_real_escape_string($conn, $name) . "'";
        $is_up = (strpos($day_change_percent, '-') === false && floatval($day_change) >= 0) ? 1 : 0;

        $safe_val = mysqli_real_escape_string($conn, $value);
        $safe_chg = mysqli_real_escape_string($conn, $day_change);
        $safe_pct = mysqli_real_escape_string($conn, $day_change_percent);
        $safe_badge = mysqli_real_escape_string($conn, $badge);
        $safe_color = mysqli_real_escape_string($conn, $color);

        $upd_sql = "UPDATE market_indices SET 
            value = '$safe_val',
            day_change = '$safe_chg',
            day_change_percent = '$safe_pct',
            badge = '$safe_badge',
            color = '$safe_color',
            is_up = $is_up,
            updated_at = NOW()
            WHERE $lookup";

        if (mysqli_query($conn, $upd_sql)) {
            $updated = mysqli_fetch_assoc(mysqli_query($conn, "SELECT * FROM market_indices WHERE $lookup LIMIT 1"));
            
            // Broadcast instant update to all Web and Mobile clients
            broadcast_socket_event('MARKET_INDEX_UPDATED', [
                'name' => $updated['name'],
                'value' => $updated['value'],
                'day_change' => $updated['day_change'],
                'change' => $updated['day_change_percent'],
                'badge' => $updated['badge'],
                'is_up' => (bool)$updated['is_up']
            ]);

            echo json_encode([
                'success' => true,
                'message' => "Market Index {$updated['name']} updated to {$updated['value']} successfully.",
                'data' => $updated
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update index: ' . mysqli_error($conn)]);
        }
        exit;
    }

    // ========================================================
    // ACTION: DELETE
    // ========================================================
    if ($action === 'delete') {
        $stock_id = isset($input['id']) ? (int)$input['id'] : (isset($input['stock_id']) ? (int)$input['stock_id'] : 0);
        $symbol = isset($input['symbol']) ? strtoupper(trim($input['symbol'])) : '';

        if ($stock_id <= 0 && empty($symbol)) {
            echo json_encode(['success' => false, 'message' => 'Stock ID or Symbol is required to delete.']);
            exit;
        }

        if ($stock_id > 0) {
            $del_sql = "DELETE FROM watchlist_stocks WHERE id = $stock_id";
        } else {
            $safe_sym = mysqli_real_escape_string($conn, $symbol);
            $del_sql = "DELETE FROM watchlist_stocks WHERE symbol = '$safe_sym'";
        }

        if (mysqli_query($conn, $del_sql) && mysqli_affected_rows($conn) > 0) {
            echo json_encode(['success' => true, 'message' => 'Stock deleted successfully from market registry.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Stock not found or could not be deleted.']);
        }
        exit;
    }

    // ========================================================
    // ACTION: UPDATE
    // ========================================================
    if ($action === 'update') {
        $stock_id = isset($input['id']) ? (int)$input['id'] : (isset($input['stock_id']) ? (int)$input['stock_id'] : 0);
        $symbol = isset($input['symbol']) ? strtoupper(trim($input['symbol'])) : '';

        if ($stock_id <= 0 && empty($symbol)) {
            echo json_encode(['success' => false, 'message' => 'Stock ID or Symbol is required to update.']);
            exit;
        }

        $lookup = $stock_id > 0 ? "id = $stock_id" : "symbol = '" . mysqli_real_escape_string($conn, $symbol) . "'";
        $check_res = mysqli_query($conn, "SELECT * FROM watchlist_stocks WHERE $lookup LIMIT 1");
        if (!$check_res || mysqli_num_rows($check_res) === 0) {
            echo json_encode(['success' => false, 'message' => 'Stock not found in registry.']);
            exit;
        }
        $existing = mysqli_fetch_assoc($check_res);
        $target_id = (int)$existing['id'];

        $company_name = isset($input['company_name']) && trim($input['company_name']) !== '' 
            ? mysqli_real_escape_string($conn, trim($input['company_name'])) 
            : mysqli_real_escape_string($conn, $existing['company_name']);

        $sector = isset($input['sector']) && trim($input['sector']) !== '' 
            ? mysqli_real_escape_string($conn, trim($input['sector'])) 
            : (isset($input['category']) && trim($input['category']) !== '' 
                ? mysqli_real_escape_string($conn, trim($input['category'])) 
                : mysqli_real_escape_string($conn, $existing['sector']));

        $current_price = isset($input['current_price']) && floatval($input['current_price']) > 0 
            ? floatval($input['current_price']) 
            : floatval($existing['current_price']);

        $prev_close = isset($input['prev_close']) && floatval($input['prev_close']) > 0 
            ? floatval($input['prev_close']) 
            : (floatval($existing['prev_close']) > 0 ? floatval($existing['prev_close']) : $current_price);

        if (isset($input['day_change']) && $input['day_change'] !== '') {
            $day_change = floatval($input['day_change']);
            $day_change_percent = isset($input['day_change_percent']) ? floatval($input['day_change_percent']) : ($prev_close > 0 ? round(($day_change / $prev_close) * 100, 2) : 0.00);
        } else {
            $day_change = round($current_price - $prev_close, 2);
            $day_change_percent = $prev_close > 0 ? round(($day_change / $prev_close) * 100, 2) : 0.00;
        }

        $high_price = isset($input['high_price']) ? floatval($input['high_price']) : max($current_price, floatval($existing['high_price']));
        $low_price = isset($input['low_price']) ? floatval($input['low_price']) : min($current_price, floatval($existing['low_price']) > 0 ? floatval($existing['low_price']) : $current_price);
        $is_up = ($day_change >= 0) ? 1 : 0;
        $volume = isset($input['volume']) ? mysqli_real_escape_string($conn, trim($input['volume'])) : $existing['volume'];

        $upd_sql = "UPDATE watchlist_stocks SET 
            company_name = '$company_name',
            sector = '$sector',
            current_price = $current_price,
            prev_close = $prev_close,
            high_price = $high_price,
            low_price = $low_price,
            day_change = $day_change,
            day_change_percent = $day_change_percent,
            is_up = $is_up,
            volume = '$volume',
            updated_at = NOW()
            WHERE id = $target_id";

        if (mysqli_query($conn, $upd_sql)) {
            $updated = mysqli_fetch_assoc(mysqli_query($conn, "SELECT * FROM watchlist_stocks WHERE id = $target_id"));
            
            // Broadcast real-time stock price change to Mobile & Web
            broadcast_socket_event('MARKET_PRICE_UPDATED', [
                'id' => (int)$updated['id'],
                'symbol' => $updated['symbol'],
                'name' => $updated['company_name'],
                'company_name' => $updated['company_name'],
                'sector' => $updated['sector'],
                'current_price' => (float)$updated['current_price'],
                'price' => number_format((float)$updated['current_price'], 2),
                'day_change' => (float)$updated['day_change'],
                'day_change_percent' => (float)$updated['day_change_percent'],
                'gain' => ($updated['day_change'] >= 0 ? '+' : '') . number_format((float)$updated['day_change_percent'], 2) . '%',
                'change' => ($updated['day_change'] >= 0 ? '+' : '') . number_format((float)$updated['day_change'], 2),
                'is_up' => (bool)$updated['is_up'],
                'volume' => $updated['volume']
            ]);

            echo json_encode([
                'success' => true,
                'message' => "Stock {$updated['symbol']} updated successfully.",
                'data' => $updated
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update stock: ' . mysqli_error($conn)]);
        }
        exit;
    }

    // ========================================================
    // ACTION: CREATE (DEFAULT)
    // ========================================================
    $symbol = isset($input['symbol']) ? strtoupper(trim((string)$input['symbol'])) : '';
    $company_name = isset($input['company_name']) ? trim((string)$input['company_name']) : '';
    $current_price = isset($input['current_price']) ? floatval($input['current_price']) : (isset($input['price']) ? floatval($input['price']) : 0);

    if (empty($symbol)) {
        echo json_encode(['success' => false, 'message' => 'Stock symbol is required (e.g. RELIANCE, TCS).']);
        exit;
    }
    if (empty($company_name)) {
        $company_name = $symbol . ' Ltd';
    }
    if ($current_price <= 0) {
        echo json_encode(['success' => false, 'message' => 'Current price must be greater than 0.']);
        exit;
    }

    $safe_symbol = mysqli_real_escape_string($conn, $symbol);
    $check_dup = mysqli_query($conn, "SELECT id FROM watchlist_stocks WHERE symbol = '$safe_symbol' LIMIT 1");
    if ($check_dup && mysqli_num_rows($check_dup) > 0) {
        echo json_encode(['success' => false, 'message' => "Stock symbol '{$symbol}' already exists. Please edit it or choose a different symbol."]);
        exit;
    }

    $sector = isset($input['sector']) && trim($input['sector']) !== '' 
        ? mysqli_real_escape_string($conn, trim($input['sector'])) 
        : (isset($input['category']) && trim($input['category']) !== '' 
            ? mysqli_real_escape_string($conn, trim($input['category'])) 
            : 'Equities');

    $prev_close = isset($input['prev_close']) && floatval($input['prev_close']) > 0 
        ? floatval($input['prev_close']) 
        : $current_price;

    $open_price = isset($input['open_price']) && floatval($input['open_price']) > 0 
        ? floatval($input['open_price']) 
        : $prev_close;

    if (isset($input['day_change']) && $input['day_change'] !== '') {
        $day_change = floatval($input['day_change']);
        $day_change_percent = isset($input['day_change_percent']) ? floatval($input['day_change_percent']) : ($prev_close > 0 ? round(($day_change / $prev_close) * 100, 2) : 0.00);
    } else {
        $day_change = round($current_price - $prev_close, 2);
        $day_change_percent = $prev_close > 0 ? round(($day_change / $prev_close) * 100, 2) : 0.00;
    }

    $high_price = isset($input['high_price']) && floatval($input['high_price']) > 0 
        ? floatval($input['high_price']) 
        : max($current_price, $prev_close);

    $low_price = isset($input['low_price']) && floatval($input['low_price']) > 0 
        ? floatval($input['low_price']) 
        : min($current_price, $prev_close);

    $is_up = ($day_change >= 0) ? 1 : 0;
    $volume = isset($input['volume']) && trim($input['volume']) !== '' ? mysqli_real_escape_string($conn, trim($input['volume'])) : '1.5M';
    $safe_company = mysqli_real_escape_string($conn, $company_name);

    $insert_sql = "INSERT INTO watchlist_stocks (
        symbol, company_name, current_price, prev_close, open_price, high_price, low_price, day_change, day_change_percent, is_up, volume, sector, updated_at
    ) VALUES (
        '$safe_symbol', '$safe_company', $current_price, $prev_close, $open_price, $high_price, $low_price, $day_change, $day_change_percent, $is_up, '$volume', '$sector', NOW()
    )";

    if (mysqli_query($conn, $insert_sql)) {
        $new_id = mysqli_insert_id($conn);
        $new_stock = mysqli_fetch_assoc(mysqli_query($conn, "SELECT * FROM watchlist_stocks WHERE id = $new_id"));

        // Broadcast new stock addition
        broadcast_socket_event('MARKET_PRICE_UPDATED', [
            'id' => (int)$new_stock['id'],
            'symbol' => $new_stock['symbol'],
            'name' => $new_stock['company_name'],
            'company_name' => $new_stock['company_name'],
            'sector' => $new_stock['sector'],
            'current_price' => (float)$new_stock['current_price'],
            'price' => number_format((float)$new_stock['current_price'], 2),
            'day_change' => (float)$new_stock['day_change'],
            'day_change_percent' => (float)$new_stock['day_change_percent'],
            'gain' => ($new_stock['day_change'] >= 0 ? '+' : '') . number_format((float)$new_stock['day_change_percent'], 2) . '%',
            'change' => ($new_stock['day_change'] >= 0 ? '+' : '') . number_format((float)$new_stock['day_change'], 2),
            'is_up' => (bool)$new_stock['is_up'],
            'volume' => $new_stock['volume']
        ]);

        echo json_encode([
            'success' => true,
            'message' => "Stock '{$symbol}' added successfully to market registry.",
            'data' => $new_stock
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to create stock: ' . mysqli_error($conn)]);
    }

} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
?>
