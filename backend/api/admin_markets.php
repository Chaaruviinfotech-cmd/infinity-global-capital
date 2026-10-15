<?php
// backend/api/admin_markets.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';

$response = [
    'success' => false,
    'data' => [],
    'stats' => null,
    'message' => ''
];

try {
    $category = isset($_REQUEST['category']) ? trim($_REQUEST['category']) : 'All';
    $search = isset($_REQUEST['search']) ? trim($_REQUEST['search']) : '';

    $where = [];
    if (!empty($category) && $category !== 'All') {
        $safe_cat = mysqli_real_escape_string($conn, $category);
        $where[] = "category = '$safe_cat'";
    }

    if (!empty($search)) {
        $safe_search = mysqli_real_escape_string($conn, $search);
        $where[] = "(symbol LIKE '%$safe_search%' OR company_name LIKE '%$safe_search%')";
    }

    $whereSql = !empty($where) ? "WHERE " . implode(' AND ', $where) : "";
    $query = "SELECT * FROM watchlist_stocks $whereSql ORDER BY symbol ASC";
    $result = mysqli_query($conn, $query);

    $stocks = [];
    $gainers = 0;
    $losers = 0;

    if ($result) {
        while ($row = mysqli_fetch_assoc($result)) {
            $change = (float)$row['day_change'];
            if ($change >= 0) $gainers++;
            else $losers++;

            $stocks[] = [
                'id' => (int)$row['id'],
                'symbol' => $row['symbol'],
                'company_name' => $row['company_name'],
                'category' => $row['category'] ?? 'Equities',
                'current_price' => (float)$row['current_price'],
                'previous_close' => (float)($row['previous_close'] ?? $row['current_price']),
                'day_change' => (float)$row['day_change'],
                'day_change_percent' => (float)$row['day_change_percent'],
                'day_high' => (float)($row['day_high'] ?? ($row['current_price'] * 1.02)),
                'day_low' => (float)($row['day_low'] ?? ($row['current_price'] * 0.98)),
                'week_52_high' => (float)($row['week_52_high'] ?? ($row['current_price'] * 1.25)),
                'week_52_low' => (float)($row['week_52_low'] ?? ($row['current_price'] * 0.75)),
                'volume' => $row['volume'] ?? '2.4M',
                'updated_at' => $row['updated_at'] ?? date('Y-m-d H:i:s')
            ];
        }
    }

    // Ensure and fetch market indices
    $indices = [];
    $idx_check = mysqli_query($conn, "SHOW TABLES LIKE 'market_indices'");
    if ($idx_check && mysqli_num_rows($idx_check) > 0) {
        $idx_res = mysqli_query($conn, "SELECT * FROM market_indices ORDER BY id ASC");
        if ($idx_res) {
            while ($idx_row = mysqli_fetch_assoc($idx_res)) {
                $indices[] = [
                    'id' => (int)$idx_row['id'],
                    'name' => $idx_row['name'],
                    'value' => $idx_row['value'],
                    'day_change' => $idx_row['day_change'],
                    'day_change_percent' => $idx_row['day_change_percent'],
                    'badge' => $idx_row['badge'] ?? 'NSE LIVE',
                    'color' => $idx_row['color'] ?? '#10B981',
                    'is_up' => (int)($idx_row['is_up'] ?? 1) === 1
                ];
            }
        }
    }

    if (empty($indices)) {
        $indices = [
            ['id' => 1, 'name' => 'NIFTY 50', 'value' => '25,420.35', 'day_change' => '+207.45', 'day_change_percent' => '+0.82%', 'badge' => 'NSE LIVE', 'color' => '#10B981', 'is_up' => true],
            ['id' => 2, 'name' => 'SENSEX', 'value' => '83,210.44', 'day_change' => '+586.20', 'day_change_percent' => '+0.71%', 'badge' => 'BSE LIVE', 'color' => '#2563EB', 'is_up' => true],
            ['id' => 3, 'name' => 'BANK NIFTY', 'value' => '52,180.10', 'day_change' => '+592.80', 'day_change_percent' => '+1.15%', 'badge' => 'NSE LIVE', 'color' => '#8B5CF6', 'is_up' => true]
        ];
    }

    $response['success'] = true;
    $response['data'] = $stocks;
    $response['indices'] = $indices;
    $response['stats'] = [
        'total' => count($stocks),
        'gainers' => $gainers,
        'losers' => $losers
    ];
    $response['message'] = "Market equities fetched successfully.";
} catch (Exception $e) {
    $response['message'] = "Error: " . $e->getMessage();
}

echo json_encode($response);
?>
