import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrdersAction } from '../Services/Actions/getApis';
import Layout from '../Components/Layout';
import DataTable from '../Components/DataTable';
import Loader from '../Components/Loader';
import ThemeToggle from '../Components/ThemeToggle';

/**
 * 1:1 Replica of PHP admin OMS (backend/admin/orders.php)
 * Featuring Trade Orders Book converted to DataTable with search, sort, pagination,
 * and Actions/getApis data fetching matching mobile app architecture.
 */
const Orders = () => {
  const dispatch = useDispatch();
  const { ordersData } = useSelector((state) => state.igc_data);

  const [loading, setLoading] = useState(!ordersData);
  const [orders, setOrders] = useState(ordersData || []);

  const loadOrders = React.useCallback(async () => {
    try {
      const res = await dispatch(fetchOrdersAction());
      if (res && res.success && res.data) {
        setOrders(res.data);
      }
    } catch (e) {
      console.error('Failed to load orders:', e);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  if (loading && orders.length === 0) {
    return <Loader text="Loading Order Management System Book & Trades..." />;
  }

  // DataTable column definitions for Orders Book
  const columns = [
    {
      key: 'id',
      label: 'Order ID',
      sortable: true,
      headerClassName: 'ps-4',
      render: (o) => (
        <span className="ps-3">
          <code className="text-info">#ORD-{o.id}</code>
        </span>
      ),
    },
    {
      key: 'stock_symbol',
      label: 'Stock',
      sortable: true,
      render: (o) => <span className="fw-bold text-theme-primary">{o.stock_symbol}</span>,
    },
    {
      key: 'order_type',
      label: 'Side',
      sortable: true,
      render: (o) => {
        const isBuy = String(o.order_type).toUpperCase() === 'BUY';
        return (
          <span
            className={`badge ${isBuy ? 'bg-success' : 'bg-danger'} px-2 py-1 fw-bold`}
          >
            {o.order_type}
          </span>
        );
      },
    },
    {
      key: 'quantity',
      label: 'Qty',
      sortable: true,
      render: (o) => <span className="fw-bold text-theme-primary">{o.quantity}</span>,
    },
    {
      key: 'price',
      label: 'Execution Price',
      sortable: true,
      render: (o) => (
        <span className="fw-bold text-theme-primary">
          ₹{Number(o.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (o) => (
        <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
          {o.status || 'Executed'}
        </span>
      ),
    },
    {
      key: 'full_name',
      label: 'Account / Investor',
      sortable: true,
      searchValue: (o) => `${o.full_name || ''} ${o.mobile || ''} ${o.user_id || ''}`,
      render: (o) => {
        const userName = o.full_name || o.mobile || 'Investor';
        const uidStr = String(o.user_id || 0).padStart(4, '0');
        return (
          <div className="text-theme-secondary fw-medium">
            <div className="fw-bold text-theme-primary">{userName}</div>
            <small className="text-theme-secondary">
              UID: #{uidStr} • <i className="bi bi-phone small text-info"></i> {o.mobile || 'N/A'}
            </small>
          </div>
        );
      },
    },
    {
      key: 'created_at',
      label: 'Timestamp',
      sortable: true,
      headerClassName: 'text-end pe-4',
      render: (o) => {
        const formatted = o.created_at
          ? new Date(o.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Live Synced';

        return (
          <div className="text-end pe-3 text-theme-secondary fw-medium small">
            <i className="bi bi-clock me-1 text-info small"></i>
            {formatted}
          </div>
        );
      },
    },
  ];

  return (
    <Layout>
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
          <div className="badge bg-primary-subtle text-info border border-info-subtle px-3 py-2 fw-bold d-flex align-items-center gap-2">
            <i className="bi bi-shield-check"></i> OMS Trade Execution Book
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      <main className="dashboard-body">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 fw-bold mb-1 text-theme-primary">Order Management System (OMS)</h1>
            <p className="text-theme-secondary mb-0 small">
              Live exchange trade execution audits and order matching book
            </p>
          </div>
        </div>

        {/* Trade Orders Book Card converted to DataTable */}
        <div
          className="card border-0 shadow-sm rounded-4 overflow-hidden"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
        >
          <div
            className="card-header py-3 px-4 d-flex justify-content-between align-items-center border-bottom text-theme-primary"
            style={{ background: 'transparent', borderColor: 'var(--border-color)' }}
          >
            <span className="fw-bold text-theme-primary">Trade Orders Book</span>
            <span className="badge bg-success-subtle text-success border border-success-subtle">
              Engine Active
            </span>
          </div>

          <div className="card-body p-0">
            <DataTable
              columns={columns}
              data={orders}
              keyField="id"
              defaultSortField="id"
              defaultSortAsc={false}
              defaultPageSize={10}
              pageSizeOptions={[10, 25, 50, 100]}
              searchPlaceholder="Search Orders, Stocks, Accounts..."
              emptyMessage="No trade execution records found."
            />
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default Orders;
