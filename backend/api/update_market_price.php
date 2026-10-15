<?php
// backend/api/update_market_price.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';

$response = [
    'success' => false,
    'message' => '',
    'data' => null
];

try {
    $input = $_POST;
    $raw = file_get_contents('php://input');
    if (!empty($raw)) {
        $json = json_decode($raw, true);
        if (is_array($json)) {
            $input = array_merge($input, $json);
        }
    }

    $symbol = isset($input['symbol']) ? strtoupper(trim($input['symbol'])) : '';
    $stock_id = isset($input['id']) ? intval($input['id']) : (isset($input['stock_id']) ? intval($input['stock_id']) : 0);

    if ($stock_id <= 0 && empty($symbol)) {
        $response['message'] = "Stock ID or Symbol is required.";
        echo json_encode($response);
        exit;
    }

    if ($stock_id > 0) {
        $query = "SELECT * FROM watchlist_stocks WHERE id = $stock_id";
    } else {
        $safe_sym = mysqli_real_escape_string($conn, $symbol);
        $query = "SELECT * FROM watchlist_stocks WHERE symbol = '$safe_sym'";
    }

    $res = mysqli_query($conn, $query);
    if (!$res || mysqli_num_rows($res) === 0) {
        $response['message'] = "Stock not found in market registry.";
        echo json_encode($response);
        exit;
    }

    $stock = mysqli_fetch_assoc($res);
    $target_id = (int)$stock['id'];
    $target_symbol = $stock['symbol'];

    if (!isset($input['current_price']) && !isset($input['price'])) {
        // Just return current stock details
        $response['success'] = true;
        $response['message'] = "Stock details retrieved.";
        $response['data'] = $stock;
        echo json_encode($response);
        exit;
    }

    $new_price = isset($input['current_price']) ? floatval($input['current_price']) : floatval($input['price']);
    if ($new_price <= 0) {
        $response['message'] = "Price must be greater than 0.";
        echo json_encode($response);
        exit;
    }

    $prev_close = isset($input['prev_close']) && $input['prev_close'] !== '' ? floatval($input['prev_close']) : floatval($stock['prev_close']);
    if ($prev_close <= 0) {
        $prev_close = floatval($stock['current_price']);
    }

    if (isset($input['day_change']) && $input['day_change'] !== '') {
        $day_change = floatval($input['day_change']);
        $day_change_percent = isset($input['day_change_percent']) ? floatval($input['day_change_percent']) : ($prev_close > 0 ? round(($day_change / $prev_close) * 100, 2) : 0.00);
    } else {
        $day_change = round($new_price - $prev_close, 2);
        $day_change_percent = $prev_close > 0 ? round(($day_change / $prev_close) * 100, 2) : 0.00;
    }

    $is_up = ($day_change >= 0) ? 1 : 0;
    $high_price = isset($input['high_price']) ? floatval($input['high_price']) : max($new_price, floatval($stock['high_price']));
    $low_price = isset($input['low_price']) ? floatval($input['low_price']) : min($new_price, floatval($stock['low_price']) > 0 ? floatval($stock['low_price']) : $new_price);

    $upd = "UPDATE watchlist_stocks SET 
            current_price = $new_price,
            prev_close = $prev_close,
            high_price = $high_price,
            low_price = $low_price,
            day_change = $day_change,
            day_change_percent = $day_change_percent,
            is_up = $is_up,
            updated_at = NOW()
            WHERE id = $target_id";

    if (mysqli_query($conn, $upd)) {
        $response['success'] = true;
        $response['message'] = "Market price for $target_symbol updated to ₹" . number_format($new_price, 2);
        $response['data'] = [
            'id' => $target_id,
            'symbol' => $target_symbol,
            'current_price' => $new_price,
            'prev_close' => $prev_close,
            'day_change' => $day_change,
            'day_change_percent' => $day_change_percent,
            'is_up' => $is_up,
            'high_price' => $high_price,
            'low_price' => $low_price,
            'updated_at' => date('Y-m-d H:i:s')
        ];
    } else {
        $response['message'] = "Database error: " . mysqli_error($conn);
    }
} catch (Exception $e) {
    $response['message'] = "Server error: " . $e->getMessage();
}

echo json_encode($response);
