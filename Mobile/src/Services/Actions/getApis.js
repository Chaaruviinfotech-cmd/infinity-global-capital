import { getApi } from '../helper';

export const fetchDashboardAction = (userId) => {
    return async (dispatch) => {
        try {
            const res = await getApi(`/get_overview.php?user_id=${userId}`);
            if (res.success) {
                dispatch({ type: 'SET_DASHBOARD_DATA', payload: res.data });
                if (res.data?.user) {
                    dispatch({ type: 'SET_USER', payload: res.data.user });
                }
            }
            return res;
        } catch (error) {
            throw error;
        }
    };
};

export const fetchPortfolioAction = (userId) => {
    return async (dispatch) => {
        try {
            const res = await getApi(`/get_portfolio.php?user_id=${userId}`);
            if (res.success) {
                dispatch({ type: 'SET_PORTFOLIO_DATA', payload: res.data });
            }
            return res;
        } catch (error) {
            throw error;
        }
    };
};

export const fetchFundsAction = (userId) => {
    return async (dispatch) => {
        try {
            const res = await getApi(`/get_funds.php?user_id=${userId}`);
            if (res.success) {
                dispatch({ type: 'SET_FUNDS_DATA', payload: res.data });
            }
            return res;
        } catch (error) {
            throw error;
        }
    };
};

export const fetchWatchlistAction = (category = 'All', search = '') => {
    return async (dispatch) => {
        try {
            const queryParams = new URLSearchParams();
            if (category && category !== 'All') queryParams.append('category', category);
            if (search) queryParams.append('search', search);

            const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
            const res = await getApi(`/get_watchlist.php${queryString}`);
            if (res.success) {
                dispatch({ type: 'SET_WATCHLIST_DATA', payload: res.data });
            }
            return res;
        } catch (error) {
            throw error;
        }
    };
};

export const fetchOrdersAction = (userId = 1) => {
    return async (dispatch) => {
        try {
            const res = await getApi(`/get_orders.php?user_id=${userId}`);
            if (res.success) {
                dispatch({ type: 'SET_ORDERS_DATA', payload: res.data });
            }
            return res;
        } catch (error) {
            throw error;
        }
    };
};