import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrdersAction } from '../Services/Actions/getApis';
import { returnOrderAction } from '../Services/Actions/postApis';
import Layout from '../Components/Layout';
import DataTable from '../Components/DataTable';
import Loader from '../Components/Loader';
import ThemeToggle from '../Components/ThemeToggle';
import socket from '../Services/socket';

/**
 * 1:1 Replica of PHP admin OMS (backend/admin/orders.php)
 * Featuring Trade Orders Book converted to DataTable with search, sort, pagination,
 * real-time sync, and Order Return / Refund capabilities with instant wallet credit.
 */
const Orders = () => {
  const dispatch = useDispatch();
  const { ordersData } = useSelector((state) => state.igc_data);

  const [loading, setLoading] = useState(!ordersData);
  const [orders, setOrders] = useState(ordersData || []);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [actionLoadingId, setActionLoadingId] = useState(null);

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

    const handleOrderEvent = (order) => {
      if (!order) return;
      setOrders((prev) => {
        const orderId = order.id || order.order_id;
        const index = prev.findIndex((o) => (o.id === orderId || o.order_id === orderId));
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...order, status: order.status };
          return updated;
        }
        return [order, ...prev];
      });
    };

    const handleRefresh = (data) => {
      if (!data || data.target === 'orders' || data.target === 'all') {
        loadOrders();
      }
    };

    socket.on('ORDER_PLACED', handleOrderEvent);
    socket.on('ORDER_UPDATED', handleOrderEvent);
    socket.on('REFRESH_DATA', handleRefresh);

    return () => {
      socket.off('ORDER_PLACED', handleOrderEvent);
      socket.off('ORDER_UPDATED', handleOrderEvent);
      socket.off('REFRESH_DATA', handleRefresh);
    };
  }, [loadOrders]);

  const handleReturnOrder = async (order) => {
    const orderId = order.id || order.order_id;
    const uid = order.user_id;
    const totalVal = Number(order.total_amount || (order.quantity * order.price) || 0);
    const amountFormatted = totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const confirmMsg = `Are you sure you want to RETURN Order #ORD-${orderId}?\n\n• Stock: ${order.stock_symbol} (${order.quantity} Shares)\n• Refund Amount: ₹${amountFormatted}\n\nThis amount will be refunded directly into the user's wallet balance and shares will be removed from their portfolio.`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(orderId);
    setFeedback({ type: '', message: '' });

    try {
      const res = await dispatch(returnOrderAction(orderId, uid));
      if (res && res.success) {
        setFeedback({
          type: 'success',
          message: res.message || `Order #ORD-${orderId} has been successfully returned and ₹${amountFormatted} refunded to wallet!`
        });
        loadOrders();
      } else {
        setFeedback({
          type: 'danger',
          message: res?.message || 'Failed to return order.'
        });
      }
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.message || 'Error processing order return.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

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
      render: (o) => {
        const st = String(o.status || '').toUpperCase();
        const isReturned = st === 'RETURNED' || st === 'CANCELLED';
        if (isReturned) {
          return (
            <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">
              <i className="bi bi-arrow-return-left me-1"></i>Returned
            </span>
          );
        }
        return (
          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
            <i className="bi bi-check-circle me-1"></i>{o.status || 'Executed'}
          </span>
        );
      },
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
    {
      key: 'actions',
      label: 'Action',
      sortable: false,
      headerClassName: 'text-center pe-4',
      render: (o) => {
        const st = String(o.status || '').toUpperCase();
        const isReturned = st === 'RETURNED' || st === 'CANCELLED';
        const isLoading = actionLoadingId === (o.id || o.order_id);

        if (isReturned) {
          return (
            <div className="text-center pe-3">
              <span className="badge bg-secondary-subtle text-secondary px-2 py-1 small border">
                <i className="bi bi-lock-fill me-1"></i>Refunded
              </span>
            </div>
          );
        }

        return (
          <div className="text-center pe-3">
            <button
              type="button"
              className="btn btn-sm btn-outline-warning d-inline-flex align-items-center gap-1 px-2 py-1 shadow-sm"
              style={{ fontSize: '0.8rem', borderRadius: '6px' }}
              onClick={() => handleReturnOrder(o)}
              disabled={isLoading}
              title="Return this order and refund total amount to user wallet"
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Refunding...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-return-left"></i>
                  <span>Return Order</span>
                </>
              )}
            </button>
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

        {/* Action Feedback Alert */}
        {feedback.message && (
          <div className={`alert alert-${feedback.type} alert-dismissible fade show rounded-4 shadow-sm mb-4 border`} role="alert">
            <div className="d-flex align-items-center gap-2">
              <i className={`bi ${feedback.type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-danger'} fs-5`}></i>
              <div className="fw-medium">{feedback.message}</div>
            </div>
            <button type="button" className="btn-close" onClick={() => setFeedback({ type: '', message: '' })} aria-label="Close"></button>
          </div>
        )}

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
