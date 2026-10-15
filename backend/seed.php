<?php
// seed.php - One-click Database Seeder
require_once 'config/db.php';

$sqlFile = __DIR__ . '/schema.sql';
if (!file_exists($sqlFile)) {
    die("<h3>Error: schema.sql not found at " . htmlspecialchars($sqlFile) . "</h3>");
}

$sql = file_get_contents($sqlFile);

echo "<!DOCTYPE html><html><head><title>Database Seeder - Infinity Global</title>";
echo "<style>body{background:#090E1A;color:#FFF;font-family:sans-serif;padding:40px;line-height:1.6;} .card{background:#1E293B;padding:24px;border-radius:12px;max-width:600px;margin:0 auto;border:1px solid #38BDF8;} h2{color:#38BDF8;} .badge{background:#10B981;color:#fff;padding:4px 10px;border-radius:6px;font-weight:bold;} a{color:#38BDF8;font-weight:bold;text-decoration:none;}</style>";
echo "</head><body><div class='card'>";
echo "<h2>∞ Infinity Global Capital - DB Seeder</h2>";

if (mysqli_multi_query($conn, $sql)) {
    do {
        if ($result = mysqli_store_result($conn)) {
            mysqli_free_result($result);
        }
    } while (mysqli_more_results($conn) && mysqli_next_result($conn));

    echo "<p><span class='badge'>SUCCESS</span> Database tables reset and 12-16 dynamic records successfully seeded!</p>";
    echo "<ul>";
    echo "<li><b>Users:</b> 12 Registered Users</li>";
    echo "<li><b>KYC Details:</b> 12 User Verifications</li>";
    echo "<li><b>Wallets:</b> 12 Cash & Invested Accounts</li>";
    echo "<li><b>Transactions:</b> 16 Bank Passbook Rows</li>";
    echo "<li><b>Holdings:</b> 16 Portfolio Stocks</li>";
    echo "<li><b>Orders:</b> 16 Trading Orders</li>";
    echo "<li><b>Watchlist:</b> 15 Top Equities</li>";
    echo "</ul>";
    echo "<p><a href='admin/dashboard.php'>→ Go to Admin Dashboard</a> | <a href='admin/users.php'>→ Go to KYC & Users</a></p>";
} else {
    echo "<p style='color:#F87171;'><b>Failed:</b> " . mysqli_error($conn) . "</p>";
}

echo "</div></body></html>";
?>
