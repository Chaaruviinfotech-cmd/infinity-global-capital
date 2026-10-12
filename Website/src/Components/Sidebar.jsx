import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutAdminAction } from '../Services/Actions/postApis';
import ThemeToggle from './ThemeToggle';

/**
 * 1:1 PHP Admin Sidebar with Open/Close Toggle & Responsive Drawer
 */
const Sidebar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { admin, pendingKycCount, sidebarOpen } = useSelector((state) => state.igc_data);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out from Admin Panel?')) {
      dispatch(logoutAdminAction());
      navigate('/login');
    }
  };

  const handleNavClick = () => {
    if (window.innerWidth < 992) {
      dispatch({ type: 'CLOSE_SIDEBAR' });
    }
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? 'show' : 'collapsed'}`}>
      {/* Brand Header Row with Mobile Close Button */}
      <div className="brand-header-row">
        <NavLink to="/" className="brand-logo" onClick={handleNavClick}>
          <span>∞</span> INFINITY <b>CAPITAL</b>
        </NavLink>
        <button
          type="button"
          className="btn-close-sidebar d-lg-none"
          onClick={() => dispatch({ type: 'CLOSE_SIDEBAR' })}
          title="Close Navigation"
        >
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      {/* User Pill */}
      <div className="user-pill">
        <div className="user-avatar">
          {admin?.username ? admin.username.substring(0, 2).toUpperCase() : 'HR'}
        </div>
        <div>
          <div className="user-info-name">{admin?.username || 'HR Investor'}</div>
          <div className="user-info-role">
            <span className="status-dot"></span> Premium Account
          </div>
        </div>
      </div>

      {/* Menu */}
      <ul className="sidebar-menu">
        <li>
          <NavLink
            to="/"
            end
            onClick={handleNavClick}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <i className="bi bi-grid-fill"></i> Overview
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/markets"
            onClick={handleNavClick}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <i className="bi bi-graph-up-arrow"></i> Markets
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/portfolio"
            onClick={handleNavClick}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <i className="bi bi-pie-chart-fill"></i> Portfolio
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/orders"
            onClick={handleNavClick}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <i className="bi bi-arrow-left-right"></i> Orders
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/funds-ledger"
            onClick={handleNavClick}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <i className="bi bi-wallet-fill"></i> Funds Ledger
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/users-kyc"
            onClick={handleNavClick}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <i className="bi bi-person-check-fill"></i> KYC & Profile
            {pendingKycCount > 0 && (
              <span className="badge bg-danger rounded-pill ms-auto">
                {pendingKycCount}
              </span>
            )}
          </NavLink>
        </li>
      </ul>

      {/* Footer */}
      <div className="sidebar-footer">
        <ThemeToggle className="w-100 justify-content-center mb-2" showLabel={true} />
        <button type="button" onClick={handleLogout} className="logout-link">
          <i className="bi bi-box-arrow-left"></i> Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
