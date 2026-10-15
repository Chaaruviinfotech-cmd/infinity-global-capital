<?php
// backend/helpers/statement_pdf.php
// Official PDF Bank Statement & Passbook Generator for Infinity Global Capital

require_once __DIR__ . '/fpdf/fpdf.php';

class StatementPdf extends FPDF {
    public $stmtRef = '';
    public $statementDate = '';
    public $clientName = '';

    function Header() {
        // Top dark institutional header bar
        $this->SetFillColor(11, 19, 43); // Deep Navy #0B132B
        $this->Rect(0, 0, 210, 26, 'F');

        // Brand logo symbol & text
        $this->SetXY(12, 6);
        $this->SetFont('Arial', 'B', 15);
        $this->SetTextColor(56, 189, 248); // Cyan #38BDF8
        $this->Write(7, "[oo]  ");
        
        $this->SetTextColor(255, 255, 255);
        $this->Write(7, "INFINITY ");
        $this->SetTextColor(56, 189, 248);
        $this->Write(7, "CAPITAL");

        // Subtitle
        $this->SetXY(12, 14);
        $this->SetFont('Arial', '', 7.5);
        $this->SetTextColor(148, 163, 184); // Slate #94A3B8
        $this->Cell(100, 5, 'INSTITUTIONAL DEMAT LEDGER & BANK STATEMENT', 0, 0, 'L');

        // Right side: Statement Ref & Date
        $this->SetXY(110, 6);
        $this->SetFont('Arial', 'B', 8.5);
        $this->SetTextColor(56, 189, 248);
        $this->Cell(88, 5, 'STATEMENT REF: ' . $this->stmtRef, 0, 1, 'R');

        $this->SetXY(110, 12);
        $this->SetFont('Arial', '', 7.5);
        $this->SetTextColor(203, 213, 225);
        $this->Cell(88, 4, 'DATE: ' . $this->statementDate, 0, 1, 'R');

        $this->SetXY(110, 16.5);
        $this->SetFont('Arial', 'I', 7);
        $this->SetTextColor(148, 163, 184);
        $this->Cell(88, 4, 'CONNECTIVITY: NSE | BSE | DERIVATIVES DESK', 0, 1, 'R');

        // Cyan Accent Line
        $this->SetFillColor(2, 132, 199); // Blue/Cyan
        $this->Rect(0, 26, 210, 1.2, 'F');

        $this->SetY(32);
    }

    function Footer() {
        $this->SetY(-16);
        
        // Thin separator rule
        $this->SetDrawColor(226, 232, 240);
        $this->SetLineWidth(0.3);
        $this->Line(12, $this->GetY(), 198, $this->GetY());

        $this->SetY(-13);
        $this->SetFont('Arial', '', 7);
        $this->SetTextColor(100, 116, 139);
        $this->Cell(120, 4, 'Infinity Global Capital Automated Clearing Desk | support@infinityglobalcapital.com', 0, 0, 'L');

        $this->SetFont('Arial', 'B', 7);
        $this->Cell(66, 4, 'Page ' . $this->PageNo() . ' of {nb}', 0, 0, 'R');

        $this->Ln(3.5);
        $this->SetFont('Arial', 'I', 6.5);
        $this->SetTextColor(148, 163, 184);
        $this->Cell(186, 3, 'This is a certified digital passbook generated under automated clearing compliance. No physical signature required.', 0, 0, 'L');
    }
}

class StatementPdfGenerator {

    /**
     * Generate Bank Statement PDF Binary String
     */
    public static function generate($userData, $transactions, $walletData, $stmtRef = null) {
        $userId = $userData['id'] ?? 1;
        $userName = !empty($userData['full_name']) ? $userData['full_name'] : (!empty($userData['mobile']) ? 'Investor (' . $userData['mobile'] . ')' : 'Valued Trader');
        $userMobile = !empty($userData['mobile']) ? $userData['mobile'] : 'N/A';
        $userEmail = !empty($userData['email']) ? $userData['email'] : 'bikramnahak9714@gmail.com';
        $userPan = !empty($userData['pan_number']) ? strtoupper($userData['pan_number']) : 'NOT LINKED';
        $accountNo = !empty($userData['account_no']) ? $userData['account_no'] : '';
        $ifsc = !empty($userData['ifsc_code']) ? strtoupper($userData['ifsc_code']) : '';
        
        $bankDisplay = 'Primary Demat Account';
        if (!empty($accountNo)) {
            $maskedAcc = '•••• ' . substr($accountNo, -4);
            $bankDisplay = ($ifsc ? $ifsc . ' - ' : '') . $maskedAcc;
        }

        if (!$stmtRef) {
            $stmtRef = 'STMT-' . date('Ymd') . '-' . str_pad($userId, 4, '0', STR_PAD_LEFT);
        }

        $statementDate = date('d M Y, h:i A');
        $currentMargin = isset($walletData['available_balance']) ? (float)$walletData['available_balance'] : 0.00;
        $totalInvested = isset($walletData['total_invested']) ? (float)$walletData['total_invested'] : 0.00;

        // Calculate totals
        $totalCredits = 0.00;
        $totalDebits = 0.00;
        if (!empty($transactions) && is_array($transactions)) {
            foreach ($transactions as $t) {
                $amt = (float)($t['amount'] ?? 0);
                if (strtolower($t['type'] ?? '') === 'deposit') {
                    $totalCredits += $amt;
                } else {
                    $totalDebits += $amt;
                }
            }
        }

        // Initialize PDF
        $pdf = new StatementPdf('P', 'mm', 'A4');
        $pdf->stmtRef = $stmtRef;
        $pdf->statementDate = $statementDate;
        $pdf->clientName = $userName;
        $pdf->AliasNbPages();
        $pdf->SetMargins(12, 12, 12);
        $pdf->SetAutoPageBreak(true, 18);
        $pdf->AddPage();

        // 1. Account / Customer Profile Box
        $pdf->SetFont('Arial', 'B', 8.5);
        $pdf->SetTextColor(15, 23, 42); // Slate #0F172A
        $pdf->Cell(186, 5, 'INVESTOR & DEMAT ACCOUNT PROFILE', 0, 1, 'L');

        $startX = 12;
        $startY = $pdf->GetY();
        $boxW = 186;
        $boxH = 30;

        // Draw profile box background & border
        $pdf->SetFillColor(248, 250, 252); // #F8FAFC
        $pdf->SetDrawColor(203, 213, 225); // #CBD5E1
        $pdf->SetLineWidth(0.3);
        $pdf->Rect($startX, $startY, $boxW, $boxH, 'DF');

        // Left Column (width: 93mm)
        $col1X = $startX + 4;
        $col2X = $startX + 97;
        $lineH = 5.2;

        $pdf->SetXY($col1X, $startY + 2.5);
        $pdf->SetFont('Arial', '', 7.5);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->Cell(38, $lineH, 'Client Demat Account:', 0, 0, 'L');
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell(50, $lineH, '#UID-' . str_pad($userId, 4, '0', STR_PAD_LEFT), 0, 1, 'L');

        $pdf->SetX($col1X);
        $pdf->SetFont('Arial', '', 7.5);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->Cell(38, $lineH, 'Account Holder Name:', 0, 0, 'L');
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell(50, $lineH, substr($userName, 0, 28), 0, 1, 'L');

        $pdf->SetX($col1X);
        $pdf->SetFont('Arial', '', 7.5);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->Cell(38, $lineH, 'Registered Mobile:', 0, 0, 'L');
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell(50, $lineH, '+91 ' . $userMobile, 0, 1, 'L');

        $pdf->SetX($col1X);
        $pdf->SetFont('Arial', '', 7.5);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->Cell(38, $lineH, 'Registered Email:', 0, 0, 'L');
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell(50, $lineH, substr($userEmail, 0, 30), 0, 1, 'L');

        $pdf->SetX($col1X);
        $pdf->SetFont('Arial', '', 7.5);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->Cell(38, $lineH, 'KYC Verification Status:', 0, 0, 'L');
        $pdf->SetFont('Arial', 'B', 7.5);
        $pdf->SetTextColor(5, 150, 105); // Green #059669
        $pdf->Cell(50, $lineH, 'VERIFIED & ACTIVE', 0, 1, 'L');

        // Right Column (width: 93mm)
        $pdf->SetXY($col2X, $startY + 2.5);
        $pdf->SetFont('Arial', '', 7.5);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->Cell(36, $lineH, 'Permanent Account (PAN):', 0, 0, 'L');
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell(50, $lineH, $userPan, 0, 1, 'L');

        $pdf->SetX($col2X);
        $pdf->SetFont('Arial', '', 7.5);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->Cell(36, $lineH, 'Settlement Bank:', 0, 0, 'L');
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell(50, $lineH, substr($bankDisplay, 0, 28), 0, 1, 'L');

        $pdf->SetX($col2X);
        $pdf->SetFont('Arial', '', 7.5);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->Cell(36, $lineH, 'Depository Participant:', 0, 0, 'L');
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell(50, $lineH, 'INFINITY GLOBAL CAPITAL LTD', 0, 1, 'L');

        $pdf->SetX($col2X);
        $pdf->SetFont('Arial', '', 7.5);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->Cell(36, $lineH, 'Portfolio Invested:', 0, 0, 'L');
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell(50, $lineH, 'Rs. ' . number_format($totalInvested, 2), 0, 1, 'L');

        $pdf->SetX($col2X);
        $pdf->SetFont('Arial', '', 7.5);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->Cell(36, $lineH, 'Currency & Settlement:', 0, 0, 'L');
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell(50, $lineH, 'INR (T+0 Instant Clearing)', 0, 1, 'L');

        $pdf->SetY($startY + $boxH + 5);

        // 2. Financial Summary Cards (3 colored widgets)
        $cardW = 59.3;
        $cardH = 17;
        $gap = 4;
        $cardY = $pdf->GetY();

        // Card 1: Total Credits
        $pdf->SetFillColor(240, 253, 244); // Green tint #F0FDF4
        $pdf->SetDrawColor(167, 243, 208); // #A7F3D0
        $pdf->Rect($startX, $cardY, $cardW, $cardH, 'DF');
        $pdf->SetXY($startX + 3, $cardY + 2.5);
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->SetTextColor(5, 150, 105);
        $pdf->Cell($cardW - 6, 4, 'TOTAL CREDITS (DEPOSITS)', 0, 1, 'L');
        $pdf->SetX($startX + 3);
        $pdf->SetFont('Arial', 'B', 11.5);
        $pdf->SetTextColor(5, 150, 105);
        $pdf->Cell($cardW - 6, 6, '+Rs. ' . number_format($totalCredits, 2), 0, 1, 'L');

        // Card 2: Total Debits
        $c2X = $startX + $cardW + $gap;
        $pdf->SetFillColor(254, 242, 242); // Red tint #FEF2F2
        $pdf->SetDrawColor(254, 202, 202); // #FECACA
        $pdf->Rect($c2X, $cardY, $cardW, $cardH, 'DF');
        $pdf->SetXY($c2X + 3, $cardY + 2.5);
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->SetTextColor(220, 38, 38);
        $pdf->Cell($cardW - 6, 4, 'TOTAL DEBITS (WITHDRAWALS)', 0, 1, 'L');
        $pdf->SetX($c2X + 3);
        $pdf->SetFont('Arial', 'B', 11.5);
        $pdf->SetTextColor(220, 38, 38);
        $pdf->Cell($cardW - 6, 6, '-Rs. ' . number_format($totalDebits, 2), 0, 1, 'L');

        // Card 3: Available Margin
        $c3X = $c2X + $cardW + $gap;
        $pdf->SetFillColor(239, 246, 255); // Blue tint #EFF6FF
        $pdf->SetDrawColor(186, 230, 253); // #BAE6FD
        $pdf->Rect($c3X, $cardY, $cardW, $cardH, 'DF');
        $pdf->SetXY($c3X + 3, $cardY + 2.5);
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->SetTextColor(2, 132, 199);
        $pdf->Cell($cardW - 6, 4, 'AVAILABLE CASH MARGIN', 0, 1, 'L');
        $pdf->SetX($c3X + 3);
        $pdf->SetFont('Arial', 'B', 11.5);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell($cardW - 6, 6, 'Rs. ' . number_format($currentMargin, 2), 0, 1, 'L');

        $pdf->SetY($cardY + $cardH + 6);

        // 3. Detailed Transaction Ledger Table
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell(130, 6, 'TRANSACTION PASSBOOK & SETTLEMENT AUDIT', 0, 0, 'L');
        $pdf->SetFont('Arial', '', 7.5);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->Cell(56, 6, 'Showing ' . count($transactions) . ' recorded entries', 0, 1, 'R');

        // Table Header Column Widths (Sum = 186mm)
        $wDate    = 36;
        $wUtr     = 46;
        $wMode    = 34;
        $wType    = 18;
        $wAmt     = 34;
        $wStatus  = 18;

        self::renderTableHeader($pdf, $wDate, $wUtr, $wMode, $wType, $wAmt, $wStatus);

        // Table Rows
        if (!empty($transactions) && is_array($transactions)) {
            $rowIndex = 0;
            foreach ($transactions as $tx) {
                // Check if page break needed
                if ($pdf->GetY() > 265) {
                    $pdf->AddPage();
                    self::renderTableHeader($pdf, $wDate, $wUtr, $wMode, $wType, $wAmt, $wStatus);
                }

                $isCredit = (strtolower($tx['type'] ?? '') === 'deposit');
                $amt = (float)($tx['amount'] ?? 0);
                $txDate = !empty($tx['created_at']) && $tx['created_at'] !== '0000-00-00 00:00:00'
                    ? date('d M Y, h:i A', strtotime($tx['created_at']))
                    : date('d M Y, h:i A');
                $utr = !empty($tx['txn_id']) ? $tx['txn_id'] : ('UTR' . str_pad($tx['id'] ?? '1', 8, '0', STR_PAD_LEFT));
                $mode = !empty($tx['payment_method']) ? substr($tx['payment_method'], 0, 18) : 'UPI / NetBanking';
                
                $rowFill = ($rowIndex % 2 == 0) ? 255 : 248; // Alternating row color
                $pdf->SetFillColor($rowFill, $rowFill, ($rowIndex % 2 == 0 ? 255 : 252));
                $pdf->SetDrawColor(241, 245, 249);
                $pdf->SetLineWidth(0.2);

                $rowY = $pdf->GetY();
                $pdf->Rect(12, $rowY, 186, 6.8, 'F');

                // Date
                $pdf->SetFont('Arial', '', 7.5);
                $pdf->SetTextColor(71, 85, 105);
                $pdf->Cell($wDate, 6.8, '  ' . $txDate, 'B', 0, 'L');

                // UTR / Reference No
                $pdf->SetFont('Courier', 'B', 7.5);
                $pdf->SetTextColor(2, 132, 199);
                $pdf->Cell($wUtr, 6.8, substr($utr, 0, 22), 'B', 0, 'L');

                // Channel
                $pdf->SetFont('Arial', '', 7.5);
                $pdf->SetTextColor(71, 85, 105);
                $pdf->Cell($wMode, 6.8, $mode, 'B', 0, 'L');

                // Cr / Dr Badge
                $pdf->SetFont('Arial', 'B', 7);
                if ($isCredit) {
                    $pdf->SetTextColor(5, 150, 105);
                    $pdf->Cell($wType, 6.8, 'CR', 'B', 0, 'C');
                } else {
                    $pdf->SetTextColor(220, 38, 38);
                    $pdf->Cell($wType, 6.8, 'DR', 'B', 0, 'C');
                }

                // Amount (INR)
                $pdf->SetFont('Arial', 'B', 8);
                if ($isCredit) {
                    $pdf->SetTextColor(5, 150, 105);
                    $pdf->Cell($wAmt, 6.8, '+Rs. ' . number_format($amt, 2) . ' ', 'B', 0, 'R');
                } else {
                    $pdf->SetTextColor(220, 38, 38);
                    $pdf->Cell($wAmt, 6.8, '-Rs. ' . number_format($amt, 2) . ' ', 'B', 0, 'R');
                }

                // Status
                $pdf->SetFont('Arial', 'B', 7);
                $pdf->SetTextColor(16, 185, 129);
                $pdf->Cell($wStatus, 6.8, 'Settled', 'B', 1, 'C');

                $rowIndex++;
            }
        } else {
            $pdf->SetFont('Arial', 'I', 8.5);
            $pdf->SetTextColor(148, 163, 184);
            $pdf->Cell(186, 14, 'No ledger transactions recorded for this account.', 1, 1, 'C');
        }

        // Summary closing statement badge
        if ($pdf->GetY() < 240) {
            $pdf->Ln(5);
            $noticeY = $pdf->GetY();
            $pdf->SetFillColor(241, 245, 249);
            $pdf->SetDrawColor(203, 213, 225);
            $pdf->Rect(12, $noticeY, 186, 12, 'DF');

            $pdf->SetXY(15, $noticeY + 2);
            $pdf->SetFont('Arial', 'B', 7);
            $pdf->SetTextColor(30, 41, 59);
            $pdf->Cell(180, 4, 'OFFICIAL CLEARING DESK DIGITAL CERTIFICATION', 0, 1, 'L');

            $pdf->SetX(15);
            $pdf->SetFont('Arial', '', 6.5);
            $pdf->SetTextColor(100, 116, 139);
            $pdf->Cell(180, 4, 'All entries above reflect confirmed banking channel credits and demat margin debits processed under real-time protocol.', 0, 1, 'L');
        }

        return $pdf->Output('S');
    }

    private static function renderTableHeader($pdf, $wDate, $wUtr, $wMode, $wType, $wAmt, $wStatus) {
        $pdf->SetFillColor(15, 23, 42); // Dark Navy #0F172A
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('Arial', 'B', 7.5);
        $pdf->SetDrawColor(15, 23, 42);

        $pdf->Cell($wDate, 7, '  Date & Time', 0, 0, 'L', true);
        $pdf->Cell($wUtr, 7, 'UTR / Reference ID', 0, 0, 'L', true);
        $pdf->Cell($wMode, 7, 'Payment Channel', 0, 0, 'L', true);
        $pdf->Cell($wType, 7, 'Cr / Dr', 0, 0, 'C', true);
        $pdf->Cell($wAmt, 7, 'Amount (INR)  ', 0, 0, 'R', true);
        $pdf->Cell($wStatus, 7, 'Status', 0, 1, 'C', true);
    }
}
