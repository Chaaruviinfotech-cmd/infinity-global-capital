import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Loader from './Components/Loader';
import ProtectedRoute from './Components/ProtectedRoute';

/**
 * ====================================================================
 * LAZY ROUTING SETUP (Code Splitting for Optimal Performance)
 * ====================================================================
 * Every page is loaded on demand when visited, keeping initial bundle small.
 */
const Login = lazy(() => import('./Pages/Login'));
const Dashboard = lazy(() => import('./Pages/Dashboard'));
const Markets = lazy(() => import('./Pages/Markets'));
const ManageMarketPrice = lazy(() => import('./Pages/ManageMarketPrice'));
const Portfolio = lazy(() => import('./Pages/Portfolio'));
const Orders = lazy(() => import('./Pages/Orders'));
const FundsLedger = lazy(() => import('./Pages/FundsLedger'));
const UsersKyc = lazy(() => import('./Pages/UsersKyc'));

const App = () => {
  return (
    <Suspense fallback={<Loader text="Loading Terminal Workspace..." />}>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Admin Routes (Wrapped in ProtectedRoute + Master Layout) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/markets"
          element={
            <ProtectedRoute>
              <Markets />
            </ProtectedRoute>
          }
        />

        <Route
          path="/manage-prices"
          element={
            <ProtectedRoute>
              <ManageMarketPrice />
            </ProtectedRoute>
          }
        />

        <Route
          path="/portfolio"
          element={
            <ProtectedRoute>
              <Portfolio />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/funds-ledger"
          element={
            <ProtectedRoute>
              <FundsLedger />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users-kyc"
          element={
            <ProtectedRoute>
              <UsersKyc />
            </ProtectedRoute>
          }
        />

        {/* Fallback 404 Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
