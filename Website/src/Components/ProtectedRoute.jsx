import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * Route Guard Component
 * Ensures unauthenticated users cannot access administrative dashboards.
 */
const ProtectedRoute = ({ children }) => {
  const { admin } = useSelector((state) => state.igc_data);

  if (!admin) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
