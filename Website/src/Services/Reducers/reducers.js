/**
 * ====================================================================
 * REDUX REDUCER - INFINITY GLOBAL CAPITAL ADMIN
 * ====================================================================
 * Beginner-friendly reducer managing admin auth state, live datasets,
 * and KYC notifications.
 */

// Load cached admin from browser local storage if available
const savedAdmin = (() => {
  try {
    const raw = localStorage.getItem('igc_admin_auth');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
})();

// Load cached theme (dark or light)
const savedTheme = (() => {
  try {
    const t = localStorage.getItem('igc_theme') || 'dark';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', t);
    }
    return t;
  } catch (e) {
    return 'dark';
  }
})();

const initialState = {
  admin: savedAdmin,
  theme: savedTheme,
  pendingKycCount: 0,
  sidebarOpen: true,
  dashboardData: null,
  marketsData: null,
  portfolioData: null,
  ordersData: null,
  fundsLedgerData: null,
  usersKycData: null,
};

const reducers = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_ADMIN': {
      try {
        localStorage.setItem('igc_admin_auth', JSON.stringify(action.payload));
      } catch (e) {}
      return {
        ...state,
        admin: action.payload,
      };
    }

    case 'LOGOUT_ADMIN': {
      try {
        localStorage.removeItem('igc_admin_auth');
      } catch (e) {}
      return {
        ...state,
        admin: null,
      };
    }

    case 'SET_PENDING_KYC': {
      return {
        ...state,
        pendingKycCount: action.payload || 0,
      };
    }

    case 'SET_DASHBOARD_DATA': {
      return {
        ...state,
        dashboardData: action.payload,
      };
    }

    case 'SET_MARKETS_DATA': {
      return {
        ...state,
        marketsData: action.payload,
      };
    }

    case 'SET_PORTFOLIO_DATA': {
      return {
        ...state,
        portfolioData: action.payload,
      };
    }

    case 'SET_ORDERS_DATA': {
      return {
        ...state,
        ordersData: action.payload,
      };
    }

    case 'SET_FUNDS_LEDGER_DATA': {
      return {
        ...state,
        fundsLedgerData: action.payload,
      };
    }

    case 'SET_USERS_KYC_DATA': {
      return {
        ...state,
        usersKycData: action.payload,
      };
    }

    case 'TOGGLE_SIDEBAR': {
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen,
      };
    }

    case 'OPEN_SIDEBAR': {
      return {
        ...state,
        sidebarOpen: true,
      };
    }

    case 'CLOSE_SIDEBAR': {
      return {
        ...state,
        sidebarOpen: false,
      };
    }

    case 'TOGGLE_THEME': {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('igc_theme', nextTheme);
      } catch (e) {}
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', nextTheme);
      }
      return {
        ...state,
        theme: nextTheme,
      };
    }

    case 'SET_THEME': {
      const themeValue = action.payload || 'dark';
      try {
        localStorage.setItem('igc_theme', themeValue);
      } catch (e) {}
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', themeValue);
      }
      return {
        ...state,
        theme: themeValue,
      };
    }

    default:
      return state;
  }
};

export default reducers;