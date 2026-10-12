import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchMarketsAction } from '../Services/Actions/getApis';
import { updateMarketPriceAction } from '../Services/Actions/postApis';
import Layout from '../Components/Layout';
import Loader from '../Components/Loader';
import ThemeToggle from '../Components/ThemeToggle';

/**
 * 1:1 Replica of PHP admin manual market price control desk (backend/admin/manage_market_price.php)
 * Uses Actions/getApis and Actions/postApis matching mobile app architecture.
 */
const ManageMarketPrice = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const targetSymbol = searchParams.get('symbol');

  const [stocksList, setStocksList] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Form State
  const [form, setForm] = useState({
    stock_id: '',
    symbol: '',
    company_name: '',
    current_price: '',
    prev_close: '',
    high_price: '',
    low_price: '',
    day_change: '',
    day_change_percent: '',
    sector: '',
    auto_calc: true,
  });

  const populateForm = (stock) => {
    setSelectedStock(stock);
    setForm({
      stock_id: stock.id,
      symbol: stock.symbol,
      company_name: stock.company_name,
      current_price: stock.current_price,
      prev_close: stock.prev_close || stock.current_price,
      high_price: stock.high_price || stock.current_price,
      low_price: stock.low_price || stock.current_price,
      day_change: stock.day_change || 0,
      day_change_percent: stock.day_change_percent || 0,
      sector: stock.sector || 'Equities',
      auto_calc: true,
    });
  };

  const loadStocks = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await dispatch(fetchMarketsAction());
      if (res && res.success && res.data) {
        const stocks = Array.isArray(res.data) ? res.data : (res.data.stocks || []);
        setStocksList(stocks);

        let found = null;
        if (targetSymbol) {
          found = stocks.find((s) => s.symbol.toUpperCase() === targetSymbol.toUpperCase());
        }
        if (!found && stocks.length > 0) {
          found = stocks[0];
        }

        if (found) {
          populateForm(found);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [dispatch, targetSymbol]);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  const handleSelectStock = (e) => {
    const symbol = e.target.value;
    const stock = stocksList.find((s) => s.symbol === symbol);
    if (stock) {
      populateForm(stock);
    }
  };

  const handlePriceChange = (val) => {
    const ltp = parseFloat(val) || 0;
    const prev = parseFloat(form.prev_close) || ltp;
    const diff = Number((ltp - prev).toFixed(2));
    const pct = prev > 0 ? Number(((diff / prev) * 100).toFixed(2)) : 0;

    setForm({
      ...form,
      current_price: val,
      day_change: diff,
      day_change_percent: pct,
      high_price: ltp > parseFloat(form.high_price || 0) ? ltp : form.high_price,
      low_price: ltp < parseFloat(form.low_price || Infinity) ? ltp : form.low_price,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const res = await dispatch(updateMarketPriceAction(form));
      if (res && res.success) {
        setFeedback({
          type: 'success',
          message: res.message || `Live Price for ${form.symbol} updated successfully to ₹${form.current_price}!`,
        });
        loadStocks();
      } else {
        setFeedback({
          type: 'danger',
          message: res?.message || 'Failed to update live price',
        });
      }
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message || 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading && stocksList.length === 0) {
    return <Loader text="Loading Live Markets Control Desk..." />;
  }

  const isUp = Number(form.day_change) >= 0;

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
          <div className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 fw-bold d-flex align-items-center gap-2">
            <i className="bi bi-sliders"></i> Real Price Management Control Desk
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <ThemeToggle />
          <Link to="/markets" className="btn btn-sm btn-outline-info fw-bold">
            ← Return to Markets Desk
          </Link>
        </div>
      </header>

      <main className="dashboard-body">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 fw-bold mb-1 text-theme-primary">Manual Market Price Adjustment</h1>
            <p className="text-theme-secondary mb-0 small">
              Real-time manual entry of Last Traded Price (LTP), Daily High/Low, and P&L % change
            </p>
          </div>
        </div>

        {feedback.message && (
          <div
            className={`alert alert-${feedback.type} alert-dismissible fade show rounded-3 mb-4`}
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

        <div className="row g-4">
          {/* Left: Input Form Card */}
          <div className="col-lg-7">
            <div
              className="card border-0 shadow-sm rounded-4 p-4"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
            >
              <form onSubmit={handleSubmit}>
                {/* Stock Selector */}
                <div className="mb-4">
                  <label className="form-label-custom">Select Equity / Stock</label>
                  <select
                    className="form-select form-select-custom fw-bold"
                    value={form.symbol}
                    onChange={handleSelectStock}
                  >
                    {stocksList.map((s) => (
                      <option key={s.id} value={s.symbol}>
                        {s.symbol} — {s.company_name} (₹{s.current_price})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price & Prev Close Grid */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label-custom">
                      Current Price (LTP) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text border-secondary text-info fw-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="0.05"
                        className="form-control form-control-custom fw-bold fs-5"
                        value={form.current_price}
                        onChange={(e) => handlePriceChange(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label-custom">Previous Close Price</label>
                    <div className="input-group">
                      <span className="input-group-text border-secondary text-theme-primary fw-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="0.05"
                        className="form-control form-control-custom"
                        value={form.prev_close}
                        onChange={(e) => setForm({ ...form, prev_close: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Day High / Low */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label-custom">Day High Price (₹)</label>
                    <input
                      type="number"
                      step="0.05"
                      className="form-control form-control-custom text-success fw-bold"
                      value={form.high_price}
                      onChange={(e) => setForm({ ...form, high_price: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label-custom">Day Low Price (₹)</label>
                    <input
                      type="number"
                      step="0.05"
                      className="form-control form-control-custom text-danger fw-bold"
                      value={form.low_price}
                      onChange={(e) => setForm({ ...form, low_price: e.target.value })}
                    />
                  </div>
                </div>

                {/* Sector & Company */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label-custom">Company Name</label>
                    <input
                      type="text"
                      className="form-control form-control-custom"
                      value={form.company_name}
                      onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label-custom">Sector</label>
                    <input
                      type="text"
                      className="form-control form-control-custom"
                      value={form.sector}
                      onChange={(e) => setForm({ ...form, sector: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-gradient"
                  disabled={saving}
                  style={{ width: '100%', marginTop: '0' }}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving Real Price...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-broadcast me-2"></i> Broadcast & Update Live Price
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right: Live Preview Widget */}
          <div className="col-lg-5">
            <div
              className="card border-0 shadow-sm rounded-4 p-4 h-100"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
            >
              <h5 className="fw-bold text-theme-primary mb-3">Live Terminal Preview</h5>
              <p className="text-theme-secondary small mb-4">
                This shows exactly how the stock will appear on user web portals and mobile screens.
              </p>

              <div className="preview-terminal-box p-4 rounded-3 border mb-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="d-flex align-items-center gap-3">
                    <div className="stock-badge fs-5">
                      {form.symbol ? form.symbol.substring(0, 2) : '--'}
                    </div>
                    <div>
                      <div className="fw-bold text-theme-primary fs-5">{form.symbol || 'SYMBOL'}</div>
                      <small className="text-theme-secondary">{form.company_name || 'Company Name'}</small>
                    </div>
                  </div>
                  <span className="badge badge-market-stat text-info px-3 py-1.5">
                    {form.sector || 'Sector'}
                  </span>
                </div>

                <div className="d-flex align-items-baseline justify-content-between border-top border-secondary border-opacity-25 pt-3">
                  <div>
                    <span className="text-theme-secondary small d-block">Real Price (LTP)</span>
                    <span className="fs-3 fw-bold text-theme-primary">
                      ₹{Number(form.current_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-end">
                    <span
                      className={`badge ${
                        isUp ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
                      } px-3 py-2 fw-bold fs-6`}
                    >
                      <i className={`bi ${isUp ? 'bi-caret-up-fill' : 'bi-caret-down-fill'} me-1`}></i>
                      {isUp ? '+' : ''}
                      {form.day_change} ({isUp ? '+' : ''}
                      {form.day_change_percent}%)
                    </span>
                  </div>
                </div>

                <div className="d-flex justify-content-between mt-3 text-theme-secondary small">
                  <div>
                    <span className="text-success fw-bold">H:</span> ₹{form.high_price || '0.00'}
                  </div>
                  <div>
                    <span className="text-danger fw-bold">L:</span> ₹{form.low_price || '0.00'}
                  </div>
                  <div>
                    <span className="text-theme-secondary">Prev:</span> ₹{form.prev_close || '0.00'}
                  </div>
                </div>
              </div>

              <div className="security-badge mt-auto">
                <span className="status-dot"></span>
                <span>Real-Time Manual Synchronizer Engine Active</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default ManageMarketPrice;
