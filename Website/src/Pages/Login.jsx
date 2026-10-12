import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginAdminAction } from '../Services/Actions/postApis';

/**
 * 1:1 Replica of PHP admin login (backend/admin/index.php)
 * Featuring ambient glowing lights, institutional glassmorphism card,
 * and Actions/postApis authentication matching mobile app architecture.
 */
const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [email, setEmail] = useState('admin@infinityglobal.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await dispatch(loginAdminAction(email, password));
      if (res && res.success) {
        navigate('/');
      } else {
        setError(res?.message || 'Invalid credentials. Use admin@infinityglobal.com / admin123');
      }
    } catch (err) {
      setError(err.message || 'Server connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-body-wrapper">
      {/* Ambient Lights */}
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <div className="login-card">
        {/* Brand Pill */}
        <div className="brand-badge">
          <span className="brand-infinity">∞</span>
          <span className="brand-text-login">INFINITY GLOBAL CAPITAL</span>
        </div>

        <h1 className="title">Welcome back</h1>
        <p className="subtitle">
          Secure institutional portal for trade management, risk governance & operations.
        </p>

        {error && (
          <div
            className="alert alert-danger py-2 text-center"
            style={{
              fontSize: '13px',
              background: 'rgba(239, 68, 68, 0.2)',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              color: '#FCA5A5',
            }}
          >
            <i className="bi bi-exclamation-triangle-fill me-1"></i> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group-custom">
            <label className="form-label-login">Admin Email or Username</label>
            <div style={{ position: 'relative' }}>
              <i className="bi bi-envelope-fill input-icon"></i>
              <input
                type="text"
                className="form-control-login"
                placeholder="admin@infinityglobal.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group-custom">
            <label className="form-label-login">Access Password</label>
            <div style={{ position: 'relative' }}>
              <i className="bi bi-shield-lock-fill input-icon"></i>
              <input
                type="password"
                className="form-control-login"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn-gradient" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign in to Dashboard</span>
                <i className="bi bi-arrow-right"></i>
              </>
            )}
          </button>
        </form>

        <div className="security-badge">
          <span className="status-dot"></span>
          <span>256-Bit SSL Encrypted · Institutional Security</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
