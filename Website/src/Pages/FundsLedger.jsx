import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFundsLedgerAction } from '../Services/Actions/getApis';
import { addFundsAction, sendStatementAction } from '../Services/Actions/postApis';
import Layout from '../Components/Layout';
import DataTable from '../Components/DataTable';
import Loader from '../Components/Loader';
import ThemeToggle from '../Components/ThemeToggle';
import socket from '../Services/socket';

/**
 * 1:1 Replica of PHP admin funds ledger (backend/admin/funds_ledger.php)
 * Featuring Bank Passbook table converted to DataTable, Credit/Debit funds modal,
 * Statement email dispatch modal, and Actions/getApis & postApis matching mobile app architecture.
 */
const FundsLedger = () => {
  const dispatch = useDispatch();
  const { fundsLedgerData } = useSelector((state) => state.igc_data);

  const [loading, setLoading] = useState(!fundsLedgerData);
  const [data, setData] = useState(fundsLedgerData || null);
  const [alertState, setAlertState] = useState({ type: '', message: '' });

  // Add Funds Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingFund, setSubmittingFund] = useState(false);
  const [addForm, setAddForm] = useState({
    user_id: '',
    amount: '',
    type: 'Deposit',
    payment_method: 'UPI / Admin Credit',
    utr_no: '',
  });

  // Statement Email Modal
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedStatementUser, setSelectedStatementUser] = useState('');
  const [sendingStatement, setSendingStatement] = useState(false);

  const loadLedger = React.useCallback(async () => {
    try {
      const res = await dispatch(fetchFundsLedgerAction());
      if (res && res.success && res.data) {
        setData(res.data);
      }
    } catch (e) {
      console.error('Failed to load funds ledger:', e);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadLedger();

    const handleFundsUpdate = () => {
      loadLedger();
    };

    socket.on('FUNDS_UPDATED', handleFundsUpdate);
    socket.on('ORDER_PLACED', handleFundsUpdate);
    socket.on('REFRESH_DATA', handleFundsUpdate);

    return () => {
      socket.off('FUNDS_UPDATED', handleFundsUpdate);
      socket.off('ORDER_PLACED', handleFundsUpdate);
      socket.off('REFRESH_DATA', handleFundsUpdate);
    };
  }, [loadLedger]);

  if (loading && !data) {
    return <Loader text="Loading Bank Passbook & Settlement Ledger..." />;
  }

  const total_deposits = data?.summary?.total_deposits ?? data?.total_deposits ?? 0;
  const total_withdrawals = data?.summary?.total_withdrawals ?? data?.total_withdrawals ?? 0;
  const transactions = data?.transactions ?? (Array.isArray(data) ? data : []);
  const users = data?.users_list ?? data?.users ?? [];

  // Handle Add Funds Form
  const handleAddFunds = async (e) => {
    e.preventDefault();
    if (!addForm.user_id || !addForm.amount) {
      alert('Please select a user and enter amount.');
      return;
    }

    setSubmittingFund(true);
    try {
      const res = await dispatch(addFundsAction(addForm));
      if (res && res.success) {
        setAlertState({
          type: 'success',
          message: res.message || 'Funds updated successfully and transaction slip emailed!',
        });
        setShowAddModal(false);
        setAddForm({
          user_id: '',
          amount: '',
          type: 'Deposit',
          payment_method: 'UPI / Admin Credit',
          utr_no: '',
        });
        loadLedger();
      } else {
        setAlertState({
          type: 'danger',
          message: res?.message || 'Transaction could not be processed.',
        });
      }
    } catch (err) {
      setAlertState({ type: 'danger', message: err.message });
    } finally {
      setSubmittingFund(false);
    }
  };

  // Handle Send Statement Email
  const handleSendStatement = async (e) => {
    e.preventDefault();
    if (!selectedStatementUser) {
      alert('Please select a user.');
      return;
    }

    setSendingStatement(true);
    try {
      const res = await dispatch(sendStatementAction(selectedStatementUser));
      if (res && res.success) {
        setAlertState({
          type: 'success',
          message: res.message || 'Official Passbook Statement emailed successfully!',
        });
        setShowStatementModal(false);
      } else {
        setAlertState({
          type: 'danger',
          message: res?.message || 'Failed to dispatch email statement.',
        });
      }
    } catch (err) {
      setAlertState({ type: 'danger', message: err.message });
    } finally {
      setSendingStatement(false);
    }
  };

  // DataTable columns for Bank Passbook
  const columns = [
    {
      key: 'created_at',
      label: 'Value Date & Time',
      sortable: true,
      headerClassName: 'ps-4',
      render: (t) => {
        const dStr = t.created_at
          ? new Date(t.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Live Synced';

        return (
          <div className="ps-3">
            <div className="fw-bold text-theme-primary">{dStr}</div>
            <small className="text-theme-secondary">Settlement Date</small>
          </div>
        );
      },
    },
    {
      key: 'txn_id',
      label: 'UTR / Reference No',
      sortable: true,
      render: (t) => (
        <span className="utr-pill">
          {t.txn_id || `UTR${String(t.id).padStart(8, '0')}`}
        </span>
      ),
    },
    {
      key: 'full_name',
      label: 'Account / User',
      sortable: true,
      searchValue: (t) => `${t.full_name || ''} ${t.mobile || ''} ${t.user_id || ''}`,
      render: (t) => {
        const uName = t.full_name || t.mobile || 'Investor';
        const uidStr = String(t.user_id || 0).padStart(4, '0');
        return (
          <div>
            <div className="fw-bold text-theme-primary">{uName}</div>
            <small className="text-theme-secondary">
              UID: #{uidStr} {t.mobile && `• ${t.mobile}`}
            </small>
          </div>
        );
      },
    },
    {
      key: 'payment_method',
      label: 'Channel / Mode',
      sortable: true,
      render: (t) => (
        <span className="channel-pill">
          <i className="bi bi-wallet2 me-1 text-info"></i>
          {t.payment_method || 'UPI / NetBanking'}
        </span>
      ),
    },
    {
      key: 'type',
      label: 'Dr / Cr',
      sortable: true,
      render: (t) => {
        const isCr = String(t.type).toLowerCase() === 'deposit';
        return isCr ? (
          <span className="badge-cr">
            <i className="bi bi-arrow-down-left me-1"></i>CR
          </span>
        ) : (
          <span className="badge-dr">
            <i className="bi bi-arrow-up-right me-1"></i>DR
          </span>
        );
      },
    },
    {
      key: 'amount',
      label: 'Amount (INR)',
      sortable: true,
      headerClassName: 'text-end',
      render: (t) => {
        const isCr = String(t.type).toLowerCase() === 'deposit';
        return (
          <div className={`text-end fw-bold ${isCr ? 'text-success' : 'text-danger'}`}>
            {isCr ? '+' : '-'}₹
            {Number(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (t) => (
        <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
          {t.status || 'Completed'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Statement Action',
      sortable: false,
      headerClassName: 'text-end pe-4',
      render: (t) => (
        <div className="text-end pe-3">
          <button
            type="button"
            className="btn btn-sm btn-outline-info py-1 px-2.5"
            onClick={() => {
              setSelectedStatementUser(t.user_id);
              setShowStatementModal(true);
            }}
          >
            <i className="bi bi-envelope-paper me-1"></i> Statement
          </button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      {/* 1. Header (1:1 with funds_ledger.php) */}
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
          <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 fw-bold">
            <i className="bi bi-bank me-1"></i> Bank Gateway: Active
          </span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="btn-add-funds-glow"
            onClick={() => setShowAddModal(true)}
          >
            <i className="bi bi-plus-circle-fill"></i> Add / Credit User Funds
          </button>
        </div>
      </header>

      {/* 2. Main Body */}
      <main className="dashboard-body">
        {alertState.message && (
          <div
            className={`alert alert-${alertState.type} alert-dismissible fade show mb-4`}
            style={{
              background:
                alertState.type === 'success'
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(239, 68, 68, 0.2)',
              borderColor:
                alertState.type === 'success'
                  ? 'rgba(52, 211, 153, 0.4)'
                  : 'rgba(248, 113, 113, 0.4)',
              color: alertState.type === 'success' ? '#6EE7B7' : '#FCA5A5',
            }}
          >
            <i
              className={`bi ${
                alertState.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'
              } me-2`}
            ></i>
            {alertState.message}
            <button
              type="button"
              className="btn-close"
              onClick={() => setAlertState({ type: '', message: '' })}
            ></button>
          </div>
        )}

        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 fw-bold mb-1 text-theme-primary">Funds Ledger & Bank Passbook</h1>
            <p className="text-theme-secondary mb-0 small">
              Official transaction settlement statement, UTR records, and ledger credits
            </p>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-info btn-sm fw-bold px-3 py-2"
              onClick={() => setShowStatementModal(true)}
            >
              <i className="bi bi-envelope-paper-fill me-1"></i> Email Statement
            </button>
            <button
              type="button"
              className="btn btn-outline-success btn-sm fw-bold px-3 py-2"
              onClick={() => setShowAddModal(true)}
            >
              <i className="bi bi-plus-lg me-1"></i> New Transaction
            </button>
          </div>
        </div>

        {/* 2 Stat Widgets */}
        <div className="row g-4 mb-4">
          <div className="col-md-6">
            <div className="stat-widget" style={{ borderTop: '4px solid #10B981' }}>
              <span className="text-theme-secondary text-uppercase fw-bold small">
                Total Platform Deposits (Credits)
              </span>
              <h2 className="text-success fw-bold mt-2">
                ₹{Number(total_deposits || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
          </div>
          <div className="col-md-6">
            <div className="stat-widget" style={{ borderTop: '4px solid #EF4444' }}>
              <span className="text-theme-secondary text-uppercase fw-bold small">
                Total Platform Withdrawals (Debits)
              </span>
              <h2 className="text-danger fw-bold mt-2">
                ₹{Number(total_withdrawals || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
          </div>
        </div>

        {/* Bank Passbook Card converted to DataTable */}
        <div
          className="card border-0 shadow-sm rounded-4 overflow-hidden"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
        >
          <div
            className="card-header py-3 px-4 d-flex justify-content-between align-items-center border-bottom text-theme-primary"
            style={{ background: 'transparent', borderColor: 'var(--border-color)' }}
          >
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-journal-text text-info"></i>
              <span className="fw-bold text-theme-primary">Bank Statement / Transaction History</span>
            </div>
            <span className="badge badge-market-stat text-info px-3 py-1">
              Passbook View
            </span>
          </div>

          <div className="card-body p-0">
            <DataTable
              columns={columns}
              data={transactions}
              keyField="id"
              defaultSortField="id"
              defaultSortAsc={false}
              defaultPageSize={10}
              pageSizeOptions={[10, 25, 50, 100]}
              searchPlaceholder="Search UTR, Investor, UID..."
              emptyMessage="No ledger entries found."
            />
          </div>
        </div>
      </main>

      {/* 3. Modal: Add / Credit User Funds */}
      {showAddModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1050 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content modal-content-dark">
              <div className="modal-header border-bottom border-secondary px-4 pt-4 pb-3">
                <h5 className="modal-title fw-bold text-white">
                  <i className="bi bi-wallet2 text-success me-2"></i> Add / Credit User Funds
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>

              <form onSubmit={handleAddFunds}>
                <div className="modal-body px-4 py-3">
                  <div className="mb-3">
                    <label className="form-label-custom">Select Investor Account</label>
                    <select
                      className="form-select form-select-dark"
                      value={addForm.user_id}
                      onChange={(e) => setAddForm({ ...addForm, user_id: e.target.value })}
                      required
                    >
                      <option value="">-- Choose User --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          UID: #{String(u.id).padStart(4, '0')} — {u.full_name || u.mobile} ({u.email || 'No email'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label-custom">Transaction Type</label>
                    <select
                      className="form-select form-select-dark"
                      value={addForm.type}
                      onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
                    >
                      <option value="Deposit">Deposit (Credit to Wallet)</option>
                      <option value="Withdrawal">Withdrawal (Debit from Wallet)</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label-custom">Amount (INR)</label>
                    <div className="input-group">
                      <span className="input-group-text bg-dark border-secondary text-success fw-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="1"
                        className="form-control form-control-dark fs-5 fw-bold"
                        placeholder="50000"
                        value={addForm.amount}
                        onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label-custom">Payment Mode / Channel</label>
                    <input
                      type="text"
                      className="form-control form-control-dark"
                      placeholder="UPI / Admin Credit / IMPS"
                      value={addForm.payment_method}
                      onChange={(e) => setAddForm({ ...addForm, payment_method: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label-custom">UTR / Reference ID (Optional)</label>
                    <input
                      type="text"
                      className="form-control form-control-dark"
                      placeholder="Leave blank to auto-generate"
                      value={addForm.utr_no}
                      onChange={(e) => setAddForm({ ...addForm, utr_no: e.target.value })}
                    />
                  </div>

                  <div className="form-text text-white small">
                    <i className="bi bi-shield-check text-info me-1"></i>
                    Official Transaction Slip will be automatically emailed to the user.
                  </div>
                </div>

                <div className="modal-footer border-top border-secondary px-4 py-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success fw-bold px-4"
                    disabled={submittingFund}
                  >
                    {submittingFund ? 'Processing...' : 'Confirm & Process'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: Email Bank Statement */}
      {showStatementModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1050 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content modal-content-dark">
              <div className="modal-header border-bottom border-secondary px-4 pt-4 pb-3">
                <h5 className="modal-title fw-bold text-white">
                  <i className="bi bi-envelope-paper text-info me-2"></i> Email Official Bank Statement
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowStatementModal(false)}
                ></button>
              </div>

              <form onSubmit={handleSendStatement}>
                <div className="modal-body px-4 py-3">
                  <p className="text-white small mb-3">
                    Dispatches official certified passbook statement with balance sheet, ledger transactions, and clearing desk certification directly to the user's email with a <strong>formal PDF attachment</strong>.
                  </p>

                  <div className="mb-3">
                    <label className="form-label-custom">Select Investor Account</label>
                    <select
                      className="form-select form-select-dark"
                      value={selectedStatementUser}
                      onChange={(e) => setSelectedStatementUser(e.target.value)}
                      required
                    >
                      <option value="">-- Choose User --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          UID: #{String(u.id).padStart(4, '0')} — {u.full_name || u.mobile} ({u.email || 'No email'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="modal-footer border-top border-secondary px-4 py-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowStatementModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-info text-dark fw-bold px-4"
                    disabled={sendingStatement}
                  >
                    <i className="bi bi-file-earmark-pdf-fill me-1"></i>
                    {sendingStatement ? 'Sending PDF Statement...' : 'Send Statement Email (PDF)'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default FundsLedger;
