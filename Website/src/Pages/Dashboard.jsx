import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardAction } from '../Services/Actions/getApis';
import Layout from '../Components/Layout';
import DataTable from '../Components/DataTable';
import Loader from '../Components/Loader';
import ThemeToggle from '../Components/ThemeToggle';

/**
 * 1:1 Replica of PHP admin dashboard (backend/admin/dashboard.php)
 * Featuring Hero banner, 4 colorful metric cards, DataTable for top gainers,
 * and Actions/getApis data fetching matching mobile app architecture.
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { dashboardData, pendingKycCount } = useSelector((state) => state.igc_data);

  const [loading, setLoading] = useState(!dashboardData);
  const [data, setData] = useState(dashboardData || null);

  const loadDashboard = React.useCallback(async () => {
    try {
      const res = await dispatch(fetchDashboardAction());
      if (res && res.success && res.data) {
        setData(res.data);
      }
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading && !data) {
    return <Loader text="Loading Institutional Dashboard & Asset Valuation..." />;
  }

  const {
    total_users = 0,
    pending_kyc = pendingKycCount || 0,
    available_funds = 0,
    total_invested = 0,
    total_portfolio_value = 0,
    day_pnl = 0,
    day_pnl_pct = 0,
    holdings_count = 0,
    top_gainers = [],
  } = data || {};

  // DataTable columns for Top Market Gainers
  const gainersColumns = [
    {
      key: 'symbol',
      label: 'Stock',
      sortable: true,
      render: (stk) => (
        <div>
          <div className="fw-bold text-theme-primary">{stk.symbol}</div>
          <small className="text-theme-secondary">{stk.company_name}</small>
        </div>
      ),
    },
    {
      key: 'current_price',
      label: 'Price',
      sortable: true,
      render: (stk) => (
        <span className="fw-bold text-theme-primary">
          ₹{Number(stk.current_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'day_change_percent',
      label: 'Change',
      sortable: true,
      render: (stk) => (
        <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
          +{stk.day_change_percent}%
        </span>
      ),
    },
  ];

  return (
    <Layout>
      {/* 1. Header (1:1 with dashboard.php) */}
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
          <div className="market-pill">
            <i className="bi bi-broadcast"></i> Markets Open: NSE · BSE · Global
          </div>
        </div>

        <div className="header-actions d-flex align-items-center gap-2">
          <ThemeToggle />
          <Link to="/funds-ledger" className="btn-add-funds">
            <i className="bi bi-plus-circle me-1"></i> Add Funds
          </Link>
          <span className="badge bg-primary px-3 py-2 fw-bold d-none d-sm-inline-block">Admin Portal</span>
        </div>
      </header>

      {/* 2. Main Body */}
      <main className="dashboard-body">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 fw-bold mb-1 text-theme-primary">Portfolio Overview</h1>
            <p className="text-theme-secondary mb-0 small">
              Real-time investment monitoring and asset valuation
            </p>
          </div>
        </div>

        {/* Colorful Hero Banner */}
        <div className="hero-banner">
          <div className="hero-tag">Total Portfolio Value</div>
          <div className="hero-val">
            ₹ {Number(total_portfolio_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="hero-pnl">
            <i className="bi bi-arrow-up-right"></i> +₹
            {Number(day_pnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} (+
            {day_pnl_pct}%) Today
          </div>

          <div className="hero-footer">
            <div>
              <div className="hero-avail-title">Available Cash Margin</div>
              <div className="hero-avail-val">
                ₹ {Number(available_funds || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <Link to="/funds-ledger" className="btn-manage">
                Manage Funds →
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Colorful Metric Cards */}
        <div className="row g-4">
          <div className="col-md-3 col-sm-6">
            <div className="color-card card-blue">
              <div className="color-card-icon icon-blue">
                <i className="bi bi-cash-stack"></i>
              </div>
              <div className="color-card-title">Invested Amount</div>
              <div className="color-card-val">
                ₹{(Number(total_invested) / 100000).toFixed(2)}L
              </div>
              <div className="color-card-sub text-success">+8.42% Gain</div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="color-card card-green">
              <div className="color-card-icon icon-green">
                <i className="bi bi-lightning-charge-fill"></i>
              </div>
              <div className="color-card-title">Day P&L</div>
              <div className="color-card-val">
                {day_pnl >= 0 ? '+' : ''}₹
                {(Math.abs(Number(day_pnl)) / 100000).toFixed(2)}L
              </div>
              <div className="color-card-sub text-success">
                {(day_pnl_pct >= 0 ? '+' : '') + day_pnl_pct}% Today
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="color-card card-purple">
              <div className="color-card-icon icon-purple">
                <i className="bi bi-graph-up"></i>
              </div>
              <div className="color-card-title">1 Year Return</div>
              <div className="color-card-val">
                +₹{((Number(total_invested) * 0.184) / 100000).toFixed(2)}L
              </div>
              <div className="color-card-sub" style={{ color: '#A78BFA' }}>
                +18.4% Annual
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="color-card card-amber">
              <div className="color-card-icon icon-amber">
                <i className="bi bi-pie-chart"></i>
              </div>
              <div className="color-card-title">Active Holdings</div>
              <div className="color-card-val">{holdings_count} Stocks</div>
              <div className="color-card-sub text-theme-secondary">Diversified Portfolio</div>
            </div>
          </div>
        </div>

        {/* Panels Grid */}
        <div className="row g-4 mt-1">
          {/* Left: Top Market Gainers converted to DataTable */}
          <div className="col-md-7">
            <div className="panel-box mt-0 h-100">
              <div className="panel-box-title">
                <span>Top Market Gainers</span>
                <Link to="/markets" className="text-info text-decoration-none small fw-bold">
                  View Markets →
                </Link>
              </div>
              <DataTable
                columns={gainersColumns}
                data={top_gainers}
                keyField="id"
                defaultPageSize={5}
                pageSizeOptions={[5, 10, 20]}
                showSearch={false}
                showPageSize={false}
                emptyMessage="No market gainers recorded today."
              />
            </div>
          </div>

          {/* Right: Admin Quick Controls */}
          <div className="col-md-5">
            <div className="panel-box mt-0 h-100">
              <div className="panel-box-title">
                <span>Admin Quick Controls</span>
              </div>
              <div className="d-flex flex-column gap-3">
                <Link
                  to="/users-kyc"
                  className="quick-control-item d-flex justify-content-between align-items-center p-3 border rounded-3 text-decoration-none hover-shadow"
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="color-card-icon icon-purple mb-0"
                      style={{ width: '36px', height: '36px' }}
                    >
                      <i className="bi bi-person-badge"></i>
                    </div>
                    <div>
                      <div className="fw-bold text-theme-primary">User KYC Verification</div>
                      <small className="text-theme-secondary">PAN & Bank approvals</small>
                    </div>
                  </div>
                  <span
                    className={`badge ${pending_kyc > 0 ? 'bg-danger' : 'bg-secondary'} rounded-pill`}
                  >
                    {pending_kyc} Pending
                  </span>
                </Link>

                <Link
                  to="/funds-ledger"
                  className="quick-control-item d-flex justify-content-between align-items-center p-3 border rounded-3 text-decoration-none hover-shadow"
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="color-card-icon icon-green mb-0"
                      style={{ width: '36px', height: '36px' }}
                    >
                      <i className="bi bi-wallet2"></i>
                    </div>
                    <div>
                      <div className="fw-bold text-theme-primary">Funds & Ledger</div>
                      <small className="text-theme-secondary">Deposits & Payouts</small>
                    </div>
                  </div>
                  <i className="bi bi-chevron-right text-theme-secondary"></i>
                </Link>

                <Link
                  to="/orders"
                  className="quick-control-item d-flex justify-content-between align-items-center p-3 border rounded-3 text-decoration-none hover-shadow"
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="color-card-icon icon-blue mb-0"
                      style={{ width: '36px', height: '36px' }}
                    >
                      <i className="bi bi-shield-check"></i>
                    </div>
                    <div>
                      <div className="fw-bold text-theme-primary">Order Management (OMS)</div>
                      <small className="text-theme-secondary">Exchange executions</small>
                    </div>
                  </div>
                  <i className="bi bi-chevron-right text-theme-secondary"></i>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default Dashboard;
