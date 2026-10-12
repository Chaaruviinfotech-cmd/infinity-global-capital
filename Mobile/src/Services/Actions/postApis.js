import { postApi } from '../helper';

export const loginUserAction = (mobile, email = '') => {
    return async (dispatch) => {
        try {
            const payload = { mobile };
            if (email) {
                payload.email = email;
            }
            const res = await postApi('/login.php', payload);
            if (res && res.success && res.data) {
                dispatch({ type: 'SET_USER', payload: res.data });
            }
            return res;
        } catch (error) {
            throw error;
        }
    };
};

export const registerUserAction = (mobile, email) => {
    return async (dispatch) => {
        try {
            const payload = { mobile, email };
            const res = await postApi('/register.php', payload);
            console.log("registerUserAction response:", res);
            return res;
        } catch (error) {
            console.log("registerUserAction response error:", error); 
            throw error;
        }
    };
};

export const verifyOtpAction = (mobile, otp, email = '') => {
    return async () => {
        try {
            const payload = { mobile, otp };
            if (email) {
                payload.email = email;
            }
            const res = await postApi('/verify_otp.php', payload);
            return res;
        } catch (error) {
            throw error;
        }
    };
};

export const submitKycAction = (dataObj) => {
    return async (dispatch) => {
        try {
            const res = await postApi('/submit_kyc.php', dataObj);
            return res;
        } catch (error) {
            throw error;
        }
    };
};

export const manageFundsAction = (userId, amount, type) => {
    return async (dispatch) => {
        try {
            const payload = { user_id: userId, amount, type };
            const res = await postApi('/manage_funds.php', payload);
            return res;
        } catch (error) {
            throw error;
        }
    };
};

export const sendStatementAction = (userId, email = '') => {
    return async (dispatch) => {
        try {
            const payload = { user_id: userId };
            if (email) {
                payload.email = email;
            }
            const res = await postApi('/send_statement.php', payload);
            return res;
        } catch (error) {
            throw error;
        }
    };
};

export const placeOrderAction = (orderData) => {
    return async (dispatch) => {
        try {
            const res = await postApi('/place_order.php', orderData);
            return res;
        } catch (error) {
            console.error('placeOrderAction error:', error);
            throw error;
        }
    };
};