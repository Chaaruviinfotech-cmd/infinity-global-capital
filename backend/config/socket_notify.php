<?php
// backend/config/socket_notify.php
// Real-time WebSocket event broadcaster for PHP backend

if (!function_exists('broadcast_socket_event')) {
    /**
     * Broadcasts an event to the local Socket.IO server.
     * Non-blocking with 300ms timeout so main PHP process is never slowed down.
     *
     * @param string $event Event name (e.g. 'MARKET_PRICE_UPDATED', 'ORDER_PLACED', etc.)
     * @param array $data Event data payload
     * @param string|null $room Optional room target (e.g. 'user_1')
     * @return bool
     */
    function broadcast_socket_event($event, $data = [], $room = null) {
        $socket_url = 'https://igc-socket-server.onrender.com/api/broadcast';
        
        $body = [
            'event' => $event,
            'data' => $data,
            'room' => $room
        ];

        $payload = json_encode($body);

        $ch = curl_init($socket_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($payload)
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT_MS, 800);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT_MS, 500);
        curl_setopt($ch, CURLOPT_NOSIGNAL, 1);

        $result = @curl_exec($ch);
        $err = curl_errno($ch);
        curl_close($ch);

        return ($err === 0);
    }
}
?>
