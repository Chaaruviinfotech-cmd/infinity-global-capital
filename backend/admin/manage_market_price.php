<?php
// backend/admin/manage_market_price.php
require_once __DIR__ . '/../config/db.php';

// Check auth unless in local preview mode
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    if (!isset($_GET['preview']) || $_GET['preview'] !== '1') {
        if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) || (isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false)) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Unauthorized access. Please log in.']);
            exit;
        }
        header("Location: index.php");
        exit;
    }
}

$is_ajax = (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') 
            || (isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false)
            || (isset($_POST['ajax']) && $_POST['ajax'] == '1');

// Handle JSON input body if sent via fetch/axios
$input = $_POST;
$raw = file_get_contents('php://input');
if (!empty($raw)) {
    $json = json_decode($raw, true);
    if (is_array($json)) {
        $input = array_merge($input, $json);
        $is_ajax = true;
    }
}

$action = isset($input['action']) ? trim($input['action']) : 'update_price';

if ($action === 'update_price') {
    $stock_id = isset($input['stock_id']) ? intval($input['stock_id']) : 0;
    $symbol = isset($input['symbol']) ? trim($input['symbol']) : '';
    
    // Look up stock
    if ($stock_id > 0) {
        $check = mysqli_query($conn, "SELECT * FROM watchlist_stocks WHERE id = $stock_id");
    } elseif (!empty($symbol)) {
        $safe_sym = mysqli_real_escape_string($conn, strtoupper($symbol));
        $check = mysqli_query($conn, "SELECT * FROM watchlist_stocks WHERE symbol = '$safe_sym'");
    } else {
        $check = false;
    }

    if (!$check || mysqli_num_rows($check) === 0) {
        if ($is_ajax) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Stock not found.']);
            exit;
        }
        header("Location: markets.php?status=error&msg=" . urlencode('Stock not found.'));
        exit;
    }

    $existing = mysqli_fetch_assoc($check);
    $stock_id = (int)$existing['id'];
    $symbol = $existing['symbol'];

    $current_price = isset($input['current_price']) ? floatval($input['current_price']) : floatval($existing['current_price']);
    $prev_close = isset($input['prev_close']) && $input['prev_close'] !== '' ? floatval($input['prev_close']) : floatval($existing['prev_close']);
    
    if ($prev_close <= 0) {
        $prev_close = $current_price;
    }

    $auto_calc = isset($input['auto_calc']) ? (int)$input['auto_calc'] : 1;

    if ($auto_calc === 1 || !isset($input['day_change']) || $input['day_change'] === '') {
        $day_change = round($current_price - $prev_close, 2);
        $day_change_percent = $prev_close > 0 ? round(($day_change / $prev_close) * 100, 2) : 0.00;
    } else {
        $day_change = floatval($input['day_change']);
        $day_change_percent = isset($input['day_change_percent']) ? floatval($input['day_change_percent']) : ($prev_close > 0 ? round(($day_change / $prev_close) * 100, 2) : 0.00);
    }

    $is_up = ($day_change >= 0) ? 1 : 0;

    $high_price = isset($input['high_price']) && $input['high_price'] !== '' ? floatval($input['high_price']) : max($current_price, floatval($existing['high_price']), $prev_close);
    $low_price = isset($input['low_price']) && $input['low_price'] !== '' ? floatval($input['low_price']) : min($current_price, floatval($existing['low_price']) > 0 ? floatval($existing['low_price']) : $current_price, $prev_close);
    
    // Ensure high is >= low
    if ($high_price < $current_price) $high_price = $current_price;
    if ($low_price > $current_price || $low_price <= 0) $low_price = $current_price;

    $sector = isset($input['sector']) && !empty(trim($input['sector'])) ? mysqli_real_escape_string($conn, trim($input['sector'])) : mysqli_real_escape_string($conn, $existing['sector']);
    $company_name = isset($input['company_name']) && !empty(trim($input['company_name'])) ? mysqli_real_escape_string($conn, trim($input['company_name'])) : mysqli_real_escape_string($conn, $existing['company_name']);

    $update_sql = "UPDATE watchlist_stocks SET 
                    company_name = '$company_name',
                    current_price = $current_price,
                    prev_close = $prev_close,
                    high_price = $high_price,
                    low_price = $low_price,
                    day_change = $day_change,
                    day_change_percent = $day_change_percent,
                    is_up = $is_up,
                    sector = '$sector',
                    updated_at = NOW()
                   WHERE id = $stock_id";

    if (mysqli_query($conn, $update_sql)) {
        $success_msg = "Price for {$symbol} updated successfully to ₹" . number_format($current_price, 2) . " (" . ($is_up ? '+' : '') . number_format($day_change_percent, 2) . "%)";
        if ($is_ajax) {
            header('Content-Type: application/json');
            echo json_encode([
                'success' => true,
                'message' => $success_msg,
                'data' => [
                    'id' => $stock_id,
                    'symbol' => $symbol,
                    'company_name' => $company_name,
                    'current_price' => $current_price,
                    'prev_close' => $prev_close,
                    'high_price' => $high_price,
                    'low_price' => $low_price,
                    'day_change' => $day_change,
                    'day_change_percent' => $day_change_percent,
                    'is_up' => $is_up,
                    'sector' => $sector,
                    'price_formatted' => '₹' . number_format($current_price, 2),
                    'change_formatted' => ($is_up ? '+' : '') . number_format($day_change, 2) . ' (' . ($is_up ? '+' : '') . number_format($day_change_percent, 2) . '%)'
                ]
            ]);
            exit;
        }
        header("Location: markets.php?status=success&msg=" . urlencode($success_msg));
        exit;
    } else {
        $err = "Database error: " . mysqli_error($conn);
        if ($is_ajax) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => $err]);
            exit;
        }
        header("Location: markets.php?status=error&msg=" . urlencode($err));
        exit;
    }
} elseif ($action === 'add_stock') {
    $symbol = isset($input['symbol']) ? strtoupper(trim($input['symbol'])) : '';
    $company_name = isset($input['company_name']) ? trim($input['company_name']) : '';
    $current_price = isset($input['current_price']) ? floatval($input['current_price']) : 0.00;
    $prev_close = isset($input['prev_close']) && $input['prev_close'] !== '' ? floatval($input['prev_close']) : $current_price;
    $sector = isset($input['sector']) && !empty(trim($input['sector'])) ? trim($input['sector']) : 'General';

    if (empty($symbol) || empty($company_name) || $current_price <= 0) {
        $msg = "Please enter valid symbol, company name, and price greater than 0.";
        if ($is_ajax) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => $msg]);
            exit;
        }
        header("Location: markets.php?status=error&msg=" . urlencode($msg));
        exit;
    }

    $safe_symbol = mysqli_real_escape_string($conn, $symbol);
    $dup = mysqli_query($conn, "SELECT id FROM watchlist_stocks WHERE symbol = '$safe_symbol'");
    if ($dup && mysqli_num_rows($dup) > 0) {
        $msg = "Stock symbol '$symbol' already exists in the market watchlist.";
        if ($is_ajax) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => $msg]);
            exit;
        }
        header("Location: markets.php?status=error&msg=" . urlencode($msg));
        exit;
    }

    $day_change = round($current_price - $prev_close, 2);
    $day_change_percent = $prev_close > 0 ? round(($day_change / $prev_close) * 100, 2) : 0.00;
    $is_up = ($day_change >= 0) ? 1 : 0;
    $high_price = max($current_price, $prev_close);
    $low_price = min($current_price, $prev_close);
    $safe_company = mysqli_real_escape_string($conn, $company_name);
    $safe_sector = mysqli_real_escape_string($conn, $sector);

    $insert_sql = "INSERT INTO watchlist_stocks (symbol, company_name, current_price, prev_close, open_price, high_price, low_price, day_change, day_change_percent, is_up, volume, sector, updated_at) 
                   VALUES ('$safe_symbol', '$safe_company', $current_price, $prev_close, $prev_close, $high_price, $low_price, $day_change, $day_change_percent, $is_up, '1.5M', '$safe_sector', NOW())";

    if (mysqli_query($conn, $insert_sql)) {
        $new_id = mysqli_insert_id($conn);
        $success_msg = "Stock {$symbol} ({$company_name}) added to market successfully at ₹" . number_format($current_price, 2);
        if ($is_ajax) {
            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'message' => $success_msg, 'stock_id' => $new_id]);
            exit;
        }
        header("Location: markets.php?status=success&msg=" . urlencode($success_msg));
        exit;
    } else {
        $err = "Database error: " . mysqli_error($conn);
        if ($is_ajax) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => $err]);
            exit;
        }
        header("Location: markets.php?status=error&msg=" . urlencode($err));
        exit;
    }
} elseif ($action === 'delete_stock') {
    $stock_id = isset($input['stock_id']) ? intval($input['stock_id']) : 0;
    if ($stock_id <= 0) {
        $msg = "Invalid stock ID.";
        if ($is_ajax) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => $msg]);
            exit;
        }
        header("Location: markets.php?status=error&msg=" . urlencode($msg));
        exit;
    }

    $del = mysqli_query($conn, "DELETE FROM watchlist_stocks WHERE id = $stock_id");
    if ($del) {
        $msg = "Stock removed from market watchlist.";
        if ($is_ajax) {
            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'message' => $msg]);
            exit;
        }
        header("Location: markets.php?status=success&msg=" . urlencode($msg));
        exit;
    } else {
        $err = "Error: " . mysqli_error($conn);
        if ($is_ajax) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => $err]);
            exit;
        }
        header("Location: markets.php?status=error&msg=" . urlencode($err));
        exit;
    }
} else {
    if ($is_ajax) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Invalid action specified.']);
        exit;
    }
    header("Location: markets.php");
    exit;
}
