<?php
// api/get_orders.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once __DIR__ . '/../config/db.php';

$user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 1;
$response = ['success' => false, 'data' => [], 'message' => ''];

try {
    $query = "SELECT * FROM orders WHERE user_id = $user_id ORDER BY created_at DESC, id DESC";
    $result = mysqli_query($conn, $query);

    $orders = [];
    if ($result) {
        while ($row = mysqli_fetch_assoc($result)) {
            $created_ts = strtotime($row['created_at']);
            $orders[] = [
                'id' => (string)$row['id'],
                'symbol' => $row['stock_symbol'],
                'type' => $row['order_type'],
                'qty' => (int)$row['quantity'],
                'price' => number_format((float)$row['price'], 2),
                'raw_price' => (float)$row['price'],
                'status' => $row['status'],
                'time' => date('h:i A', $created_ts),
                'date' => date('d M Y', $created_ts),
                'created_at' => $row['created_at']
            ];
        }
    }

    $response['success'] = true;
    $response['data'] = $orders;
    $response['message'] = "Orders fetched successfully.";
} catch (Exception $e) {
    $response['message'] = "Error: " . $e->getMessage();
}

echo json_encode($response);
?>
