import axios from 'axios';

/**
 * ====================================================================
 * INFINITY GLOBAL CAPITAL - Centralized GET API Helper
 * ====================================================================
 * Connects to the PHP REST API hosted on Apache / XAMPP.
 */
// Live Server: https://mandipro.com/infinity_global_capital/api
// Local Server: 
// export const BASE_URL = 'http://localhost/INFINITY_GLOBAL_CAPITAL/backend/api';
export const BASE_URL = import.meta.env.VITE_API_URL || 'https://mandipro.com/infinity_global_capital/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 25000,
});

/**
 * Beginner-friendly GET API function
 * @param {string} endpoint - e.g. 'admin_dashboard.php'
 * @param {object} params - query parameters object e.g. { category: 'Banking' }
 * @returns {Promise<object>} API response JSON data
 */
export const getApi = async (endpoint = '', params = {}) => {
  try {
    const response = await api.get(endpoint, { params });
    return response.data;
  } catch (error) {
    console.error(`[getApi] Error fetching ${endpoint}:`, error);
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Network request failed'
    };
  }
};

export default getApi;
