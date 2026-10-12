import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsersKycAction } from '../Services/Actions/getApis';
import { updateKycStatusAction, requestKycAction } from '../Services/Actions/postApis';
import Layout from '../Components/Layout';
import DataTable from '../Components/DataTable';
import Loader from '../Components/Loader';
import ThemeToggle from '../Components/ThemeToggle';

/**
 * 1:1 Replica of PHP admin users KYC desk (backend/admin/users.php)
 * Featuring User KYC & Profile table converted to DataTable,
 * Approve/Reject actions, and Actions/getApis & postApis matching mobile app architecture.
 */
const UsersKyc = () => {
  const dispatch = useDispatch();
  const { usersKycData } = useSelector((state) => state.igc_data);

  const [loading, setLoading] = useState(!usersKycData);
  const [users, setUsers] = useState(
    Array.isArray(usersKycData) ? usersKycData : usersKycData?.users || []
  );
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [actionInProgress, setActionInProgress] = useState(null);

  const loadUsers = React.useCallback(async () => {
    try {
      const res = await dispatch(fetchUsersKycAction());
      if (res && res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.users || []);
        setUsers(list);
      }
    } catch (e) {
      console.error('Failed to load users KYC:', e);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleKycAction = async (kycId, userId, actionType) => {
    const confirmMsg =
      actionType === 'approve'
        ? `Are you sure you want to APPROVE KYC for UID #${String(userId).padStart(4, '0')}?`
        : `Are you sure you want to REJECT KYC for UID #${String(userId).padStart(4, '0')}?`;

    if (!window.confirm(confirmMsg)) return;

    setActionInProgress(`${userId}_${actionType}`);
    try {
      const res = await dispatch(updateKycStatusAction(kycId, userId, actionType));
      if (res && res.success) {
        setFeedback({
          type: 'success',
          message: res.message || `KYC status updated to ${actionType.toUpperCase()}!`,
        });
        loadUsers();
      } else {
        setFeedback({
          type: 'danger',
          message: res?.message || 'Failed to update KYC status.',
        });
      }
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRequestKyc = async (userId) => {
    setActionInProgress(`${userId}_request_kyc`);
    try {
      const res = await dispatch(requestKycAction(userId));
      if (res && res.success) {
        setFeedback({
          type: 'success',
          message: res.message || `KYC request alert sent to User #UID-${String(userId).padStart(4, '0')}! Mobile app will display alert.`,
        });
        loadUsers();
      } else {
        setFeedback({
          type: 'danger',
          message: res?.message || 'Failed to send KYC request alert.',
        });
      }
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message });
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading && users.length === 0) {
    return <Loader text="Loading User Directory & KYC Verifications..." />;
  }

  // DataTable column definitions for KYC Table
  const columns = [
    {
      key: 'user_id',
      label: 'User ID',
      sortable: true,
      headerClassName: 'ps-2 ps-sm-3',
      render: (u) => (
        <span className="ps-1 ps-sm-2">
          <span
            className="badge"
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38BDF8',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              fontFamily: 'monospace',
              fontSize: '13px',
              fontWeight: '700',
              padding: '6px 12px',
              borderRadius: '8px',
            }}
          >
            #UID-{String(u.user_id || u.id).padStart(4, '0')}
          </span>
        </span>
      ),
    },
    {
      key: 'mobile',
      label: 'Mobile & Email',
      sortable: true,
      searchValue: (u) => `${u.mobile || ''} ${u.email || ''}`,
      render: (u) => (
        <div className="fw-bold text-theme-primary">
          <div>{u.mobile}</div>
          {u.email && (
            <small className="text-theme-secondary fw-normal" style={{ fontSize: '11px' }}>
              {u.email}
            </small>
          )}
        </div>
      ),
    },
    {
      key: 'full_name',
      label: 'Full Name (KYC)',
      sortable: true,
      render: (u) =>
        u.full_name ? (
          <span className="text-theme-primary fw-semibold">{u.full_name}</span>
        ) : (
          <span className="text-theme-secondary fst-italic">Not Submitted</span>
        ),
    },
    {
      key: 'pan_number',
      label: 'PAN Number',
      sortable: true,
      render: (u) => {
        const isBlank = !u.pan_number || u.pan_number === '-' || u.pan_number.trim() === '';
        if (isBlank) {
          return (
            <span className="d-inline-flex align-items-center gap-1">
              <code className="text-theme-secondary">-</code>
              <span className="badge bg-danger-subtle text-danger border border-danger-subtle" style={{ fontSize: '10.5px' }}>
                Blank PAN
              </span>
            </span>
          );
        }
        return <code className="text-info fw-bold">{u.pan_number}</code>;
      },
    },
    {
      key: 'kyc_status',
      label: 'KYC Status',
      sortable: true,
      render: (u) => {
        const st = u.kyc_status || 'Pending';
        if (st === 'Pending') {
          return (
            <div>
              <span className="badge bg-warning text-dark px-2 py-1">Pending</span>
              {u.kyc_requested == 1 && (
                <div>
                  <span className="badge bg-info-subtle text-info border border-info-subtle mt-1" style={{ fontSize: '10px' }}>
                    <i className="bi bi-bell-fill me-1"></i>Requested
                  </span>
                </div>
              )}
            </div>
          );
        }
        if (st === 'Approved')
          return <span className="badge bg-success px-2 py-1">Approved</span>;
        if (st === 'Rejected')
          return <span className="badge bg-danger px-2 py-1">Rejected</span>;
        return <span className="badge bg-secondary px-2 py-1">No Data</span>;
      },
    },
    {
      key: 'actions',
      label: 'Action',
      sortable: false,
      headerClassName: 'text-end pe-4',
      render: (u) => {
        const isPanBlank = !u.pan_number || u.pan_number === '-' || u.pan_number.trim() === '';
        const isPending = !u.kyc_status || u.kyc_status === 'Pending';
        const isApproving = actionInProgress === `${u.user_id}_approve`;
        const isRejecting = actionInProgress === `${u.user_id}_reject`;
        const isRequestingKyc = actionInProgress === `${u.user_id}_request_kyc`;

        return (
          <div className="text-end pe-3">
            {isPanBlank ? (
              // CASE 1: PAN is Blank -> Show "Request KYC" button
              <button
                type="button"
                className="btn btn-sm btn-warning text-dark fw-bold px-3 d-inline-flex align-items-center gap-1 shadow-sm"
                style={{ background: '#F59E0B', border: 'none', borderRadius: '8px' }}
                disabled={isRequestingKyc}
                onClick={() => handleRequestKyc(u.user_id)}
                title="Send KYC completion alert to user mobile app"
              >
                <i className="bi bi-bell-fill"></i>
                {isRequestingKyc ? 'Requesting...' : (u.kyc_requested ? 'Re-Request KYC' : 'Request KYC')}
              </button>
            ) : isPending ? (
              // CASE 2: PAN is Submitted & Pending -> Show Approve & Reject
              <div className="d-inline-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-success px-3 fw-bold"
                  disabled={isApproving || isRejecting}
                  onClick={() => handleKycAction(u.kyc_id, u.user_id, 'approve')}
                >
                  {isApproving ? '...' : 'Approve'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger px-3 fw-bold"
                  disabled={isApproving || isRejecting}
                  onClick={() => handleKycAction(u.kyc_id, u.user_id, 'reject')}
                >
                  {isRejecting ? '...' : 'Reject'}
                </button>
              </div>
            ) : (
              // CASE 3: Approved / Verified
              <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1.5 fw-bold">
                <i className="bi bi-check2-circle me-1"></i>Verified
              </span>
            )}
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
          <div className="badge bg-purple-subtle border px-3 py-2 fw-bold d-flex align-items-center gap-2" style={{ color: '#A78BFA', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
            <i className="bi bi-person-badge"></i> User Identity & KYC Verification Desk
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      <main className="dashboard-body">
        <h1 className="h3 fw-bold mb-4 text-theme-primary">Manage User KYC & Verification</h1>

        {feedback.message && (
          <div
            className={`alert alert-${feedback.type} alert-dismissible fade show mb-4`}
            style={{
              background:
                feedback.type === 'success'
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(239, 68, 68, 0.2)',
              borderColor:
                feedback.type === 'success'
                  ? 'rgba(52, 211, 153, 0.4)'
                  : 'rgba(248, 113, 113, 0.4)',
              color: feedback.type === 'success' ? '#6EE7B7' : '#FCA5A5',
            }}
          >
            <i
              className={`bi ${
                feedback.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'
              } me-2`}
            ></i>
            {feedback.message}
            <button
              type="button"
              className="btn-close"
              onClick={() => setFeedback({ type: '', message: '' })}
            ></button>
          </div>
        )}

        {/* KYC Card converted to DataTable */}
        <div
          className="card border-0 shadow-sm rounded-4 overflow-hidden"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
        >
          <div className="card-body p-0">
            <DataTable
              columns={columns}
              data={users}
              keyField="user_id"
              defaultSortField="user_id"
              defaultSortAsc={true}
              defaultPageSize={10}
              pageSizeOptions={[10, 25, 50, 100]}
              searchPlaceholder="Search UID, Name, PAN, Mobile..."
              emptyMessage="No users registered in directory."
            />
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default UsersKyc;
