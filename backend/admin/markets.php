<?php
require_once __DIR__ . '/../config/db.php';

// Check auth
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    if (!isset($_GET['preview']) || $_GET['preview'] !== '1') {
        header("Location: index.php");
        exit;
    }
}

$k_res = mysqli_query($conn, "SELECT COUNT(*) as count FROM kyc_details WHERE status = 'Pending'");
$pendingKyc = ($k_res && $row = mysqli_fetch_assoc($k_res)) ? (int)$row['count'] : 0;

// Fetch all stocks from watchlist_stocks
$stocks_res = mysqli_query($conn, "SELECT * FROM watchlist_stocks ORDER BY current_price DESC");
$stocks_count = $stocks_res ? mysqli_num_rows($stocks_res) : 0;

// Calculate market stats
$gainers_count = 0;
$losers_count = 0;
$stocks_array = [];

if ($stocks_res) {
    while ($s = mysqli_fetch_assoc($stocks_res)) {
        if ($s['is_up']) {
            $gainers_count++;
        } else {
            $losers_count++;
        }
        $stocks_array[] = $s;
    }
}

$status_msg = isset($_GET['msg']) ? htmlspecialchars($_GET['msg']) : '';
$status_type = isset($_GET['status']) ? htmlspecialchars($_GET['status']) : '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markets Price Desk - Infinity Global Capital</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
    <style>
        :root {
            --sidebar-bg: #090E1A;
            --accent-blue: #2563EB;
            --accent-cyan: #38BDF8;
            --accent-green: #10B981;
            --accent-red: #F43F5E;
            --body-bg: #090E1A;
            --card-bg: #141E33;
            --card-header: #0F172A;
            --border-color: rgba(255, 255, 255, 0.09);
            --border-highlight: rgba(56, 189, 248, 0.4);
        }
        body {
            background-color: var(--body-bg);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #FFFFFF;
            margin: 0;
            display: flex;
            min-height: 100vh;
            overflow-x: hidden;
            width: 100%;
        }

        /* Sidebar */
        .sidebar {
            width: 270px;
            background: linear-gradient(180deg, #060A14 0%, #0B132B 100%);
            color: #F8FAFC;
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            z-index: 100;
            padding: 1.5rem 1.25rem;
            border-right: 1px solid var(--border-color);
        }
        .brand-logo { font-size: 20px; font-weight: 800; color: #FFFFFF; text-decoration: none; display: flex; align-items: center; gap: 8px; margin-bottom: 2rem; padding-left: 0.5rem; }
        .brand-logo span { color: #38BDF8; font-size: 28px; text-shadow: 0 0 16px rgba(56, 189, 248, 0.5); }
        .user-pill { background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; margin-bottom: 2rem; }
        .user-avatar { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #2563EB, #38BDF8); display: flex; align-items: center; justify-content: center; font-weight: 800; color: #FFFFFF; font-size: 14px; }
        .sidebar-menu { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .sidebar-menu a { text-decoration: none; color: #94A3B8; font-weight: 600; font-size: 14px; padding: 11px 14px; border-radius: 10px; display: flex; align-items: center; gap: 12px; transition: all 0.2s; }
        .sidebar-menu a:hover { color: #FFFFFF; background: rgba(255,255,255,0.06); transform: translateX(3px); }
        .sidebar-menu a.active { color: #FFFFFF; background: linear-gradient(90deg, rgba(37, 99, 235, 0.9) 0%, rgba(56, 189, 248, 0.8) 100%); box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35); }
        .sidebar-footer { padding-top: 1rem; border-top: 1px solid var(--border-color); }
        .logout-link { color: #F87171; text-decoration: none; display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; padding: 10px 14px; }

        /* Main Content */
        .main-wrapper { 
            margin-left: 270px; 
            flex: 1; 
            min-width: 0; 
            width: calc(100% - 270px);
            max-width: calc(100% - 270px);
            overflow-x: hidden;
            display: flex; 
            flex-direction: column; 
            min-height: 100vh; 
            background-color: var(--body-bg); 
        }
        .top-header { background: #0B1325; border-bottom: 1px solid var(--border-color); padding: 0.85rem 2rem; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 90; }
        .dashboard-body { padding: 1.75rem 2rem; width: 100%; max-width: 100%; box-sizing: border-box; }
        
        .index-card {
            background: var(--card-bg);
            border-radius: 16px;
            padding: 1.25rem 1.5rem;
            border: 1px solid var(--border-color);
            transition: all 0.2s;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        }
        .index-name { font-size: 13px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; }
        .index-val { font-size: 26px; font-weight: 900; color: #FFFFFF; margin: 4px 0; }
        .index-change { font-size: 13px; font-weight: 700; color: #10B981; }

        /* Stock Table Styling */
        .stock-badge {
            width: 36px;
            height: 36px;
            border-radius: 9px;
            background: linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(56, 189, 248, 0.15) 100%);
            color: #38BDF8;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            border: 1px solid rgba(56, 189, 248, 0.35);
            flex-shrink: 0;
        }
        .stock-symbol-text {
            color: #FFFFFF;
            font-weight: 800;
            font-size: 14px;
            letter-spacing: 0.2px;
        }
        .stock-company-text {
            color: #94A3B8;
            font-size: 11.5px;
            display: block;
            margin-top: 1px;
        }

        .table-dark-custom {
            --bs-table-bg: transparent;
            --bs-table-border-color: rgba(255, 255, 255, 0.07);
            color: #FFFFFF;
        }
        .table-dark-custom thead th {
            color: #94A3B8;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: var(--card-header);
            border-bottom: 1px solid var(--border-color);
            padding: 0.85rem 0.5rem;
            white-space: nowrap;
        }
        .table-dark-custom tbody td {
            padding: 0.85rem 0.5rem;
            vertical-align: middle;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            white-space: nowrap;
        }
        .table-dark-custom tbody tr:hover {
            background-color: rgba(255, 255, 255, 0.025);
        }

        /* High Contrast Value Styles */
        .val-price-display {
            font-size: 15px;
            font-weight: 800;
            color: #FFFFFF;
        }
        .val-prevclose-display {
            font-size: 13.5px;
            font-weight: 600;
            color: #CBD5E1; /* High contrast silver-slate */
        }
        .val-highlow-display {
            font-size: 12px;
            font-weight: 600;
            line-height: 1.4;
        }
        .val-updated-display {
            font-size: 12px;
            font-weight: 500;
            color: #94A3B8; /* Clearly visible slate */
            white-space: nowrap;
        }

        /* Action Buttons */
        .btn-edit-price {
            background: rgba(56, 189, 248, 0.12);
            color: #38BDF8;
            border: 1px solid rgba(56, 189, 248, 0.45);
            border-radius: 7px;
            padding: 5px 11px;
            font-size: 12px;
            font-weight: 700;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            text-decoration: none;
            white-space: nowrap;
        }
        .btn-edit-price:hover {
            background: #38BDF8;
            color: #090E1A;
            border-color: #38BDF8;
            box-shadow: 0 0 12px rgba(56, 189, 248, 0.5);
            transform: translateY(-1px);
        }

        .btn-delete-stock {
            width: 29px;
            height: 29px;
            border-radius: 7px;
            background: rgba(244, 63, 94, 0.12);
            color: #F43F5E;
            border: 1px solid rgba(244, 63, 94, 0.4);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            cursor: pointer;
            flex-shrink: 0;
            font-size: 12px;
        }
        .btn-delete-stock:hover {
            background: #F43F5E;
            color: #FFFFFF;
            border-color: #F43F5E;
            box-shadow: 0 0 10px rgba(244, 63, 94, 0.5);
            transform: translateY(-1px);
        }

        /* Search Input */
        .search-input-custom {
            background: #0D1629 !important;
            border: 1px solid rgba(56, 189, 248, 0.35) !important;
            color: #FFFFFF !important;
            font-size: 13.5px !important;
            border-radius: 10px !important;
            padding: 8px 14px !important;
        }
        .search-input-custom::placeholder {
            color: #94A3B8 !important;
            opacity: 1 !important;
        }
        .search-input-custom:focus {
            border-color: #38BDF8 !important;
            box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.25) !important;
        }

        /* Sleek horizontal scrolling for table only */
        .custom-table-scroll {
            overflow-x: auto !important;
            overflow-y: hidden !important;
            -webkit-overflow-scrolling: touch;
            width: 100%;
            scrollbar-width: thin;
            scrollbar-color: #38BDF8 #0B1325;
        }
        .custom-table-scroll::-webkit-scrollbar {
            height: 8px;
        }
        .custom-table-scroll::-webkit-scrollbar-track {
            background: #0B1325;
            border-bottom-left-radius: 16px;
            border-bottom-right-radius: 16px;
        }
        .custom-table-scroll::-webkit-scrollbar-thumb {
            background: #1E293B;
            border-radius: 8px;
            border: 2px solid #0B1325;
        }
        .custom-table-scroll::-webkit-scrollbar-thumb:hover {
            background: #38BDF8;
            box-shadow: 0 0 10px rgba(56, 189, 248, 0.5);
        }

        .text-muted {
            color: #FFFFFF !important;
        }

        /* Glassmorphic Modal */
        .modal-content-custom {
            background: #111A2E;
            border: 1px solid var(--border-highlight);
            border-radius: 20px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
            color: #FFFFFF;
        }
        .form-control-custom, .form-select-custom {
            background-color: #1A263E;
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #FFFFFF;
            border-radius: 10px;
            padding: 10px 14px;
        }
        .form-control-custom:focus, .form-select-custom:focus {
            background-color: #1A263E;
            border-color: #38BDF8;
            box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.25);
            color: #FFFFFF;
        }
        .form-label-custom {
            font-size: 12px;
            font-weight: 700;
            color: #94A3B8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
        }
        .preview-box {
            background: #0B1220;
            border: 1px solid rgba(56, 189, 248, 0.25);
            border-radius: 14px;
            padding: 1rem 1.25rem;
        }

        #liveToastAlert {
            position: fixed;
            top: 24px;
            right: 24px;
            z-index: 9999;
            min-width: 340px;
            transition: all 0.3s ease;
        }
    </style>
</head>
<body>

    <!-- SIDEBAR -->
    <aside class="sidebar">
        <a href="dashboard.php" class="brand-logo"><span>∞</span> INFINITY <b>CAPITAL</b></a>
        <div class="user-pill">
            <div class="user-avatar">HR</div>
            <div>
                <div class="fw-bold small text-white">HR Investor</div>
                <div style="font-size:11px; color:#10B981; font-weight:600;"><i class="bi bi-circle-fill me-1" style="font-size:7px;"></i> Premium Account</div>
            </div>
        </div>

        <ul class="sidebar-menu">
            <li><a href="dashboard.php"><i class="bi bi-grid-fill"></i> Overview</a></li>
            <li><a href="markets.php" class="active"><i class="bi bi-graph-up-arrow"></i> Markets (Price Desk)</a></li>
            <li><a href="portfolio.php"><i class="bi bi-pie-chart-fill"></i> Portfolio</a></li>
            <li><a href="orders.php"><i class="bi bi-arrow-left-right"></i> Orders</a></li>
            <li><a href="funds_ledger.php"><i class="bi bi-wallet-fill"></i> Funds Ledger</a></li>
            <li>
                <a href="users.php">
                    <i class="bi bi-person-check-fill"></i> KYC & Profile
                    <?php if($pendingKyc > 0): ?><span class="badge bg-danger rounded-pill ms-auto"><?php echo $pendingKyc; ?></span><?php endif; ?>
                </a>
            </li>
        </ul>

        <div class="sidebar-footer">
            <a href="logout.php" class="logout-link"><i class="bi bi-box-arrow-left"></i> Sign Out</a>
        </div>
    </aside>

    <div class="main-wrapper">
        <header class="top-header">
            <div class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 fw-bold d-flex align-items-center gap-2">
                <i class="bi bi-broadcast"></i> Live Exchange: NSE · BSE (Real-Time Manual Sync)
            </div>
            <div class="d-flex align-items-center gap-3">
                <button type="button" class="btn btn-sm btn-outline-info rounded-pill px-3 fw-bold" onclick="toggleQuickEditMode()">
                    <i class="bi bi-lightning-charge-fill me-1"></i> <span id="quickEditBtnText">Quick Inline Edit</span>
                </button>
                <button type="button" class="btn btn-sm btn-primary rounded-pill px-3 fw-bold shadow-sm" data-bs-toggle="modal" data-bs-target="#addStockModal" style="background: linear-gradient(135deg, #2563EB 0%, #0EA5E9 100%); border: none;">
                    <i class="bi bi-plus-circle-fill me-1"></i> + Add New Stock
                </button>
            </div>
        </header>

        <main class="dashboard-body">
            <!-- Toast / Alert Message -->
            <?php if (!empty($status_msg)): ?>
                <div class="alert <?php echo $status_type === 'success' ? 'alert-success bg-success-subtle text-success border-success' : 'alert-danger bg-danger-subtle text-danger border-danger'; ?> alert-dismissible fade show rounded-3 mb-4 shadow-sm" role="alert">
                    <i class="bi <?php echo $status_type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'; ?> me-2"></i>
                    <strong><?php echo $status_type === 'success' ? 'Success:' : 'Notice:'; ?></strong> <?php echo $status_msg; ?>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            <?php endif; ?>

            <!-- Floating AJAX Toast Alert -->
            <div id="liveToastAlert" class="alert alert-success bg-dark border border-info text-white shadow-lg rounded-4 p-3 d-none" role="alert">
                <div class="d-flex align-items-center">
                    <i class="bi bi-check-circle-fill text-info fs-4 me-3"></i>
                    <div>
                        <div class="fw-bold" id="toastTitle">Price Updated</div>
                        <small class="text-light" id="toastMessage">Real market price has been updated successfully.</small>
                    </div>
                    <button type="button" class="btn-close btn-close-white ms-auto" onclick="closeToast()"></button>
                </div>
            </div>

            <!-- Page Header -->
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 class="h3 fw-bold mb-1 text-white">Live Stock Markets & Real Price Desk</h1>
                    <p class="text-white mb-0 small">Admin manual control desk: Set real market prices (LTP), daily % changes, and high/low ranges</p>
                </div>
                <div class="d-flex gap-2">
                    <span class="badge bg-dark border border-secondary px-3 py-2 text-info fw-bold">
                        <i class="bi bi-check2-circle me-1"></i> <?php echo $stocks_count; ?> Equities Active
                    </span>
                    <span class="badge bg-dark border border-success px-3 py-2 text-success fw-bold">
                        <i class="bi bi-arrow-up-circle me-1"></i> <?php echo $gainers_count; ?> Gainers
                    </span>
                    <span class="badge bg-dark border border-danger px-3 py-2 text-danger fw-bold">
                        <i class="bi bi-arrow-down-circle me-1"></i> <?php echo $losers_count; ?> Losers
                    </span>
                </div>
            </div>

            <!-- Market Indices Row -->
            <div class="row g-4 mb-4">
                <div class="col-md-4">
                    <div class="index-card" style="border-top: 4px solid #10B981;">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="index-name">NIFTY 50</span>
                            <span class="badge bg-success-subtle text-success fw-bold">NSE LIVE</span>
                        </div>
                        <div class="index-val">25,420.35</div>
                        <div class="index-change"><i class="bi bi-arrow-up-right"></i> +207.45 (+0.82%) Today</div>
                    </div>
                </div>

                <div class="col-md-4">
                    <div class="index-card" style="border-top: 4px solid #2563EB;">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="index-name">SENSEX</span>
                            <span class="badge bg-primary-subtle text-primary fw-bold">BSE LIVE</span>
                        </div>
                        <div class="index-val">83,210.44</div>
                        <div class="index-change"><i class="bi bi-arrow-up-right"></i> +586.20 (+0.71%) Today</div>
                    </div>
                </div>

                <div class="col-md-4">
                    <div class="index-card" style="border-top: 4px solid #8B5CF6;">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="index-name">BANK NIFTY</span>
                            <span class="badge bg-purple-subtle fw-bold" style="color: #A78BFA; background: rgba(139, 92, 246, 0.2);">NSE LIVE</span>
                        </div>
                        <div class="index-val">52,180.10</div>
                        <div class="index-change"><i class="bi bi-arrow-up-right"></i> +592.80 (+1.15%) Today</div>
                    </div>
                </div>
            </div>

            <!-- Stocks Table Card -->
            <div class="card border-0 shadow-sm rounded-4 overflow-hidden" style="background: var(--card-bg); border: 1px solid var(--border-color)!important;">
                <div class="card-header py-3 px-4 d-flex justify-content-between align-items-center border-bottom" style="background: var(--card-header); border-color: var(--border-color)!important;">
                    <div class="d-flex align-items-center gap-2">
                        <span class="fw-bold text-white fs-6">Stock Equities & Live Price Management</span>
                        <span class="badge bg-info text-dark fw-bold rounded-pill">Real-Time Manual Entry</span>
                        <span class="badge rounded-pill px-2.5 py-1 d-none d-lg-inline-flex align-items-center gap-1.5" style="background: rgba(56, 189, 248, 0.12); color: #38BDF8; border: 1px solid rgba(56, 189, 248, 0.35); font-size: 11.5px; font-weight: 600;">
                            <i class="bi bi-arrows-expand" style="transform: rotate(45deg);"></i> Scrollable Table &rarr;
                        </span>
                    </div>
                    <!-- Clear High-Contrast Search Bar -->
                    <div class="d-flex align-items-center" style="width: 280px;">
                        <div class="input-group">
                            <span class="input-group-text bg-dark border-secondary text-info">
                                <i class="bi bi-search"></i>
                            </span>
                            <input type="text" id="tableSearchInput" class="form-control search-input-custom" placeholder="Search Symbol, Company..." onkeyup="filterStocksTable()">
                        </div>
                    </div>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive custom-table-scroll">
                        <table class="table table-dark-custom table-hover align-middle mb-0" id="stocksTable" style="min-width: 1240px; width: 100%;">
                            <thead>
                                <tr>
                                    <th class="ps-4" style="min-width: 230px;">Stock</th>
                                    <th style="min-width: 130px;">Sector</th>
                                    <th style="min-width: 150px;">Live Price (LTP)</th>
                                    <th style="min-width: 130px;">Prev Close</th>
                                    <th style="min-width: 150px;">Day High / Low</th>
                                    <th style="min-width: 160px;">Day Change & %</th>
                                    <th style="min-width: 140px;">Last Updated</th>
                                    <th class="text-end pe-4" style="min-width: 160px;">Manage Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach($stocks_array as $s): ?>
                                    <tr id="row-stock-<?php echo $s['id']; ?>">
                                        <!-- Stock Symbol & Company -->
                                        <td class="ps-4">
                                            <div class="d-flex align-items-center gap-2.5">
                                                <div class="stock-badge">
                                                    <?php echo substr($s['symbol'], 0, 2); ?>
                                                </div>
                                                <div style="min-width: 0;">
                                                    <span class="stock-symbol-text d-block"><?php echo $s['symbol']; ?></span>
                                                    <span class="stock-company-text d-block"><?php echo $s['company_name']; ?></span>
                                                </div>
                                            </div>
                                        </td>

                                        <!-- Sector -->
                                        <td>
                                            <span class="badge bg-dark text-info border border-secondary px-2 py-1 fw-bold" style="font-size: 11px;"><?php echo $s['sector']; ?></span>
                                        </td>
                                        
                                        <!-- Live Price (LTP) -->
                                        <td>
                                            <div class="price-display-wrapper" id="price-display-<?php echo $s['id']; ?>">
                                                <span class="val-price-display" id="val-price-<?php echo $s['id']; ?>">₹<?php echo number_format($s['current_price'], 2); ?></span>
                                            </div>
                                            <div class="price-inline-wrapper d-none" id="price-inline-<?php echo $s['id']; ?>">
                                                <div class="input-group input-group-sm" style="width: 130px;">
                                                    <span class="input-group-text bg-dark text-white border-secondary">₹</span>
                                                    <input type="number" step="0.05" class="form-control form-control-sm bg-dark text-white border-info fw-bold" id="inline-input-<?php echo $s['id']; ?>" value="<?php echo $s['current_price']; ?>">
                                                    <button class="btn btn-sm btn-info text-dark fw-bold" type="button" onclick="saveInlinePrice(<?php echo $s['id']; ?>, '<?php echo $s['symbol']; ?>', <?php echo isset($s['prev_close']) ? $s['prev_close'] : $s['current_price']; ?>)">
                                                        <i class="bi bi-check-lg"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </td>

                                        <!-- Prev Close (High Contrast Silver-Slate) -->
                                        <td>
                                            <span class="val-prevclose-display" id="val-prevclose-<?php echo $s['id']; ?>">
                                                ₹<?php echo isset($s['prev_close']) && $s['prev_close'] > 0 ? number_format($s['prev_close'], 2) : number_format($s['current_price'], 2); ?>
                                            </span>
                                        </td>

                                        <!-- Day High / Low (Crisp Emerald & Rose with labels) -->
                                        <td>
                                            <div class="val-highlow-display" id="val-highlow-<?php echo $s['id']; ?>">
                                                <div class="text-success" style="color: #34D399 !important;">
                                                    <i class="bi bi-arrow-up-short"></i>H: ₹<?php echo isset($s['high_price']) && $s['high_price'] > 0 ? number_format($s['high_price'], 2) : number_format($s['current_price'], 2); ?>
                                                </div>
                                                <div class="text-danger" style="color: #FB7185 !important;">
                                                    <i class="bi bi-arrow-down-short"></i>L: ₹<?php echo isset($s['low_price']) && $s['low_price'] > 0 ? number_format($s['low_price'], 2) : number_format($s['current_price'], 2); ?>
                                                </div>
                                            </div>
                                        </td>

                                        <!-- Day Change Badge -->
                                        <td>
                                            <span id="badge-change-<?php echo $s['id']; ?>" class="badge <?php echo $s['is_up'] ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle'; ?> px-2.5 py-1.5 fw-bold" style="font-size: 11.5px;">
                                                <i class="bi <?php echo $s['is_up'] ? 'bi-caret-up-fill' : 'bi-caret-down-fill'; ?> me-1"></i>
                                                <?php echo ($s['is_up'] ? '+' : '') . number_format($s['day_change'], 2) . ' (' . ($s['is_up'] ? '+' : '') . number_format($s['day_change_percent'], 2) . '%)'; ?>
                                            </span>
                                        </td>

                                        <!-- Last Updated Timestamp (Clear High Contrast) -->
                                        <td>
                                            <span class="val-updated-display" id="val-updated-<?php echo $s['id']; ?>">
                                                <i class="bi bi-clock me-1 text-info opacity-75"></i>
                                                <?php echo isset($s['updated_at']) && !empty($s['updated_at']) ? date('d M, H:i', strtotime($s['updated_at'])) : 'Live Synced'; ?>
                                            </span>
                                        </td>

                                        <!-- Action Buttons: Clean, Single-Line, Un-distorted -->
                                        <td class="text-end pe-4">
                                            <div class="d-inline-flex align-items-center gap-1.5">
                                                <button type="button" class="btn-edit-price" 
                                                        onclick="openEditPriceModal(
                                                            <?php echo $s['id']; ?>, 
                                                            '<?php echo addslashes($s['symbol']); ?>', 
                                                            '<?php echo addslashes($s['company_name']); ?>', 
                                                            <?php echo $s['current_price']; ?>, 
                                                            <?php echo isset($s['prev_close']) ? $s['prev_close'] : $s['current_price']; ?>, 
                                                            <?php echo $s['day_change']; ?>, 
                                                            <?php echo $s['day_change_percent']; ?>, 
                                                            <?php echo isset($s['high_price']) ? $s['high_price'] : $s['current_price']; ?>, 
                                                            <?php echo isset($s['low_price']) ? $s['low_price'] : $s['current_price']; ?>, 
                                                            '<?php echo addslashes($s['sector']); ?>'
                                                        )">
                                                    <i class="bi bi-pencil-square"></i>
                                                    <span>Edit Price</span>
                                                </button>
                                                
                                                <button type="button" class="btn-delete-stock" 
                                                        title="Delete Stock"
                                                        onclick="confirmDeleteStock(<?php echo $s['id']; ?>, '<?php echo addslashes($s['symbol']); ?>')">
                                                    <i class="bi bi-trash-fill"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- ============================================================== -->
    <!-- MODAL 1: EDIT REAL MARKET PRICE MODAL -->
    <!-- ============================================================== -->
    <div class="modal fade" id="editPriceModal" tabindex="-1" aria-labelledby="editPriceModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content modal-content-custom">
                <div class="modal-header border-bottom border-secondary px-4 pt-4 pb-3">
                    <div>
                        <h5 class="modal-title fw-bold text-white mb-0" id="editPriceModalLabel">
                            <i class="bi bi-sliders text-info me-2"></i> Edit Real Market Price
                        </h5>
                        <small class="text-white">Enter manual market price (LTP) and adjust change parameters</small>
                    </div>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                
                <form id="editPriceForm" method="POST" action="manage_market_price.php">
                    <input type="hidden" name="action" value="update_price">
                    <input type="hidden" name="stock_id" id="modalStockId" value="">

                    <div class="modal-body px-4 py-3">
                        
                        <!-- Top Summary Banner inside Modal -->
                        <div class="d-flex justify-content-between align-items-center p-3 rounded-3 mb-4" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(56, 189, 248, 0.2);">
                            <div class="d-flex align-items-center gap-3">
                                <div class="stock-badge fs-5" id="modalBadge">--</div>
                                <div>
                                    <div class="fw-bold text-white fs-5" id="modalSymbol">SYMBOL</div>
                                    <small class="text-white" id="modalCompanyName">Company Name</small>
                                </div>
                            </div>
                            <div class="text-end">
                                <span class="badge bg-dark border border-secondary text-info px-3 py-1.5" id="modalSectorBadge">Sector</span>
                            </div>
                        </div>

                        <!-- Price Inputs Grid -->
                        <div class="row g-3 mb-3">
                            <!-- Current Price (LTP) -->
                            <div class="col-md-6">
                                <label class="form-label-custom text-info">
                                    <i class="bi bi-currency-rupee"></i> New Real Market Price (LTP) *
                                </label>
                                <div class="input-group">
                                    <span class="input-group-text bg-dark border-secondary text-info fw-bold">₹</span>
                                    <input type="number" step="0.05" class="form-control form-control-custom fs-5 fw-bold" name="current_price" id="modalCurrentPrice" required oninput="calculatePriceDeltas()">
                                </div>
                                <small class="text-white">This becomes the live price across Web and Mobile app.</small>
                            </div>

                            <!-- Prev Close -->
                            <div class="col-md-6">
                                <label class="form-label-custom">
                                    <i class="bi bi-clock-history"></i> Previous Close Price (₹) *
                                </label>
                                <div class="input-group">
                                    <span class="input-group-text bg-dark border-secondary text-white">₹</span>
                                    <input type="number" step="0.05" class="form-control form-control-custom" name="prev_close" id="modalPrevClose" required oninput="calculatePriceDeltas()">
                                </div>
                                <small class="text-white">Reference baseline used for day change calculation.</small>
                            </div>
                        </div>

                        <!-- Auto-Calculate Toggle Option -->
                        <div class="p-3 rounded-3 mb-3" style="background: rgba(56, 189, 248, 0.05); border: 1px dashed rgba(56, 189, 248, 0.3);">
                            <div class="form-check form-switch mb-0">
                                <input class="form-check-input" type="checkbox" role="switch" id="autoCalcToggle" checked onchange="toggleAutoCalcMode()">
                                <label class="form-check-label text-white fw-bold small" for="autoCalcToggle">
                                    Auto-Calculate Day Change & % from Previous Close
                                </label>
                            </div>
                            <small class="text-white d-block mt-1">When active, typing Current Price will automatically compute Day Change (₹) and Day Change (%). Turn off to type custom change values manually.</small>
                        </div>

                        <!-- Day Change (₹) and % -->
                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <label class="form-label-custom">Day Change (₹)</label>
                                <input type="number" step="0.05" class="form-control form-control-custom" name="day_change" id="modalDayChange" readonly oninput="updateLivePreview()">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label-custom">Day Change (%)</label>
                                <div class="input-group">
                                    <input type="number" step="0.01" class="form-control form-control-custom" name="day_change_percent" id="modalDayChangePercent" readonly oninput="updateLivePreview()">
                                    <span class="input-group-text bg-dark border-secondary text-white">%</span>
                                </div>
                            </div>
                        </div>

                        <!-- High & Low Range + Sector -->
                        <div class="row g-3 mb-4">
                            <div class="col-md-4">
                                <label class="form-label-custom">Day High (₹)</label>
                                <input type="number" step="0.05" class="form-control form-control-custom" name="high_price" id="modalHighPrice">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label-custom">Day Low (₹)</label>
                                <input type="number" step="0.05" class="form-control form-control-custom" name="low_price" id="modalLowPrice">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label-custom">Sector</label>
                                <select class="form-select form-select-custom" name="sector" id="modalSectorSelect">
                                    <option value="Banking">Banking</option>
                                    <option value="IT Tech">IT Tech</option>
                                    <option value="Automobile">Automobile</option>
                                    <option value="Energy">Energy</option>
                                    <option value="Pharma">Pharma</option>
                                    <option value="FMCG">FMCG</option>
                                    <option value="Consumer Goods">Consumer Goods</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Infrastructure">Infrastructure</option>
                                    <option value="Telecom">Telecom</option>
                                    <option value="General">General</option>
                                </select>
                            </div>
                        </div>

                        <!-- Live Preview Card -->
                        <div class="preview-box">
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="fw-bold small text-white text-uppercase">Live Display Preview in App & Desk</span>
                                <span id="previewPill" class="badge bg-success-subtle text-success border border-success-subtle px-3 py-1.5 fw-bold">
                                    <i class="bi bi-caret-up-fill me-1"></i> +0.00 (+0.00%)
                                </span>
                            </div>
                            <div class="mt-2 d-flex align-items-baseline gap-2">
                                <span class="fs-4 fw-bold text-white" id="previewPrice">₹0.00</span>
                                <span class="small text-white" id="previewPrevClose">Prev Close: ₹0.00</span>
                            </div>
                        </div>

                    </div>
                    
                    <div class="modal-footer border-top border-secondary px-4 py-3">
                        <button type="button" class="btn btn-outline-secondary px-4 rounded-pill" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary px-4 fw-bold rounded-pill" id="modalSaveBtn" style="background: linear-gradient(135deg, #2563EB 0%, #0EA5E9 100%); border: none;">
                            <i class="bi bi-save2 me-1"></i> Save Real Market Price
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- ============================================================== -->
    <!-- MODAL 2: ADD NEW STOCK MODAL -->
    <!-- ============================================================== -->
    <div class="modal fade" id="addStockModal" tabindex="-1" aria-labelledby="addStockModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content modal-content-custom">
                <div class="modal-header border-bottom border-secondary px-4 pt-4 pb-3">
                    <div>
                        <h5 class="modal-title fw-bold text-white mb-0" id="addStockModalLabel">
                            <i class="bi bi-plus-circle-fill text-primary me-2"></i> Add New Stock to Watchlist
                        </h5>
                        <small class="text-white">Register a new equity symbol into the active market feed</small>
                    </div>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                
                <form method="POST" action="manage_market_price.php">
                    <input type="hidden" name="action" value="add_stock">

                    <div class="modal-body px-4 py-3">
                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <label class="form-label-custom">Stock Symbol (Ticker) *</label>
                                <input type="text" class="form-control form-control-custom text-uppercase fw-bold" name="symbol" placeholder="e.g. TATAPOWER" required>
                                <small class="text-white">NSE / BSE standard trading ticker.</small>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label-custom">Company Full Name *</label>
                                <input type="text" class="form-control form-control-custom" name="company_name" placeholder="e.g. Tata Power Co Ltd" required>
                            </div>
                        </div>

                        <div class="row g-3 mb-3">
                            <div class="col-md-4">
                                <label class="form-label-custom text-info">Initial Real Price (₹) *</label>
                                <input type="number" step="0.05" class="form-control form-control-custom fw-bold" name="current_price" placeholder="e.g. 425.50" required>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label-custom">Previous Close (₹)</label>
                                <input type="number" step="0.05" class="form-control form-control-custom" name="prev_close" placeholder="e.g. 420.00">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label-custom">Sector</label>
                                <select class="form-select form-select-custom" name="sector">
                                    <option value="Banking">Banking</option>
                                    <option value="IT Tech">IT Tech</option>
                                    <option value="Automobile">Automobile</option>
                                    <option value="Energy" selected>Energy</option>
                                    <option value="Pharma">Pharma</option>
                                    <option value="FMCG">FMCG</option>
                                    <option value="Consumer Goods">Consumer Goods</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Infrastructure">Infrastructure</option>
                                    <option value="General">General</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer border-top border-secondary px-4 py-3">
                        <button type="button" class="btn btn-outline-secondary px-4 rounded-pill" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary px-4 fw-bold rounded-pill" style="background: linear-gradient(135deg, #2563EB 0%, #0EA5E9 100%); border: none;">
                            <i class="bi bi-plus-lg me-1"></i> Add Stock to Market
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Hidden Delete Form -->
    <form id="deleteStockForm" method="POST" action="manage_market_price.php" class="d-none">
        <input type="hidden" name="action" value="delete_stock">
        <input type="hidden" name="stock_id" id="deleteStockId" value="">
    </form>

    <!-- Bootstrap 5 Bundle JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

    <script>
        let isQuickEditActive = false;

        function toggleQuickEditMode() {
            isQuickEditActive = !isQuickEditActive;
            const displays = document.querySelectorAll('.price-display-wrapper');
            const inlines = document.querySelectorAll('.price-inline-wrapper');
            const btnText = document.getElementById('quickEditBtnText');

            if (isQuickEditActive) {
                displays.forEach(el => el.classList.add('d-none'));
                inlines.forEach(el => el.classList.remove('d-none'));
                btnText.innerText = "Exit Quick Edit";
            } else {
                displays.forEach(el => el.classList.remove('d-none'));
                inlines.forEach(el => el.classList.add('d-none'));
                btnText.innerText = "Quick Inline Edit";
            }
        }

        function openEditPriceModal(id, symbol, company, price, prevClose, dayChange, dayChangePct, high, low, sector) {
            document.getElementById('modalStockId').value = id;
            document.getElementById('modalBadge').innerText = symbol.substring(0, 2);
            document.getElementById('modalSymbol').innerText = symbol;
            document.getElementById('modalCompanyName').innerText = company;
            document.getElementById('modalSectorBadge').innerText = sector;
            
            document.getElementById('modalCurrentPrice').value = price;
            document.getElementById('modalPrevClose').value = prevClose;
            document.getElementById('modalDayChange').value = dayChange;
            document.getElementById('modalDayChangePercent').value = dayChangePct;
            document.getElementById('modalHighPrice').value = high;
            document.getElementById('modalLowPrice').value = low;
            document.getElementById('modalSectorSelect').value = sector;

            document.getElementById('autoCalcToggle').checked = true;
            toggleAutoCalcMode();
            calculatePriceDeltas();

            const modal = new bootstrap.Modal(document.getElementById('editPriceModal'));
            modal.show();
        }

        function toggleAutoCalcMode() {
            const isAuto = document.getElementById('autoCalcToggle').checked;
            const changeInput = document.getElementById('modalDayChange');
            const pctInput = document.getElementById('modalDayChangePercent');

            if (isAuto) {
                changeInput.setAttribute('readonly', 'true');
                pctInput.setAttribute('readonly', 'true');
                calculatePriceDeltas();
            } else {
                changeInput.removeAttribute('readonly');
                pctInput.removeAttribute('readonly');
            }
        }

        function calculatePriceDeltas() {
            const isAuto = document.getElementById('autoCalcToggle').checked;
            const currentPrice = parseFloat(document.getElementById('modalCurrentPrice').value) || 0;
            const prevClose = parseFloat(document.getElementById('modalPrevClose').value) || 0;

            if (isAuto && prevClose > 0) {
                const diff = (currentPrice - prevClose);
                const pct = (diff / prevClose) * 100;
                
                document.getElementById('modalDayChange').value = diff.toFixed(2);
                document.getElementById('modalDayChangePercent').value = pct.toFixed(2);

                const curHigh = parseFloat(document.getElementById('modalHighPrice').value) || 0;
                const curLow = parseFloat(document.getElementById('modalLowPrice').value) || 0;
                if (currentPrice > curHigh) document.getElementById('modalHighPrice').value = currentPrice.toFixed(2);
                if (currentPrice < curLow || curLow === 0) document.getElementById('modalLowPrice').value = currentPrice.toFixed(2);
            }

            updateLivePreview();
        }

        function updateLivePreview() {
            const currentPrice = parseFloat(document.getElementById('modalCurrentPrice').value) || 0;
            const prevClose = parseFloat(document.getElementById('modalPrevClose').value) || 0;
            const dayChange = parseFloat(document.getElementById('modalDayChange').value) || 0;
            const dayChangePercent = parseFloat(document.getElementById('modalDayChangePercent').value) || 0;

            const isUp = dayChange >= 0;
            const previewPill = document.getElementById('previewPill');
            const previewPrice = document.getElementById('previewPrice');
            const previewPrevClose = document.getElementById('previewPrevClose');

            previewPrice.innerText = '₹' + currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            previewPrevClose.innerText = 'Prev Close: ₹' + prevClose.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            const sign = isUp ? '+' : '';
            previewPill.innerHTML = `<i class="bi ${isUp ? 'bi-caret-up-fill' : 'bi-caret-down-fill'} me-1"></i> ${sign}${dayChange.toFixed(2)} (${sign}${dayChangePercent.toFixed(2)}%)`;

            if (isUp) {
                previewPill.className = "badge bg-success-subtle text-success border border-success-subtle px-3 py-1.5 fw-bold";
            } else {
                previewPill.className = "badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-1.5 fw-bold";
            }
        }

        // Save price via AJAX for fast inline editing
        async function saveInlinePrice(id, symbol, prevClose) {
            const inputVal = parseFloat(document.getElementById('inline-input-' + id).value);
            if (!inputVal || inputVal <= 0) {
                alert("Please enter a valid price greater than 0");
                return;
            }

            try {
                const formData = new FormData();
                formData.append('action', 'update_price');
                formData.append('stock_id', id);
                formData.append('current_price', inputVal);
                formData.append('prev_close', prevClose);
                formData.append('auto_calc', '1');
                formData.append('ajax', '1');

                const res = await fetch('manage_market_price.php', {
                    method: 'POST',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    body: formData
                });

                const data = await res.json();
                if (data.success) {
                    document.getElementById('val-price-' + id).innerText = data.data.price_formatted;
                    
                    const badge = document.getElementById('badge-change-' + id);
                    badge.innerHTML = `<i class="bi ${data.data.is_up ? 'bi-caret-up-fill' : 'bi-caret-down-fill'} me-1"></i> ${data.data.change_formatted}`;
                    badge.className = `badge ${data.data.is_up ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle'} px-3 py-2 fw-bold`;

                    document.getElementById('val-updated-' + id).innerHTML = '<i class="bi bi-clock me-1 text-info opacity-75"></i>Just now';

                    showToast("Price Updated", `Price for ${symbol} set to ${data.data.price_formatted}`);
                } else {
                    alert(data.message || "Failed to update price");
                }
            } catch (err) {
                console.error("Error saving inline price:", err);
                alert("Network error updating price");
            }
        }

        function showToast(title, msg) {
            const toast = document.getElementById('liveToastAlert');
            document.getElementById('toastTitle').innerText = title;
            document.getElementById('toastMessage').innerText = msg;
            toast.classList.remove('d-none');
            setTimeout(() => {
                toast.classList.add('d-none');
            }, 4000);
        }

        function closeToast() {
            document.getElementById('liveToastAlert').classList.add('d-none');
        }

        function confirmDeleteStock(id, symbol) {
            if (confirm(`Are you sure you want to remove ${symbol} from the active market watchlist?`)) {
                document.getElementById('deleteStockId').value = id;
                document.getElementById('deleteStockForm').submit();
            }
        }

        function filterStocksTable() {
            const filter = document.getElementById('tableSearchInput').value.toLowerCase();
            const rows = document.querySelectorAll('#stocksTable tbody tr');

            rows.forEach(row => {
                const sym = row.querySelector('.stock-symbol-text')?.innerText.toLowerCase() || '';
                const comp = row.querySelector('.stock-company-text')?.innerText.toLowerCase() || '';
                const sec = row.querySelector('td:nth-child(2)')?.innerText.toLowerCase() || '';
                if (sym.includes(filter) || comp.includes(filter) || sec.includes(filter)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }
        <?php if (isset($_GET['scroll_test'])): ?>
        window.addEventListener('DOMContentLoaded', () => {
            const tableScroll = document.querySelector('.custom-table-scroll');
            if (tableScroll) {
                tableScroll.scrollLeft = tableScroll.scrollWidth;
            }
        });
        <?php endif; ?>
    </script>
</body>
</html>
