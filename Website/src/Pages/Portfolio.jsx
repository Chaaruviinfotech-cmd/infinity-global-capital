import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPortfolioAction } from '../Services/Actions/getApis';
import Layout from '../Components/Layout';
import DataTable from '../Components/DataTable';
import Loader from '../Components/Loader';
import ThemeToggle from '../Components/ThemeToggle';

/**
 * 1:1 Replica of PHP admin portfolio (backend/admin/portfolio.php)
 * Featuring 3 Stat boxes, full Holdings DataTable with search/sort/pagination,
 * and Actions/getApis data fetching matching mobile app architecture.
 */
const Portfolio = () => {
  const dispatch = useDispatch();
  const { portfolioData } = useSelector((state) => state.igc_data);

  const [loading, setLoading] = useState(!portfolioData);
  const [data, setData] = useState(portfolioData || null);

  const loadPortfolio = React.useCallback(async () => {
    try {
      const res = await dispatch(fetchPortfolioAction());
      if (res && res.success && res.data) {
        setData(res.data);
      }
    } catch (e) {
      console.error('Failed to load portfolio:', e);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  if (loading && !data) {
    return <Loader text="Calculating Real-Time Holdings & Asset Valuations..." />;
  }

  const total_invested = data?.summary?.total_invested ?? data?.total_invested ?? 0;
  const total_current_value = data?.summary?.total_current ?? data?.total_current_value ?? 0;
  const total_profit = data?.summary?.total_profit ?? data?.total_profit ?? 0;
  const total_profit_pct = data?.summary?.total_profit_pct ?? data?.total_profit_pct ?? 0;
  const holdings = data?.holdings ?? (Array.isArray(data) ? data : []);

  const isProfit = Number(total_profit) >= 0;

  // DataTable column definitions for Holdings Breakdown
  const columns = [
    {
      key: 'stock_symbol',
      label: 'Stock',
      sortable: true,
      headerClassName: 'ps-4',
      render: (h) => (
        <div className="d-flex align-items-center gap-3 ps-3">
          <div className="stock-avatar">
            {h.stock_symbol ? h.stock_symbol.substring(0, 2) : '--'}
          </div>
          <div>
            <div className="fw-bold text-theme-primary">{h.stock_symbol}</div>
            <small className="text-theme-secondary">{h.company_name || h.stock_symbol}</small>
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      label: 'Shares',
      sortable: true,
      render: (h) => (
        <span className="badge badge-qty border px-2 py-1 fw-bold">
          {h.quantity} Qty
        </span>
      ),
    },
    {
      key: 'avg_price',
      label: 'Avg. Buy',
      sortable: true,
      render: (h) => (
        <span>
          ₹{Number(h.avg_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'current_price',
      label: 'Market Price',
      sortable: true,
      render: (h) => (
        <span className="fw-bold text-theme-primary">
          ₹{Number(h.current_price || h.avg_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'current_val',
      label: 'Current Value',
      sortable: true,
      render: (h) => {
        const curVal = h.current_val !== undefined ? h.current_val : (h.quantity * (h.current_price || h.avg_price));
        return (
          <span className="fw-bold text-theme-primary">
            ₹{Number(curVal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      key: 'pnl',
      label: 'Unrealized P&L',
      sortable: true,
      headerClassName: 'text-end pe-4',
      render: (h) => {
        const pnl = h.pnl !== undefined ? Number(h.pnl) : 0;
        const pnlPct = h.pnl_pct !== undefined ? Number(h.pnl_pct) : 0;
        const isUp = pnl >= 0;

        return (
          <div className="text-end pe-3">
            <div className={`${isUp ? 'text-success' : 'text-danger'} fw-bold`}>
              {isUp ? '+' : ''}₹{pnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <small className={`${isUp ? 'text-success' : 'text-danger'} fw-semibold`}>
              ({isUp ? '+' : ''}{pnlPct.toFixed(2)}%)
            </small>
          </div>
        );
      },
    },
  ];

  return (
    <Layout>
      {/* 1. Header (1:1 with portfolio.php) */}
      <header className="top-header">
        <div className="d-flex align-items-center gap-3">
          <button
            type="button"
            className="btn-sidebar-toggle"
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            title="Toggle Navigation Menu"
          >
            <i className="bi bi-list"></i>
          </button>
          <div className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 fw-bold">
            <i className="bi bi-pie-chart me-1"></i> Live Holdings Valuation Active
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <ThemeToggle />
          <Link to="/" className="btn btn-sm btn-outline-info">
            Return to Overview
          </Link>
        </div>
      </header>

      {/* 2. Main Body */}
      <main className="dashboard-body">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 fw-bold mb-1 text-theme-primary">Portfolio & Holdings</h1>
            <p className="text-theme-secondary mb-0 small">
              Real-time asset allocations and net profit & loss analysis
            </p>
          </div>
        </div>

        {/* 3 Colorful Summary Row */}
        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="stat-box" style={{ borderTop: '4px solid #2563EB' }}>
              <div className="stat-box-title">Total Current Value</div>
              <div className="stat-box-val">
                ₹{Number(total_current_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <small className="text-theme-secondary">Live Market Valuation</small>
            </div>
          </div>

          <div className="col-md-4">
            <div className="stat-box" style={{ borderTop: '4px solid #64748B' }}>
              <div className="stat-box-title">Total Invested</div>
              <div className="stat-box-val">
                ₹{Number(total_invested || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <small className="text-theme-secondary">Total Capital Deployed</small>
            </div>
          </div>

          <div className="col-md-4">
            <div className="stat-box" style={{ borderTop: '4px solid #10B981' }}>
              <div className="stat-box-title">Total Returns (P&L)</div>
              <div className={`stat-box-val ${isProfit ? 'text-success' : 'text-danger'}`}>
                {isProfit ? '+' : ''}₹
                {Number(total_profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <small className={`${isProfit ? 'text-success' : 'text-danger'} fw-bold`}>
                <i className={`bi ${isProfit ? 'bi-caret-up-fill' : 'bi-caret-down-fill'}`}></i>{' '}
                {isProfit ? '+' : ''}
                {Number(total_profit_pct || 0).toFixed(2)}% Overall Gain
              </small>
            </div>
          </div>
        </div>

        {/* Holdings Table Card converted to DataTable */}
        <div
          className="card border-0 shadow-sm rounded-4 overflow-hidden"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
        >
          <div
            className="card-header py-3 px-4 d-flex justify-content-between align-items-center border-bottom"
            style={{ background: 'transparent', borderColor: 'var(--border-color)' }}
          >
            <span className="fw-bold text-theme-primary">Equity Holdings Breakdown</span>
            <span className="badge bg-primary">{holdings.length} Positions</span>
          </div>

          <div className="card-body p-0">
            <DataTable
              columns={columns}
              data={holdings}
              keyField="id"
              defaultSortField="current_val"
              defaultSortAsc={false}
              defaultPageSize={10}
              pageSizeOptions={[10, 25, 50, 100]}
              searchPlaceholder="Search Holdings, Stock Symbol..."
              emptyMessage="No equity holdings recorded in portfolio."
            />
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default Portfolio;
