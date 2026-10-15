import { postApi } from '../helper';

/**
 * ====================================================================
 * INFINITY GLOBAL CAPITAL ADMIN - POST ACTIONS
 * ====================================================================
 * Modeled identically after the mobile app's Services/Actions/postApis.js.
 * All POST API calls are dispatched from here into Redux state.
 */

// 1. Admin Authentication & Login
export const loginAdminAction = (email, password) => {
  return async (dispatch) => {
    try {
      const res = await postApi('admin_auth.php', { email, password });
      const adminData = res?.data || res?.admin;
      if (res && res.success && adminData) {
        dispatch({
          type: 'SET_ADMIN',
          payload: adminData,
        });
      }
      return res;
    } catch (error) {
      console.error('[loginAdminAction] Error:', error);
      throw error;
    }
  };
};

// 2. Admin Logout
export const logoutAdminAction = () => {
  return (dispatch) => {
    dispatch({ type: 'LOGOUT_ADMIN' });
  };
};

// 3. Manage Real Market Stock (Create, Update, Delete)
export const createMarketStockAction = (payload) => {
  return async () => {
    try {
      const res = await postApi('manage_market_stock.php', {
        action: 'create',
        ...payload,
      });
      return res;
    } catch (error) {
      console.error('[createMarketStockAction] Error:', error);
      throw error;
    }
  };
};

export const updateMarketPriceAction = (payload) => {
  return async () => {
    try {
      const res = await postApi('manage_market_stock.php', {
        action: 'update',
        ...payload,
      });
      return res;
    } catch (error) {
      console.error('[updateMarketPriceAction] Error:', error);
      throw error;
    }
  };
};

export const deleteMarketStockAction = (stockId, symbol) => {
  return async () => {
    try {
      const res = await postApi('manage_market_stock.php', {
        action: 'delete',
        id: stockId,
        symbol: symbol,
      });
      return res;
    } catch (error) {
      console.error('[deleteMarketStockAction] Error:', error);
      throw error;
    }
  };
};

export const updateMarketIndexAction = (payload) => {
  return async () => {
    try {
      const res = await postApi('manage_market_stock.php', {
        action: 'update_index',
        ...payload,
      });
      return res;
    } catch (error) {
      console.error('[updateMarketIndexAction] Error:', error);
      throw error;
    }
  };
};

// 4. Add / Credit / Debit Funds (Dispatches Transaction Slip Email)
export const addFundsAction = (payload) => {
  return async () => {
    try {
      const res = await postApi('admin_funds_ledger.php', {
        action: 'admin_add_funds',
        ...payload,
      });
      return res;
    } catch (error) {
      console.error('[addFundsAction] Error:', error);
      throw error;
    }
  };
};

// 5. Send Official Bank Passbook Statement Email
export const sendStatementAction = (userId) => {
  return async () => {
    try {
      const res = await postApi('admin_funds_ledger.php', {
        action: 'admin_send_statement',
        user_id: userId,
      });
      return res;
    } catch (error) {
      console.error('[sendStatementAction] Error:', error);
      throw error;
    }
  };
};

// 6. Approve / Reject User KYC Verification
export const updateKycStatusAction = (kycId, userId, actionType) => {
  return async () => {
    try {
      const res = await postApi('admin_users.php', {
        action: actionType,
        kyc_id: kycId,
        user_id: userId,
      });
      return res;
    } catch (error) {
      console.error('[updateKycStatusAction] Error:', error);
      throw error;
    }
  };
};

export const requestKycAction = (userId) => {
  return async () => {
    try {
      const res = await postApi('admin_users.php', {
        action: 'request_kyc',
        user_id: userId,
      });
      return res;
    } catch (error) {
      console.error('[requestKycAction] Error:', error);
      throw error;
    }
  };
};

export const deleteUserAction = (userId) => {
  return async () => {
    try {
      const res = await postApi('admin_users.php', {
        action: 'delete_user',
        user_id: userId,
      });
      return res;
    } catch (error) {
      console.error('[deleteUserAction] Error:', error);
      throw error;
    }
  };
};

// 7. Order Return / Refund Action
export const returnOrderAction = (orderId, userId) => {
  return async () => {
    try {
      const res = await postApi('admin_orders.php', {
        action: 'return_order',
        order_id: orderId,
        user_id: userId,
      });
      return res;
    } catch (error) {
      console.error('[returnOrderAction] Error:', error);
      throw error;
    }
  };
};

// 8. Sidebar Responsive Toggle Controls
export const toggleSidebarAction = () => ({ type: 'TOGGLE_SIDEBAR' });
export const closeSidebarAction = () => ({ type: 'CLOSE_SIDEBAR' });
export const openSidebarAction = () => ({ type: 'OPEN_SIDEBAR' });
