const initialState = {
    user: null,
    dashboardData: null,
    portfolioData: null,
    fundsData: null,
    watchlistData: [],
    ordersData: [],
};

const actionReducers = (state = initialState, action) => {
    switch (action.type) {
        case 'SET_USER':
            return { ...state, user: action.payload };
        case 'LOGOUT_USER':
            return { ...state, user: null };
        case 'SET_DASHBOARD_DATA':
            return { ...state, dashboardData: action.payload };
        case 'SET_PORTFOLIO_DATA':
            return { ...state, portfolioData: action.payload };
        case 'SET_FUNDS_DATA':
            return { ...state, fundsData: action.payload };
        case 'SET_WATCHLIST_DATA':
            return { ...state, watchlistData: action.payload };
        case 'SET_ORDERS_DATA':
            return { ...state, ordersData: action.payload };
        default:
            return state;
    }
};

export default actionReducers;
