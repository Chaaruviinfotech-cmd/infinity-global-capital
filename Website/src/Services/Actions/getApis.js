import { getApi } from '../helper';

/**
 * ====================================================================
 * INFINITY GLOBAL CAPITAL ADMIN - GET ACTIONS
 * ====================================================================
 * Modeled identically after the mobile app's Services/Actions/getApis.js.
 * All GET API calls are dispatched from here into Redux state.
 */

// 1. Fetch Admin Dashboard Overview & Metrics
export const fetchDashboardAction = () => {
  return async (dispatch) => {
    try {
      const res = await getApi('admin_dashboard.php');
      if (res && res.success && res.data) {
        dispatch({
          type: 'SET_DASHBOARD_DATA',
          payload: res.data,
        });
        if (res.data.pending_kyc !== undefined) {
          dispatch({
            type: 'SET_PENDING_KYC',
            payload: res.data.pending_kyc,
          });
        }
      }
      return res;
    } catch (error) {
      console.error('[fetchDashboardAction] Error:', error);
      throw error;
    }
  };
};

// 2. Fetch Live Stock Equities & Market Desk
export const fetchMarketsAction = (params = {}) => {
  return async (dispatch) => {
    try {
      const res = await getApi('admin_markets.php', params);
      if (res && res.success && res.data) {
        dispatch({
          type: 'SET_MARKETS_DATA',
          payload: res.data,
        });
      }
      return res;
    } catch (error) {
      console.error('[fetchMarketsAction] Error:', error);
      throw error;
    }
  };
};

// 3. Fetch Portfolio Valuation & Client Holdings
export const fetchPortfolioAction = () => {
  return async (dispatch) => {
    try {
      const res = await getApi('admin_portfolio.php');
      if (res && res.success && res.data) {
        dispatch({
          type: 'SET_PORTFOLIO_DATA',
          payload: res.data,
        });
      }
      return res;
    } catch (error) {
      console.error('[fetchPortfolioAction] Error:', error);
      throw error;
    }
  };
};

// 4. Fetch Order Management System (OMS) Trade Book
export const fetchOrdersAction = () => {
  return async (dispatch) => {
    try {
      const res = await getApi('admin_orders.php');
      if (res && res.success && res.data) {
        dispatch({
          type: 'SET_ORDERS_DATA',
          payload: res.data,
        });
      }
      return res;
    } catch (error) {
      console.error('[fetchOrdersAction] Error:', error);
      throw error;
    }
  };
};

// 5. Fetch Funds Ledger & Bank Passbook Transactions
export const fetchFundsLedgerAction = () => {
  return async (dispatch) => {
    try {
      const res = await getApi('admin_funds_ledger.php');
      if (res && res.success && res.data) {
        dispatch({
          type: 'SET_FUNDS_LEDGER_DATA',
          payload: res.data,
        });
      }
      return res;
    } catch (error) {
      console.error('[fetchFundsLedgerAction] Error:', error);
      throw error;
    }
  };
};

// 6. Fetch Users Directory & KYC Verifications
export const fetchUsersKycAction = () => {
  return async (dispatch) => {
    try {
      const res = await getApi('admin_users.php');
      if (res && res.success && res.data) {
        dispatch({
          type: 'SET_USERS_KYC_DATA',
          payload: res.data,
        });
        if (res.data.pending_kyc !== undefined) {
          dispatch({
            type: 'SET_PENDING_KYC',
            payload: res.data.pending_kyc,
          });
        }
      }
      return res;
    } catch (error) {
      console.error('[fetchUsersKycAction] Error:', error);
      throw error;
    }
  };
};
