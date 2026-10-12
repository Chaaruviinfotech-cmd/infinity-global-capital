import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Sidebar from './Sidebar';

/**
 * Master Admin Layout
 * Wraps protected screens with fixed sidebar and .main-wrapper content container.
 * Supports desktop collapsing and mobile drawer overlay.
 */
const Layout = ({ children }) => {
  const dispatch = useDispatch();
  const { sidebarOpen } = useSelector((state) => state.igc_data);

  return (
    <div className="d-flex min-vh-100" style={{ backgroundColor: 'var(--body-bg)', width: '100%', position: 'relative' }}>
      {/* 1. Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay d-lg-none"
          onClick={() => dispatch({ type: 'CLOSE_SIDEBAR' })}
          title="Click to dismiss menu"
        />
      )}

      {/* 2. Left Fixed Sidebar */}
      <Sidebar />

      {/* 3. Main Content Wrapper */}
      <div className={`main-wrapper ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        {children}
      </div>
    </div>
  );
};

export default Layout;
