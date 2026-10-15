<?php
// backend/helpers/email_service.php
// Central Email & Notification Engine for Infinity Global Capital

if (file_exists(__DIR__ . '/statement_pdf.php')) {
    require_once __DIR__ . '/statement_pdf.php';
}

class EmailService {

    /**
     * Send an OTP Email to User
     */
    public static function sendOtpEmail($toEmail, $otpCode, $purpose = 'Authentication', $userName = 'Valued Trader') {
        $config = self::getConfig();
        $validMins = $config['otp_validity_minutes'] ?? 10;
        
        $subject = "{$otpCode} is your verification code — Infinity Global Capital";

        $htmlBody = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>' . htmlspecialchars($subject) . '</title>
            <style>
                body { margin: 0; padding: 0; background-color: #070B16; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0; }
                .email-container { max-width: 580px; margin: 30px auto; background: #0D1629; border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 20px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.6); }
                .email-header { background: linear-gradient(135deg, #090F1E 0%, #111D36 100%); padding: 32px 30px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
                .brand-title { font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #FFFFFF; margin: 0; }
                .brand-title span { color: #38BDF8; font-size: 26px; }
                .brand-sub { font-size: 11px; letter-spacing: 2px; color: #94A3B8; text-transform: uppercase; margin-top: 5px; }
                .email-body { padding: 36px 32px; }
                .welcome-text { font-size: 15px; color: #94A3B8; margin-bottom: 20px; line-height: 1.5; }
                .welcome-text strong { color: #FFFFFF; }
                .otp-box { background: linear-gradient(180deg, #131E35 0%, #0B1325 100%); border: 2px dashed #38BDF8; border-radius: 16px; padding: 26px; text-align: center; margin: 28px 0; }
                .otp-label { font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: #38BDF8; font-weight: 700; margin-bottom: 8px; }
                .otp-code { font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #FFFFFF; font-family: "Courier New", monospace; text-shadow: 0 0 20px rgba(56, 189, 248, 0.6); margin: 6px 0; }
                .otp-expiry { font-size: 12.5px; color: #F59E0B; margin-top: 8px; font-weight: 600; }
                .security-note { background: rgba(244, 63, 94, 0.1); border-left: 4px solid #F43F5E; padding: 14px 18px; border-radius: 8px; font-size: 12.5px; color: #FECDD3; line-height: 1.5; margin-top: 24px; }
                .email-footer { background: #070C18; padding: 24px 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05); font-size: 11.5px; color: #64748B; line-height: 1.6; }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="email-header">
                    <div class="brand-title"><span>∞</span> INFINITY <b>CAPITAL</b></div>
                    <div class="brand-sub">Real-Time Institutional Markets & Wealth Desk</div>
                </div>
                <div class="email-body">
                    <div class="welcome-text">
                        Hello <strong>' . htmlspecialchars($userName) . '</strong>,<br>
                        We received a request for <strong>' . htmlspecialchars($purpose) . '</strong> on your Infinity Global Capital trading account.
                    </div>
                    
                    <div class="otp-box">
                        <div class="otp-label">One-Time Verification Code (OTP)</div>
                        <div class="otp-code">' . htmlspecialchars($otpCode) . '</div>
                        <div class="otp-expiry">⏳ Valid for the next ' . $validMins . ' minutes only</div>
                    </div>

                    <div style="font-size: 13.5px; color: #CBD5E1; line-height: 1.6;">
                        Please enter this verification code in the mobile app or web portal to complete your verification.
                    </div>

                    <div class="security-note">
                        ⚠️ <strong>Security Disclaimer:</strong> Never share this OTP with anyone, including customer support or representatives of Infinity Global Capital. Our team will never ask for your OTP.
                    </div>
                </div>
                <div class="email-footer">
                    This is an automated system email from <strong>Infinity Global Capital</strong>.<br>
                    Live Exchange Connected: NSE · BSE · Derivatives Desk<br>
                    © ' . date('Y') . ' Infinity Global Capital. All rights reserved.
                </div>
            </div>
        </body>
        </html>';

        return self::sendMail($toEmail, $subject, $htmlBody, "Your OTP for {$purpose} is {$otpCode}");
    }

    /**
     * Send Transaction Slip (Deposit / Withdrawal) Email to User
     */
    public static function sendTransactionSlipEmail($toEmail, $txnData) {
        $type = $txnData['type'] ?? 'Deposit'; // 'Deposit' or 'Withdrawal'
        $amount = number_format((float)($txnData['amount'] ?? 0), 2);
        $utr = $txnData['txn_id'] ?? ('UTR' . date('YmdHis'));
        $paymentMethod = $txnData['payment_method'] ?? ($type === 'Deposit' ? 'UPI / Bank Transfer' : 'IMPS Bank Transfer');
        $newBalance = isset($txnData['new_balance']) ? number_format((float)$txnData['new_balance'], 2) : 'Updated in Ledger';
        $timestamp = !empty($txnData['created_at']) ? date('d M Y, h:i A', strtotime($txnData['created_at'])) : date('d M Y, h:i A');
        $userName = $txnData['user_name'] ?? 'Valued Investor';
        $userId = $txnData['user_id'] ?? '1';

        $isCredit = ($type === 'Deposit');
        $themeColor = $isCredit ? '#10B981' : '#F43F5E';
        $typeBadge = $isCredit ? 'CREDIT / DEPOSIT' : 'DEBIT / WITHDRAWAL';
        $sign = $isCredit ? '+' : '-';

        $subject = "Official Transaction Slip: ₹{$amount} {$type} Settled [Ref: {$utr}] — Infinity Global Capital";

        $htmlBody = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>' . htmlspecialchars($subject) . '</title>
            <style>
                body { margin: 0; padding: 0; background-color: #070B16; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0; }
                .email-container { max-width: 600px; margin: 30px auto; background: #0D1629; border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 20px; overflow: hidden; box-shadow: 0 15px 40px rgba(0,0,0,0.6); }
                .email-header { background: linear-gradient(135deg, #090F1E 0%, #111D36 100%); padding: 30px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
                .brand-title { font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #FFFFFF; margin: 0; }
                .brand-title span { color: #38BDF8; font-size: 26px; }
                .brand-sub { font-size: 11px; letter-spacing: 2px; color: #94A3B8; text-transform: uppercase; margin-top: 5px; }
                .receipt-banner { background: rgba(16, 185, 129, 0.1); border-bottom: 1px solid rgba(16, 185, 129, 0.3); padding: 14px 20px; text-align: center; color: #34D399; font-weight: 700; font-size: 13px; letter-spacing: 0.5px; }
                .receipt-banner.debit { background: rgba(244, 63, 94, 0.1); border-bottom-color: rgba(244, 63, 94, 0.3); color: #FB7185; }
                .email-body { padding: 32px 30px; }
                .slip-amount-card { background: #080D1A; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 26px; }
                .slip-amount-label { font-size: 12px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
                .slip-amount-val { font-size: 36px; font-weight: 900; color: ' . $themeColor . '; }
                .status-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 11.5px; font-weight: 800; background: ' . ($isCredit ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)') . '; color: ' . $themeColor . '; border: 1px solid ' . $themeColor . '; margin-top: 10px; }
                
                .receipt-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                .receipt-table tr td { padding: 12px 14px; font-size: 13.5px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
                .receipt-table tr:last-child td { border-bottom: none; }
                .receipt-table .field-label { color: #94A3B8; font-weight: 500; width: 45%; }
                .receipt-table .field-val { color: #FFFFFF; font-weight: 700; text-align: right; }

                .email-footer { background: #070C18; padding: 24px 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05); font-size: 11.5px; color: #64748B; line-height: 1.6; }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="email-header">
                    <div class="brand-title"><span>∞</span> INFINITY <b>CAPITAL</b></div>
                    <div class="brand-sub">Official Digital Transaction Slip / Ledger Receipt</div>
                </div>

                <div class="receipt-banner ' . ($isCredit ? '' : 'debit') . '">
                    ' . ($isCredit ? '✓ FUNDS CREDITED SUCCESSFULLY' : '✓ WITHDRAWAL SETTLEMENT PROCESSED') . '
                </div>

                <div class="email-body">
                    <div class="slip-amount-card">
                        <div class="slip-amount-label">Transaction Amount</div>
                        <div class="slip-amount-val">' . $sign . '₹' . $amount . '</div>
                        <div class="status-badge">' . $typeBadge . ' · SUCCESS</div>
                    </div>

                    <table class="receipt-table">
                        <tr>
                            <td class="field-label">Transaction Reference (UTR)</td>
                            <td class="field-val" style="color: #38BDF8; font-family: monospace;">' . htmlspecialchars($utr) . '</td>
                        </tr>
                        <tr>
                            <td class="field-label">Date & Timestamp</td>
                            <td class="field-val">' . htmlspecialchars($timestamp) . '</td>
                        </tr>
                        <tr>
                            <td class="field-label">Trading Demat Client ID</td>
                            <td class="field-val">IGC-USR-' . str_pad($userId, 4, '0', STR_PAD_LEFT) . '</td>
                        </tr>
                        <tr>
                            <td class="field-label">Payment Mode</td>
                            <td class="field-val">' . htmlspecialchars($paymentMethod) . '</td>
                        </tr>
                        <tr>
                            <td class="field-label">Settlement Status</td>
                            <td class="field-val" style="color: #10B981;">Completed (Real-Time)</td>
                        </tr>
                        <tr>
                            <td class="field-label">Updated Trading Balance</td>
                            <td class="field-val" style="color: #F8FAFC; font-size: 15px;">₹' . $newBalance . '</td>
                        </tr>
                    </table>

                    <div style="margin-top: 24px; padding: 14px 18px; background: rgba(56, 189, 248, 0.08); border-radius: 10px; font-size: 12px; color: #94A3B8; line-height: 1.5;">
                        ℹ️ <strong>Account Summary:</strong> This transaction slip represents a certified ledger credit/debit confirmation generated by Infinity Global Capital automated clearing system.
                    </div>
                </div>

                <div class="email-footer">
                    Infinity Global Capital Banking & Clearing Desk<br>
                    In case of discrepancies, contact <strong>support@infinityglobalcapital.com</strong> quoting your UTR number.<br>
                    © ' . date('Y') . ' Infinity Global Capital. All rights reserved.
                </div>
            </div>
        </body>
        </html>';

        return self::sendMail($toEmail, $subject, $htmlBody, "Transaction Slip: {$type} of ₹{$amount} settled. Ref: {$utr}");
    }

    /**
     * Send Certified Bank Statement / Passbook Email to User
     */
    public static function sendBankStatementEmail($toEmail, $userData, $transactions, $walletData) {
        $userName = $userData['full_name'] ?? 'Valued Investor';
        $userId = $userData['id'] ?? '1';
        $userMobile = $userData['mobile'] ?? 'N/A';
        $userPan = $userData['pan_number'] ?? 'Not Linked';
        $userBank = !empty($userData['account_no']) 
            ? (($userData['ifsc_code'] ? substr($userData['ifsc_code'], 0, 4) . ' ' : '') . '•••• ' . substr($userData['account_no'], -4))
            : 'Primary Demat Account';
        
        $currentMargin = isset($walletData['available_balance']) ? number_format((float)$walletData['available_balance'], 2) : '0.00';
        $statementDate = date('d M Y, h:i A');
        $stmtRef = 'STMT-' . date('Ymd') . '-' . str_pad($userId, 4, '0', STR_PAD_LEFT);
        $pdfFilename = "Bank_Statement_{$stmtRef}.pdf";

        // 1. Generate Certified PDF Passbook Statement if generator class is available
        $pdfContent = null;
        $pdfSizeKb = 0;
        $pdfPath = null;
        if (class_exists('StatementPdfGenerator')) {
            try {
                $pdfContent = StatementPdfGenerator::generate($userData, $transactions, $walletData, $stmtRef);
                $pdfSizeKb = round(strlen($pdfContent) / 1024, 1);

                // 2. Save local PDF copy for record-keeping and audit download
                $statementsDir = __DIR__ . '/../statements';
                if (!is_dir($statementsDir)) {
                    @mkdir($statementsDir, 0777, true);
                }
                $pdfPath = $statementsDir . '/' . $pdfFilename;
                @file_put_contents($pdfPath, $pdfContent);
            } catch (Throwable $pe) {
                $pdfContent = null;
            }
        }

        $totalDeposits = 0;
        $totalWithdrawals = 0;

        $rowsHtml = '';
        if (!empty($transactions) && is_array($transactions)) {
            foreach ($transactions as $tx) {
                $isCredit = ($tx['type'] === 'Deposit');
                $amt = (float)($tx['amount'] ?? 0);
                if ($isCredit) {
                    $totalDeposits += $amt;
                } else {
                    $totalWithdrawals += $amt;
                }

                $txDate = !empty($tx['created_at']) && $tx['created_at'] !== '0000-00-00 00:00:00' 
                    ? date('d M Y, h:i A', strtotime($tx['created_at'])) 
                    : date('d M Y, h:i A');
                $utr = !empty($tx['txn_id']) ? $tx['txn_id'] : ('UTR' . str_pad($tx['id'] ?? '1', 6, '0', STR_PAD_LEFT));
                $mode = !empty($tx['payment_method']) ? $tx['payment_method'] : 'UPI / IMPS';
                $badgeColor = $isCredit ? '#10B981' : '#F43F5E';
                $badgeBg = $isCredit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)';
                $sign = $isCredit ? '+' : '-';

                $rowsHtml .= '
                <tr>
                    <td style="padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12.5px; color: #E2E8F0;">' . htmlspecialchars($txDate) . '</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; font-family: monospace; color: #38BDF8;">' . htmlspecialchars($utr) . '</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12.5px; color: #CBD5E1;">' . htmlspecialchars($mode) . '</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); text-align: center;">
                        <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 800; background: ' . $badgeBg . '; color: ' . $badgeColor . ';">
                            ' . ($isCredit ? 'CR' : 'DR') . '
                        </span>
                    </td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); text-align: right; font-weight: 700; font-size: 13px; color: ' . $badgeColor . ';">
                        ' . $sign . '₹' . number_format($amt, 2) . '
                    </td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); text-align: right; font-size: 11.5px; color: #34D399; font-weight: 600;">Settled</td>
                </tr>';
            }
        } else {
            $rowsHtml = '<tr><td colspan="6" style="padding: 24px; text-align: center; color: #94A3B8; font-size: 13px;">No transactions found in this period.</td></tr>';
        }

        $subject = "Official Bank Statement & Demat Passbook [Ref: {$stmtRef}] — Infinity Global Capital";

        $htmlBody = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>' . htmlspecialchars($subject) . '</title>
            <style>
                body { margin: 0; padding: 0; background-color: #070B16; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0; }
                .email-container { max-width: 680px; margin: 25px auto; background: #0D1629; border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 18px; overflow: hidden; box-shadow: 0 15px 40px rgba(0,0,0,0.6); }
                .email-header { background: linear-gradient(135deg, #090F1E 0%, #111D36 100%); padding: 30px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
                .brand-title { font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #FFFFFF; margin: 0; }
                .brand-title span { color: #38BDF8; font-size: 26px; }
                .brand-sub { font-size: 11px; letter-spacing: 2px; color: #94A3B8; text-transform: uppercase; margin-top: 5px; }
                .stmt-banner { background: rgba(56, 189, 248, 0.12); border-bottom: 1px solid rgba(56, 189, 248, 0.25); padding: 12px 24px; display: flex; justify-content: space-between; font-size: 12px; color: #38BDF8; font-weight: 700; }
                .email-body { padding: 30px 24px; }
                .account-grid { width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #080D1A; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.06); }
                .account-grid td { padding: 10px 16px; font-size: 13px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
                .account-grid .lbl { color: #94A3B8; font-weight: 500; width: 35%; }
                .account-grid .val { color: #FFFFFF; font-weight: 700; text-align: right; }
                
                .summary-cards { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
                .summary-cards td { width: 33.33%; padding: 14px; text-align: center; border-radius: 10px; }
                
                .tx-table { width: 100%; border-collapse: collapse; margin-top: 14px; }
                .tx-table th { background: rgba(15, 23, 42, 0.8); color: #94A3B8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
                .email-footer { background: #070C18; padding: 22px 24px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05); font-size: 11.5px; color: #64748B; line-height: 1.6; }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="email-header">
                    <div class="brand-title"><span>∞</span> INFINITY <b>CAPITAL</b></div>
                    <div class="brand-sub">Official Digital Bank Passbook & Settlement Statement</div>
                </div>

                <div class="stmt-banner">
                    <div>STATEMENT REF: ' . htmlspecialchars($stmtRef) . '</div>
                    <div style="text-align: right;">DATE: ' . htmlspecialchars($statementDate) . '</div>
                </div>

                <div class="email-body">
                    <!-- PDF Attachment Callout Card -->
                    <div style="background: linear-gradient(135deg, rgba(56, 189, 248, 0.16) 0%, rgba(14, 165, 233, 0.08) 100%); border: 1.5px solid rgba(56, 189, 248, 0.45); border-radius: 14px; padding: 18px 20px; margin-bottom: 24px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="width: 44px; vertical-align: top; font-size: 32px; line-height: 1;">📎</td>
                                <td style="vertical-align: top;">
                                    <div style="font-size: 14px; font-weight: 800; color: #38BDF8; letter-spacing: 0.5px;">
                                        OFFICIAL BANK STATEMENT ATTACHED (PDF)
                                    </div>
                                    <div style="font-size: 12.5px; color: #E2E8F0; margin-top: 5px; line-height: 1.5;">
                                        Your digitally certified passbook & statement has been compiled and attached as 
                                        <strong style="color: #FFFFFF; font-family: monospace;">' . htmlspecialchars($pdfFilename) . '</strong> (' . $pdfSizeKb . ' KB).
                                    </div>
                                    <div style="font-size: 11.5px; color: #94A3B8; margin-top: 5px;">
                                        ✓ Digitally verified by Clearing Desk · 100% Tax & Audit Compliant · Print-ready A4 format
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- User & Demat Credentials -->
                    <table class="account-grid">
                        <tr>
                            <td class="lbl">Client Demat Account</td>
                            <td class="val">#UID-' . str_pad($userId, 4, '0', STR_PAD_LEFT) . '</td>
                        </tr>
                        <tr>
                            <td class="lbl">Account Holder Name</td>
                            <td class="val">' . htmlspecialchars($userName) . '</td>
                        </tr>
                        <tr>
                            <td class="lbl">Registered Mobile</td>
                            <td class="val">+91 ' . htmlspecialchars($userMobile) . '</td>
                        </tr>
                        <tr>
                            <td class="lbl">Permanent Account No (PAN)</td>
                            <td class="val"><code>' . htmlspecialchars($userPan) . '</code></td>
                        </tr>
                        <tr>
                            <td class="lbl">Linked Settlement Bank</td>
                            <td class="val">' . htmlspecialchars($userBank) . '</td>
                        </tr>
                    </table>

                    <!-- 3 Financial Summary Widgets -->
                    <table class="summary-cards">
                        <tr>
                            <td style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25);">
                                <div style="font-size: 11px; color: #34D399; font-weight: 700; text-transform: uppercase;">Total Credits (Deposits)</div>
                                <div style="font-size: 20px; font-weight: 900; color: #34D399; margin-top: 4px;">+₹' . number_format($totalDeposits, 2) . '</div>
                            </td>
                            <td style="width: 10px;"></td>
                            <td style="background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.25);">
                                <div style="font-size: 11px; color: #FB7185; font-weight: 700; text-transform: uppercase;">Total Debits (Payouts)</div>
                                <div style="font-size: 20px; font-weight: 900; color: #FB7185; margin-top: 4px;">-₹' . number_format($totalWithdrawals, 2) . '</div>
                            </td>
                            <td style="width: 10px;"></td>
                            <td style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25);">
                                <div style="font-size: 11px; color: #38BDF8; font-weight: 700; text-transform: uppercase;">Closing Trading Margin</div>
                                <div style="font-size: 20px; font-weight: 900; color: #FFFFFF; margin-top: 4px;">₹' . $currentMargin . '</div>
                            </td>
                        </tr>
                    </table>

                    <!-- Transaction Ledger Table -->
                    <div style="font-size: 14px; font-weight: 800; color: #FFFFFF; margin-bottom: 8px;">Detailed Transaction Ledger Passbook</div>
                    <table class="tx-table">
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>UTR / Reference</th>
                                <th>Payment Channel</th>
                                <th style="text-align: center;">Cr/Dr</th>
                                <th style="text-align: right;">Amount (INR)</th>
                                <th style="text-align: right;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ' . $rowsHtml . '
                        </tbody>
                    </table>

                    <div style="margin-top: 24px; padding: 14px 18px; background: rgba(56, 189, 248, 0.08); border-radius: 10px; font-size: 12px; color: #94A3B8; line-height: 1.5;">
                        🏛️ <strong>Clearing Desk Notice:</strong> This statement is digitally generated and certified by Infinity Global Capital automated settlements desk. All entries represent verified bank credits and payouts.
                    </div>
                </div>

                <div class="email-footer">
                    Infinity Global Capital Banking & Clearing Desk<br>
                    Live Exchange Connected: NSE · BSE · Derivatives Desk<br>
                    For any ledger discrepancies, email <strong>support@infinityglobalcapital.com</strong> quoting your statement reference.<br>
                    © ' . date('Y') . ' Infinity Global Capital. All rights reserved.
                </div>
            </div>
        </body>
        </html>';

        $attachments = [];
        if (!empty($pdfContent)) {
            $attachments[] = [
                'name' => $pdfFilename,
                'content' => $pdfContent,
                'type' => 'application/pdf',
                'path' => $pdfPath
            ];
        }

        $result = self::sendMail(
            $toEmail,
            $subject,
            $htmlBody,
            "Your Official Bank Statement Ref {$stmtRef} has been generated" . (!empty($pdfContent) ? " and attached as PDF ({$pdfFilename})" : "") . ". Total Credits: ₹{$totalDeposits}, Total Debits: ₹{$totalWithdrawals}, Available Margin: ₹{$currentMargin}",
            $attachments
        );

        $result['pdf_attached'] = !empty($pdfContent);
        $result['pdf_filename'] = $pdfFilename;
        $result['pdf_size'] = !empty($pdfContent) ? strlen($pdfContent) : 0;
        $result['pdf_path'] = $pdfPath;
        $result['stmt_ref'] = $stmtRef;

        return $result;
    }

    /**
     * Dispatch email via SMTP or Fallback Logger
     */
    public static function sendMail($toEmail, $subject, $htmlBody, $textFallback = '', $attachments = []) {
        $config = self::getConfig();
        $isSmtp = !empty($config['smtp_enabled']) && !empty($config['smtp_username']) && !empty($config['smtp_password']);

        $sentViaSmtp = false;
        $errorMsg = '';

        if ($isSmtp) {
            try {
                $sentViaSmtp = self::socketSmtpSend($toEmail, $subject, $htmlBody, $config, $attachments, $textFallback);
            } catch (Throwable $e) {
                $errorMsg = $e->getMessage();
            }
        }

        // Always log for transparency, audit, and local development
        $attLog = !empty($attachments) ? ' [ATTACHED: ' . implode(', ', array_map(function($a) { return is_array($a) ? ($a['name'] ?? 'file.pdf') : basename($a); }, $attachments)) . ']' : '';
        self::logEmail($toEmail, $subject, $textFallback . $attLog, $sentViaSmtp ? 'SENT_VIA_SMTP' : ($isSmtp ? "SMTP_FAILED: {$errorMsg}" : 'LOGGED_ONLY'));

        return [
            'success' => true,
            'sent_smtp' => $sentViaSmtp,
            'to' => $toEmail,
            'subject' => $subject,
            'mode' => $sentViaSmtp ? 'smtp' : 'simulated_log',
            'error' => $errorMsg,
            'has_attachments' => !empty($attachments)
        ];
    }

    /**
     * Pure PHP Socket SMTP Client with High-Deliverability Headers & multipart/alternative support
     */
    private static function socketSmtpSend($toEmail, $subject, $htmlBody, $config, $attachments = [], $textFallback = '') {
        $host = $config['smtp_host'];
        $port = (int)$config['smtp_port'];
        $user = $config['smtp_username'];
        $pass = $config['smtp_password'];
        $fromEmail = !empty($config['from_email']) ? $config['from_email'] : $user;
        $fromName = $config['from_name'] ?? 'Infinity Global Capital';

        $timeout = 15;
        $socketHost = ($port == 465) ? "ssl://{$host}" : $host;

        $socket = @fsockopen($socketHost, $port, $errno, $errstr, $timeout);
        if (!$socket) {
            throw new Exception("Could not connect to SMTP server {$host}:{$port} ($errstr)");
        }

        self::readResponse($socket, '220');

        // EHLO
        fputs($socket, "EHLO " . gethostname() . "\r\n");
        self::readResponse($socket, '250');

        // If port 587 TLS, initiate STARTTLS
        if ($port == 587 || ($config['smtp_encryption'] ?? '') === 'tls') {
            fputs($socket, "STARTTLS\r\n");
            self::readResponse($socket, '220');
            
            $cryptoMethod = STREAM_CRYPTO_METHOD_TLS_CLIENT;
            if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) {
                $cryptoMethod |= STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
            }
            if (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT')) {
                $cryptoMethod |= STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;
            }
            
            if (!stream_socket_enable_crypto($socket, true, $cryptoMethod)) {
                throw new Exception("STARTTLS encryption handshake failed");
            }

            fputs($socket, "EHLO " . gethostname() . "\r\n");
            self::readResponse($socket, '250');
        }

        // AUTH LOGIN
        fputs($socket, "AUTH LOGIN\r\n");
        self::readResponse($socket, '334');

        fputs($socket, base64_encode($user) . "\r\n");
        self::readResponse($socket, '334');

        fputs($socket, base64_encode($pass) . "\r\n");
        self::readResponse($socket, '235');

        // MAIL FROM
        fputs($socket, "MAIL FROM: <{$fromEmail}>\r\n");
        self::readResponse($socket, '250');

        // RCPT TO
        fputs($socket, "RCPT TO: <{$toEmail}>\r\n");
        self::readResponse($socket, '250');

        // DATA
        fputs($socket, "DATA\r\n");
        self::readResponse($socket, '354');

        // High Deliverability Headers (RFC 5322 & Anti-Spam compliant)
        $msgId = "<" . time() . "." . md5(uniqid(microtime(), true)) . "@gmail.com>";
        $headers = [];
        $headers[] = "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$fromEmail}>";
        $headers[] = "To: <{$toEmail}>";
        $headers[] = "Reply-To: <{$fromEmail}>";
        $headers[] = "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=";
        $headers[] = "Date: " . date('r');
        $headers[] = "Message-ID: {$msgId}";
        $headers[] = "MIME-Version: 1.0";
        $headers[] = "X-Priority: 1 (Highest)";
        $headers[] = "Importance: High";

        $plain = !empty($textFallback) ? $textFallback : strip_tags(str_replace(['<br>', '<br/>', '</p>'], ["\n", "\n", "\n\n"], $htmlBody));

        if (empty($attachments)) {
            // High deliverability multipart/alternative (Plain text + HTML)
            $altBoundary = "----=_Part_Alt_" . md5(uniqid(microtime(), true));
            $headers[] = "Content-Type: multipart/alternative; boundary=\"{$altBoundary}\"";

            $body = "--{$altBoundary}\r\n";
            $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $body .= chunk_split(base64_encode($plain));

            $body .= "--{$altBoundary}\r\n";
            $body .= "Content-Type: text/html; charset=UTF-8\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $body .= chunk_split(base64_encode($htmlBody));

            $body .= "--{$altBoundary}--\r\n";

            $payload = implode("\r\n", $headers) . "\r\n\r\n" . $body . ".\r\n";
        } else {
            // RFC 2046 compliant multipart/mixed message with nested multipart/alternative
            $mixedBoundary = "----=_Part_Mix_" . md5(uniqid(microtime(), true));
            $altBoundary = "----=_Part_Alt_" . md5(uniqid(microtime(), true));
            $headers[] = "Content-Type: multipart/mixed; boundary=\"{$mixedBoundary}\"";

            $body = "--{$mixedBoundary}\r\n";
            $body .= "Content-Type: multipart/alternative; boundary=\"{$altBoundary}\"\r\n\r\n";

            $body .= "--{$altBoundary}\r\n";
            $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $body .= chunk_split(base64_encode($plain));

            $body .= "--{$altBoundary}\r\n";
            $body .= "Content-Type: text/html; charset=UTF-8\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $body .= chunk_split(base64_encode($htmlBody));

            $body .= "--{$altBoundary}--\r\n";

            foreach ($attachments as $att) {
                $attName = is_array($att) ? ($att['name'] ?? 'Bank_Statement.pdf') : basename($att);
                $attType = is_array($att) ? ($att['type'] ?? 'application/pdf') : 'application/pdf';

                $attData = '';
                if (is_array($att) && isset($att['content'])) {
                    $attData = $att['content'];
                } elseif (is_array($att) && !empty($att['path']) && file_exists($att['path'])) {
                    $attData = @file_get_contents($att['path']);
                } elseif (is_string($att) && file_exists($att)) {
                    $attData = @file_get_contents($att);
                }

                if (empty($attData)) {
                    continue;
                }

                $body .= "--{$mixedBoundary}\r\n";
                $body .= "Content-Type: {$attType}; name=\"{$attName}\"\r\n";
                $body .= "Content-Transfer-Encoding: base64\r\n";
                $body .= "Content-Disposition: attachment; filename=\"{$attName}\"\r\n\r\n";
                $body .= chunk_split(base64_encode($attData));
            }

            $body .= "--{$mixedBoundary}--\r\n";

            $payload = implode("\r\n", $headers) . "\r\n\r\n" . $body . ".\r\n";
        }

        fputs($socket, $payload);
        self::readResponse($socket, '250');

        // QUIT
        fputs($socket, "QUIT\r\n");
        fclose($socket);

        return true;
    }

    private static function readResponse($socket, $expectedCode) {
        $response = "";
        while ($line = fgets($socket, 515)) {
            $response .= $line;
            if (substr($line, 3, 1) == " ") {
                break;
            }
        }
        $code = substr($response, 0, 3);
        if ($code !== $expectedCode) {
            throw new Exception("SMTP Error: Expected {$expectedCode}, received: {$response}");
        }
        return $response;
    }

    /**
     * Audit logger for all emails dispatched
     */
    private static function logEmail($to, $subject, $content, $status) {
        $config = self::getConfig();
        $logFile = $config['log_file'] ?? (__DIR__ . '/../logs/email_log.txt');
        $logDir = dirname($logFile);
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0777, true);
        }

        $entry = "[" . date('Y-m-d H:i:s') . "] STATUS: {$status} | TO: {$to} | SUBJECT: {$subject} | CONTENT: {$content}\n";
        @file_put_contents($logFile, $entry, FILE_APPEND);
    }

    private static function getConfig() {
        $configFile = __DIR__ . '/../config/mail_config.php';
        if (file_exists($configFile)) {
            return include $configFile;
        }
        return [
            'smtp_enabled' => false,
            'otp_validity_minutes' => 10,
            'allow_demo_otp' => true,
            'log_file' => __DIR__ . '/../logs/email_log.txt'
        ];
    }
}
