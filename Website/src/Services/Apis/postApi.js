import axios from 'axios';
import { BASE_URL } from './getApi';

/**
 * ====================================================================
 * INFINITY GLOBAL CAPITAL - Centralized POST API Helper
 * ====================================================================
 * Connects to PHP endpoints for submitting forms, updating prices, etc.
 */
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 25000,
});

/**
 * Beginner-friendly POST API function
 * @param {string} endpoint - e.g. 'admin_auth.php'
 * @param {object|FormData} data - payload to send
 * @returns {Promise<object>} API response JSON data
 */
export const postApi = async (endpoint = '', data = {}) => {
  try {
    const isFormData = data instanceof FormData;
    const config = isFormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : { headers: { 'Content-Type': 'application/json' } };

    const response = await api.post(endpoint, data, config);
    return response.data;
  } catch (error) {
    console.error(`[postApi] Error posting to ${endpoint}:`, error);
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Network request failed'
    };
  }
};

export default postApi;
