import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * Top Header Component
 * Displays system health indicator, quick shortcuts, and active admin identity.
 */
const Header = () => {
  const navigate = useNavigate();
  const { admin } = useSelector((state) => state.igc_data);

  return (
    <header className="top-header-bar d-flex justify-content-between align-items-center px-4 py-3">
      {/* Left Gateway Status Pill */}
      <div className="d-flex align-items-center gap-3">
        <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 fw-bold d-flex align-items-center gap-2">
          <i className="bi bi-bank fs-6"></i>
          <span>Bank Gateway: Active</span>
        </span>
        <span className="badge bg-primary-subtle text-info border border-info-subtle px-3 py-2 fw-bold d-none d-md-inline-flex align-items-center gap-2">
          <i className="bi bi-shield-check fs-6"></i>
          <span>SEBI / PMLA Protocol Online</span>
        </span>
      </div>

      {/* Right Quick Actions & Admin Badge */}
      <div className="d-flex align-items-center gap-3">
        <button
          onClick={() => navigate('/manage-prices')}
          className="btn btn-sm btn-outline-info fw-bold px-3 py-2 d-none d-sm-inline-flex align-items-center gap-2"
        >
          <i className="bi bi-sliders"></i>
          <span>Price Control</span>
        </button>

        <button
          onClick={() => navigate('/funds-ledger')}
          className="btn-add-funds-glow d-inline-flex align-items-center gap-2"
        >
          <i className="bi bi-plus-circle-fill"></i>
          <span>Add / Credit Funds</span>
        </button>

        <div className="admin-chip d-none d-lg-flex align-items-center gap-2 ps-3 border-start border-secondary border-opacity-25">
          <div className="admin-chip-circle">
            {admin?.username ? admin.username.substring(0, 1).toUpperCase() : 'A'}
          </div>
          <div className="text-start">
            <div className="text-white small fw-bold">{admin?.username || 'Super Admin'}</div>
            <div className="text-white small opacity-75" style={{ fontSize: '11px' }}>
              {admin?.email || 'admin@infinity.com'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
