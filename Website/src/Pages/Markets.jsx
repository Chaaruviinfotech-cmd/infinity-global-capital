import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMarketsAction } from '../Services/Actions/getApis';
import { 
  updateMarketPriceAction, 
  createMarketStockAction, 
  deleteMarketStockAction 
} from '../Services/Actions/postApis';
import Layout from '../Components/Layout';
import DataTable from '../Components/DataTable';
import Loader from '../Components/Loader';
import ThemeToggle from '../Components/ThemeToggle';

/**
 * 1:1 Replica of PHP admin markets desk (backend/admin/markets.php)
 * Featuring Live Price Desk, Index cards, full DataTable with horizontal scroll,
 * and Edit Price modal with automatic change calculation.
 * Fully integrated with Services/Actions/getApis.js and postApis.js.
 */
const Markets = () => {
  const dispatch = useDispatch();
  const { marketsData } = useSelector((state) => state.igc_data);

  const [loading, setLoading] = useState(!marketsData);
  const [stocks, setStocks] = useState(
    Array.isArray(marketsData) ? marketsData : marketsData?.stocks || []
  );
  const [inlineEditMode, setInlineEditMode] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStock, setEditStock] = useState(null);
  const [modalForm, setModalForm] = useState({
    stock_id: '',
    symbol: '',
    company_name: '',
    current_price: '',
    prev_close: '',
    day_change: '',
    day_change_percent: '',
    high_price: '',
    low_price: '',
    sector: '',
    auto_calc: true,
  });

  // Add Stock Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    symbol: '',
    company_name: '',
    current_price: '',
    prev_close: '',
    day_change: '',
    day_change_percent: '',
    high_price: '',
    low_price: '',
    sector: 'Banking',
    volume: '1.5M',
    auto_calc: true,
  });

  // Inline inputs state
  const [inlineValues, setInlineValues] = useState({});

  const loadMarkets = React.useCallback(async () => {
    try {
      const res = await dispatch(fetchMarketsAction());
      if (res && res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.stocks || []);
        setStocks(list);
      }
    } catch (e) {
      console.error('Failed to load markets:', e);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  // Compute gainers/losers count
  const { gainersCount, losersCount } = useMemo(() => {
    let g = 0;
    let l = 0;
    stocks.forEach((s) => {
      if (s.is_up || Number(s.day_change) >= 0) g++;
      else l++;
    });
    return { gainersCount: g, losersCount: l };
  }, [stocks]);

  // Auto-calculation logic for modal form
  const handleModalPriceChange = (field, val) => {
    const updated = { ...modalForm, [field]: val };

    if (updated.auto_calc) {
      const ltp = parseFloat(field === 'current_price' ? val : updated.current_price) || 0;
      const prev = parseFloat(field === 'prev_close' ? val : updated.prev_close) || ltp;

      if (prev > 0) {
        const diff = Number((ltp - prev).toFixed(2));
        const pct = Number(((diff / prev) * 100).toFixed(2));
        updated.day_change = diff;
        updated.day_change_percent = pct;
      }
    }
    setModalForm(updated);
  };

  const openEditModal = (stk) => {
    setEditStock(stk);
    setModalForm({
      stock_id: stk.id,
      symbol: stk.symbol,
      company_name: stk.company_name,
      current_price: stk.current_price,
      prev_close: stk.prev_close || stk.current_price,
      day_change: stk.day_change || 0,
      day_change_percent: stk.day_change_percent || 0,
      high_price: stk.high_price || stk.current_price,
      low_price: stk.low_price || stk.current_price,
      sector: stk.sector || 'Equities',
      auto_calc: true,
    });
    setShowEditModal(true);
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    try {
      const res = await dispatch(updateMarketPriceAction(modalForm));
      if (res && res.success) {
        setToastMessage({
          title: 'Price Updated',
          body: `Real market price for ${modalForm.symbol} updated to ₹${modalForm.current_price}`,
        });
        setShowEditModal(false);
        loadMarkets();
      } else {
        alert(res?.message || 'Failed to update price');
      }
    } catch (err) {
      alert(err.message || 'Error updating price');
    }
  };

  const handleAddPriceChange = (field, val) => {
    const updated = { ...addForm, [field]: val };

    if (updated.auto_calc) {
      const ltp = parseFloat(field === 'current_price' ? val : updated.current_price) || 0;
      const prev = parseFloat(field === 'prev_close' ? val : updated.prev_close) || ltp;

      if (prev > 0) {
        const diff = Number((ltp - prev).toFixed(2));
        const pct = Number(((diff / prev) * 100).toFixed(2));
        updated.day_change = diff;
        updated.day_change_percent = pct;
        if (!updated.high_price || parseFloat(updated.high_price) < ltp) updated.high_price = ltp;
        if (!updated.low_price || parseFloat(updated.low_price) > ltp) updated.low_price = ltp;
      }
    }
    setAddForm(updated);
  };

  const handleCreateStock = async (e) => {
    e.preventDefault();
    if (!addForm.symbol || !addForm.current_price) {
      alert('Symbol and Current Price are required.');
      return;
    }
    try {
      const res = await dispatch(createMarketStockAction(addForm));
      if (res && res.success) {
        setToastMessage({
          title: 'Stock Added Successfully',
          body: `${addForm.symbol.toUpperCase()} has been added to the market registry.`,
        });
        setShowAddModal(false);
        setAddForm({
          symbol: '',
          company_name: '',
          current_price: '',
          prev_close: '',
          day_change: '',
          day_change_percent: '',
          high_price: '',
          low_price: '',
          sector: 'Banking',
          volume: '1.5M',
          auto_calc: true,
        });
        loadMarkets();
      } else {
        alert(res?.message || 'Failed to add stock');
      }
    } catch (err) {
      alert(err.message || 'Error creating stock');
    }
  };

  const handleDeleteStock = async (stk) => {
    if (!window.confirm(`Are you sure you want to delete ${stk.symbol} (${stk.company_name}) from the market?`)) {
      return;
    }
    try {
      const res = await dispatch(deleteMarketStockAction(stk.id, stk.symbol));
      if (res && res.success) {
        setToastMessage({
          title: 'Stock Deleted',
          body: `${stk.symbol} was removed from the market.`,
        });
        loadMarkets();
      } else {
        alert(res?.message || 'Failed to delete stock');
      }
    } catch (err) {
      alert(err.message || 'Error deleting stock');
    }
  };

  const handleSaveInline = async (stk) => {
    const newPrice = inlineValues[stk.id];
    if (!newPrice) return;

    const prevClose = stk.prev_close || stk.current_price;
    const dayChange = Number((newPrice - prevClose).toFixed(2));
    const dayPct = prevClose > 0 ? Number(((dayChange / prevClose) * 100).toFixed(2)) : 0;

    const payload = {
      stock_id: stk.id,
      symbol: stk.symbol,
      current_price: newPrice,
      prev_close: prevClose,
      day_change: dayChange,
      day_change_percent: dayPct,
      auto_calc: 1,
    };

    const res = await dispatch(updateMarketPriceAction(payload));
    if (res && res.success) {
      setToastMessage({
        title: 'Price Synced',
        body: `${stk.symbol} updated to ₹${newPrice}`,
      });
      loadMarkets();
    }
  };

  if (loading && stocks.length === 0) {
    return <Loader text="Connecting to Real-Time Manual Price Desk..." />;
  }

  // DataTable column definitions
  const columns = [
    {
      key: 'symbol',
      label: 'Stock',
      sortable: true,
      headerClassName: 'ps-4',
      style: { minWidth: '230px' },
      render: (s) => (
        <div className="d-flex align-items-center gap-2.5 ps-3">
          <div className="stock-badge">
            {s.symbol ? s.symbol.substring(0, 2) : '--'}
          </div>
          <div style={{ minWidth: 0 }}>
            <span className="stock-symbol-text d-block">{s.symbol}</span>
            <span className="stock-company-text d-block">{s.company_name}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'sector',
      label: 'Sector',
      sortable: true,
      style: { minWidth: '130px' },
      render: (s) => (
        <span
          className="badge bg-dark text-info border border-secondary px-2 py-1 fw-bold"
          style={{ fontSize: '11px' }}
        >
          {s.sector || 'Equities'}
        </span>
      ),
    },
    {
      key: 'current_price',
      label: 'Live Price (LTP)',
      sortable: true,
      style: { minWidth: '160px' },
      render: (s) => {
        if (inlineEditMode) {
          return (
            <div className="input-group input-group-sm" style={{ width: '135px' }}>
              <span className="input-group-text bg-dark text-white border-secondary">₹</span>
              <input
                type="number"
                step="0.05"
                className="form-control form-control-sm bg-dark text-white border-info fw-bold"
                defaultValue={s.current_price}
                onChange={(e) =>
                  setInlineValues({ ...inlineValues, [s.id]: parseFloat(e.target.value) })
                }
              />
              <button
                className="btn btn-sm btn-info text-dark fw-bold"
                type="button"
                onClick={() => handleSaveInline(s)}
              >
                <i className="bi bi-check-lg"></i>
              </button>
            </div>
          );
        }
        return (
          <span className="val-price-display">
            ₹{Number(s.current_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      key: 'prev_close',
      label: 'Prev Close',
      sortable: true,
      style: { minWidth: '130px' },
      render: (s) => (
        <span className="val-prevclose-display">
          ₹{Number(s.prev_close || s.current_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'high_price',
      label: 'Day High / Low',
      sortable: false,
      style: { minWidth: '150px' },
      render: (s) => (
        <div className="val-highlow-display">
          <div className="text-success" style={{ color: '#34D399' }}>
            <i className="bi bi-arrow-up-short"></i>H: ₹
            {Number(s.high_price || s.current_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-danger" style={{ color: '#FB7185' }}>
            <i className="bi bi-arrow-down-short"></i>L: ₹
            {Number(s.low_price || s.current_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      ),
    },
    {
      key: 'day_change',
      label: 'Day Change & %',
      sortable: true,
      style: { minWidth: '160px' },
      render: (s) => {
        const isUp = s.is_up || Number(s.day_change) >= 0;
        return (
          <span
            className={`badge ${
              isUp
                ? 'bg-success-subtle text-success border border-success-subtle'
                : 'bg-danger-subtle text-danger border border-danger-subtle'
            } px-2.5 py-1.5 fw-bold`}
            style={{ fontSize: '11.5px' }}
          >
            <i className={`bi ${isUp ? 'bi-caret-up-fill' : 'bi-caret-down-fill'} me-1`}></i>
            {isUp ? '+' : ''}
            {Number(s.day_change || 0).toFixed(2)} ({isUp ? '+' : ''}
            {Number(s.day_change_percent || 0).toFixed(2)}%)
          </span>
        );
      },
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      sortable: true,
      style: { minWidth: '140px' },
      render: (s) => (
        <span className="val-updated-display">
          <i className="bi bi-clock me-1 text-info opacity-75"></i>
          {s.updated_at ? new Date(s.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Live Synced'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      headerClassName: 'text-end pe-4',
      style: { minWidth: '190px' },
      render: (s) => (
        <div className="d-inline-flex align-items-center gap-1.5 justify-content-end w-100 pe-3">
          <button
            type="button"
            className="btn-edit-price"
            onClick={() => openEditModal(s)}
            title="Edit Price & Metrics"
          >
            <i className="bi bi-pencil-square"></i>
            <span>Edit</span>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger border border-danger-subtle rounded-pill px-2.5 py-1 ms-1"
            onClick={() => handleDeleteStock(s)}
            title="Delete Stock"
            style={{ fontSize: '11px', fontWeight: '600' }}
          >
            <i className="bi bi-trash3-fill"></i>
          </button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      {/* 1. Top Header */}
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
            <i className="bi bi-broadcast"></i> Live Exchange: NSE · BSE (Real-Time Manual Sync)
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="btn btn-sm btn-info text-dark rounded-pill px-3 fw-bold d-flex align-items-center gap-1"
            style={{ background: '#38BDF8', border: 'none' }}
            onClick={() => setShowAddModal(true)}
          >
            <i className="bi bi-plus-circle-fill"></i>
            <span>Add Stock</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${inlineEditMode ? 'btn-info text-dark' : 'btn-outline-info'} rounded-pill px-3 fw-bold`}
            onClick={() => setInlineEditMode(!inlineEditMode)}
          >
            <i className="bi bi-lightning-charge-fill me-1"></i>
            <span>{inlineEditMode ? 'Exit Inline Mode' : 'Quick Inline Edit'}</span>
          </button>
        </div>
      </header>

      {/* 2. Main Dashboard Body */}
      <main className="dashboard-body">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className="alert alert-success bg-dark border border-info text-white shadow-lg rounded-4 p-3 mb-4 d-flex align-items-center"
            role="alert"
          >
            <i className="bi bi-check-circle-fill text-info fs-4 me-3"></i>
            <div className="flex-grow-1">
              <div className="fw-bold">{toastMessage.title}</div>
              <small className="text-light">{toastMessage.body}</small>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={() => setToastMessage(null)}
            ></button>
          </div>
        )}

        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 fw-bold mb-1 text-theme-primary">Live Stock Markets & Real Price Desk</h1>
            <p className="text-theme-secondary mb-0 small">
              Admin manual control desk: Set real market prices (LTP), daily % changes, and high/low ranges
            </p>
          </div>
          <div className="d-flex gap-2">
            <span className="badge badge-market-stat px-3 py-2 text-info fw-bold">
              <i className="bi bi-check2-circle me-1"></i> {stocks.length} Equities Active
            </span>
            <span className="badge badge-market-stat px-3 py-2 text-success fw-bold">
              <i className="bi bi-arrow-up-circle me-1"></i> {gainersCount} Gainers
            </span>
            <span className="badge badge-market-stat px-3 py-2 text-danger fw-bold">
              <i className="bi bi-arrow-down-circle me-1"></i> {losersCount} Losers
            </span>
          </div>
        </div>

        {/* Market Indices Row */}
        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="index-card" style={{ borderTop: '4px solid #10B981' }}>
              <div className="d-flex justify-content-between align-items-center">
                <span className="index-name">NIFTY 50</span>
                <span className="badge bg-success-subtle text-success fw-bold">NSE LIVE</span>
              </div>
              <div className="index-val">25,420.35</div>
              <div className="index-change">
                <i className="bi bi-arrow-up-right"></i> +207.45 (+0.82%) Today
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="index-card" style={{ borderTop: '4px solid #2563EB' }}>
              <div className="d-flex justify-content-between align-items-center">
                <span className="index-name">SENSEX</span>
                <span className="badge bg-primary-subtle text-primary fw-bold">BSE LIVE</span>
              </div>
              <div className="index-val">83,210.44</div>
              <div className="index-change">
                <i className="bi bi-arrow-up-right"></i> +586.20 (+0.71%) Today
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="index-card" style={{ borderTop: '4px solid #8B5CF6' }}>
              <div className="d-flex justify-content-between align-items-center">
                <span className="index-name">BANK NIFTY</span>
                <span
                  className="badge bg-purple-subtle fw-bold"
                  style={{ color: '#A78BFA', background: 'rgba(139, 92, 246, 0.2)' }}
                >
                  NSE LIVE
                </span>
              </div>
              <div className="index-val">52,180.10</div>
              <div className="index-change">
                <i className="bi bi-arrow-up-right"></i> +592.80 (+1.15%) Today
              </div>
            </div>
          </div>
        </div>

        {/* Stocks Table Card converted to full DataTable */}
        <div
          className="card border-0 shadow-sm rounded-4 overflow-hidden"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
        >
          <div
            className="card-header py-3 px-4 d-flex justify-content-between align-items-center border-bottom"
            style={{ background: 'var(--card-header)', borderColor: 'var(--border-color)' }}
          >
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold text-theme-primary fs-6">Stock Equities & Live Price Management</span>
              <span className="badge bg-info text-dark fw-bold rounded-pill">
                Real-Time Manual Entry
              </span>
              <span
                className="badge rounded-pill px-2.5 py-1 d-none d-lg-inline-flex align-items-center gap-1.5"
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: '#38BDF8',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  fontSize: '11.5px',
                  fontWeight: '600',
                }}
              >
                <i className="bi bi-arrows-expand" style={{ transform: 'rotate(45deg)' }}></i> Scrollable Table &rarr;
              </span>
            </div>
          </div>

          <div className="card-body p-0">
            <DataTable
              columns={columns}
              data={stocks}
              keyField="id"
              defaultSortField="current_price"
              defaultSortAsc={false}
              defaultPageSize={10}
              pageSizeOptions={[10, 25, 50, 100]}
              searchPlaceholder="Search Symbol, Company, Sector..."
              minWidth="1240px"
              emptyMessage="No equities match your search."
            />
          </div>
        </div>
      </main>

      {/* 3. Edit Real Market Price Modal (1:1 with markets.php modal) */}
      {showEditModal && editStock && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1050 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content modal-content-custom">
              <div className="modal-header border-bottom border-secondary px-4 pt-4 pb-3">
                <div>
                  <h5 className="modal-title fw-bold text-theme-primary mb-0">
                    <i className="bi bi-sliders text-info me-2"></i> Edit Real Market Price
                  </h5>
                  <small className="text-theme-secondary">
                    Enter manual market price (LTP) and adjust change parameters
                  </small>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowEditModal(false)}
                ></button>
              </div>

              <form onSubmit={handleSaveModal}>
                <div className="modal-body px-4 py-3">
                  {/* Top Summary Banner */}
                  <div className="modal-summary-banner d-flex justify-content-between align-items-center p-3 rounded-3 mb-4">
                    <div className="d-flex align-items-center gap-3">
                      <div className="stock-badge fs-5">
                        {modalForm.symbol.substring(0, 2)}
                      </div>
                      <div>
                        <div className="fw-bold text-theme-primary fs-5">{modalForm.symbol}</div>
                        <small className="text-theme-secondary">{modalForm.company_name}</small>
                      </div>
                    </div>
                    <div className="text-end">
                      <span className="badge badge-market-stat text-info px-3 py-1.5">
                        {modalForm.sector}
                      </span>
                    </div>
                  </div>

                  {/* Price Inputs Grid */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label-custom">
                        Current Market Price (LTP) <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text border-secondary text-info fw-bold">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.05"
                          className="form-control form-control-custom fw-bold fs-5"
                          value={modalForm.current_price}
                          onChange={(e) => handleModalPriceChange('current_price', e.target.value)}
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
                          value={modalForm.prev_close}
                          onChange={(e) => handleModalPriceChange('prev_close', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Auto-calc switch */}
                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="autoCalcCheck"
                      checked={modalForm.auto_calc}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, auto_calc: e.target.checked })
                      }
                    />
                    <label className="form-check-label text-white small" htmlFor="autoCalcCheck">
                      Auto-calculate Day Change & % from Previous Close
                    </label>
                  </div>

                  {/* Day Change & High/Low */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label-custom">Day Change (₹)</label>
                      <input
                        type="number"
                        step="0.05"
                        className="form-control form-control-custom"
                        value={modalForm.day_change}
                        disabled={modalForm.auto_calc}
                        onChange={(e) =>
                          setModalForm({ ...modalForm, day_change: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label-custom">Day Change (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-custom"
                        value={modalForm.day_change_percent}
                        disabled={modalForm.auto_calc}
                        onChange={(e) =>
                          setModalForm({ ...modalForm, day_change_percent: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label-custom">Day High (₹)</label>
                      <input
                        type="number"
                        step="0.05"
                        className="form-control form-control-custom text-success fw-bold"
                        value={modalForm.high_price}
                        onChange={(e) =>
                          setModalForm({ ...modalForm, high_price: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label-custom">Day Low (₹)</label>
                      <input
                        type="number"
                        step="0.05"
                        className="form-control form-control-custom text-danger fw-bold"
                        value={modalForm.low_price}
                        onChange={(e) =>
                          setModalForm({ ...modalForm, low_price: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top border-secondary px-4 py-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-4"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-info text-dark fw-bold px-4"
                    style={{ background: '#38BDF8', border: 'none' }}
                  >
                    <i className="bi bi-save me-1"></i> Save Live Price
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* 4. Add Real Market Stock Modal */}
      {showAddModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1050 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content modal-content-custom">
              <div className="modal-header border-bottom border-secondary px-4 pt-4 pb-3">
                <div>
                  <h5 className="modal-title fw-bold text-theme-primary mb-0">
                    <i className="bi bi-plus-circle text-info me-2"></i> Add New Stock to Market Desk
                  </h5>
                  <small className="text-theme-secondary">
                    Register a manual stock with initial price, sector, and exchange parameters
                  </small>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>

              <form onSubmit={handleCreateStock}>
                <div className="modal-body px-4 py-3">
                  {/* Symbol & Company Name */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label-custom">
                        Stock Symbol <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-custom fw-bold text-uppercase"
                        placeholder="e.g. RELIANCE, TCS, ZOMATO"
                        value={addForm.symbol}
                        onChange={(e) => setAddForm({ ...addForm, symbol: e.target.value.toUpperCase() })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label-custom">Company Name</label>
                      <input
                        type="text"
                        className="form-control form-control-custom"
                        placeholder="e.g. Reliance Industries Limited"
                        value={addForm.company_name}
                        onChange={(e) => setAddForm({ ...addForm, company_name: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Sector & Volume */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label-custom">Sector / Category</label>
                      <select
                        className="form-select form-control-custom"
                        value={addForm.sector}
                        onChange={(e) => setAddForm({ ...addForm, sector: e.target.value })}
                      >
                        <option value="Banking">Banking</option>
                        <option value="IT Tech">IT Tech</option>
                        <option value="Automobile">Automobile</option>
                        <option value="Energy">Energy</option>
                        <option value="Pharma">Pharma</option>
                        <option value="Metals">Metals</option>
                        <option value="FMCG">FMCG</option>
                        <option value="Equities">Equities</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label-custom">Trading Volume</label>
                      <input
                        type="text"
                        className="form-control form-control-custom"
                        placeholder="e.g. 2.4M, 850K"
                        value={addForm.volume}
                        onChange={(e) => setAddForm({ ...addForm, volume: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Price Inputs Grid */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label-custom">
                        Current Price (LTP) <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text border-secondary text-info fw-bold">₹</span>
                        <input
                          type="number"
                          step="0.05"
                          className="form-control form-control-custom fw-bold fs-5"
                          placeholder="e.g. 1450.50"
                          value={addForm.current_price}
                          onChange={(e) => handleAddPriceChange('current_price', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label-custom">Previous Close Price</label>
                      <div className="input-group">
                        <span className="input-group-text border-secondary text-theme-primary fw-bold">₹</span>
                        <input
                          type="number"
                          step="0.05"
                          className="form-control form-control-custom"
                          placeholder="e.g. 1400.00"
                          value={addForm.prev_close}
                          onChange={(e) => handleAddPriceChange('prev_close', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Auto-calc switch */}
                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="addAutoCalcCheck"
                      checked={addForm.auto_calc}
                      onChange={(e) => setAddForm({ ...addForm, auto_calc: e.target.checked })}
                    />
                    <label className="form-check-label text-white small" htmlFor="addAutoCalcCheck">
                      Auto-calculate Day Change & % from Previous Close
                    </label>
                  </div>

                  {/* Day Change & % */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label-custom">Day Change (₹)</label>
                      <input
                        type="number"
                        step="0.05"
                        className="form-control form-control-custom"
                        value={addForm.day_change}
                        disabled={addForm.auto_calc}
                        onChange={(e) => setAddForm({ ...addForm, day_change: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label-custom">Day Change (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-custom"
                        value={addForm.day_change_percent}
                        disabled={addForm.auto_calc}
                        onChange={(e) => setAddForm({ ...addForm, day_change_percent: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* High / Low */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label-custom">Day High (₹)</label>
                      <input
                        type="number"
                        step="0.05"
                        className="form-control form-control-custom text-success fw-bold"
                        value={addForm.high_price}
                        onChange={(e) => setAddForm({ ...addForm, high_price: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label-custom">Day Low (₹)</label>
                      <input
                        type="number"
                        step="0.05"
                        className="form-control form-control-custom text-danger fw-bold"
                        value={addForm.low_price}
                        onChange={(e) => setAddForm({ ...addForm, low_price: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top border-secondary px-4 py-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-4"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-info text-dark fw-bold px-4"
                    style={{ background: '#38BDF8', border: 'none' }}
                  >
                    <i className="bi bi-plus-circle me-1"></i> Add Stock to Market
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

export default Markets;
