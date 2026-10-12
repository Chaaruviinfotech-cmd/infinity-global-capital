import axios from 'axios';
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';

/* =====================================================
   1. AXIOS SETUP
   ===================================================== */

// API Base URL
// export const BASE_URL = "http://192.168.95.239/INFINITY_GLOBAL_CAPITAL/backend/api"
export const BASE_URL = "https://mandipro.com/infinity_global_capital/api";
const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
});

// GET request: getApi('', { action: 'amclist', empid: 114 })
export const getApi = async (url = '', params = {}) => {
    try {
        console.log("getApi calling:", url, params);
        const res = await api.get(url, { params });
        let resultData = res.data;
        if (typeof resultData === 'string' && resultData.trim().startsWith('{')) {
            try { resultData = JSON.parse(resultData); } catch (e) {}
        }
        return resultData;
    } catch (err) {
        console.error("getApi error for", url, ":", err?.response?.data || err?.message || err);
        throw err;
    }
};

// POST request: JSON object, urlencoded ya FormData, sab seamlessly support karta hai
export const postApi = async (url = '', data = {}, customHeaders = {}) => {
    try {
        console.log("postApi calling:", url);
        
        let headers = { ...customHeaders };
        let reqData = data;

        // Check if data is React Native FormData
        const isFormData = data && (typeof FormData !== 'undefined' && data instanceof FormData || data._parts);

        if (isFormData) {
            headers['Content-Type'] = 'multipart/form-data';
        } else if (data && typeof data === 'object' && typeof data !== 'string') {
            // Convert plain JS object to application/x-www-form-urlencoded
            // This is universally compatible with PHP backends, Mod_Security, and mobile networks
            if (!headers['Content-Type']) {
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
                reqData = Object.keys(data)
                    .filter(key => data[key] !== undefined && data[key] !== null)
                    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
                    .join('&');
            }
        }

        const res = await api.post(url, reqData, {
            headers,
            transformRequest: [
                (d) => {
                    // Do NOT let Axios stringify React Native FormData!
                    if (d && (d instanceof FormData || d._parts)) {
                        return d;
                    }
                    if (typeof d === 'string') {
                        return d;
                    }
                    if (typeof d === 'object') {
                        return JSON.stringify(d);
                    }
                    return d;
                }
            ]
        });

        let resultData = res.data;
        if (typeof resultData === 'string' && resultData.trim().startsWith('{')) {
            try {
                resultData = JSON.parse(resultData);
            } catch (e) {}
        }

        console.log("postApi response for", url, ":", resultData);
        return resultData;
    } catch (err) {
        console.error("postApi error for", url, ":", err?.response?.data || err?.message || err);
        if (err?.response?.data) {
            let errData = err.response.data;
            if (typeof errData === 'string' && errData.trim().startsWith('{')) {
                try { errData = JSON.parse(errData); } catch (e) {}
            }
            if (typeof errData === 'object' && errData !== null) {
                return errData;
            }
        }
        throw err;
    }
};

/* =====================================================
   2. COLOR PALETTE
   ===================================================== */

export const textColor = {
    primary: '#0B1F4B',
    secondary: '#555555',
    light: '#FFFFFF',
    muted: '#FFFFFF',
    link: '#027DC1',
    success: '#2E7D32',
    error: '#E53935',
    warning: '#F9A825',
};

export const bgColor = {
    primary: '#14367E',
    secondary: '#E8EEFC',
    body: '#F5F7FA',
    card: '#FFFFFF',
    dark: '#0B1F4B',
    success: '#4CAF50',
    error: '#E53935',
    warning: '#FFF3CD',
};

/* =====================================================
   3. FONT SIZE
   ===================================================== */

export const fontSize = {
    xs: 10,
    small: 12,
    medium: 14,
    large: 18,
    xl: 24,
    custom: (size) => size,   // fontSize.custom(20)
};

/* =====================================================
   4. FONT STYLE (normal / italic)
   ===================================================== */

export const fontStyle = {
    normal: { fontStyle: 'normal' },
    italic: { fontStyle: 'italic' },
};

/* =====================================================
   5. FONT VARIANT (weight)
   ===================================================== */

export const fontVariant = {
    normal: { fontWeight: '400' },
    bold: { fontWeight: '700' },
    exbold: { fontWeight: '800' },
};

/* =====================================================
   6. PERMISSION CHECK
   ===================================================== */

const P = PermissionsAndroid.PERMISSIONS;

// Naam -> Android permission
const ANDROID_PERMISSIONS = {
    camera: P.CAMERA,
    location: P.ACCESS_FINE_LOCATION,
    notification: P.POST_NOTIFICATIONS,   // Android 13+ (API 33)
    storage: Platform.Version >= 33 ? P.READ_MEDIA_IMAGES : P.READ_EXTERNAL_STORAGE,
    microphone: P.RECORD_AUDIO,
    contacts: P.READ_CONTACTS,
};

const openSettingsAlert = (name) => {
    Alert.alert(
        'Permission required',
        `Please enable ${name} permission from the app settings.`,
        [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
    );
};

/**
 * Ek permission check karo, na ho to maango.
 * return: true (mil gayi) / false (nahi mili)
 *
 * await checkPermission('camera');
 */
export const checkPermission = async (name) => {
    // Android 13 se pehle notification ki runtime permission nahi hoti
    if (name === 'notification' && Platform.OS === 'android' && Platform.Version < 33) {
        return true;
    }

    // iOS: PermissionsAndroid kaam nahi karta
    if (Platform.OS !== 'android') {
        return true;
    }

    const permission = ANDROID_PERMISSIONS[name];
    if (!permission) {
        console.warn(`Unknown permission: ${name}`);
        return false;
    }

    try {
        const already = await PermissionsAndroid.check(permission);
        if (already) return true;

        const result = await PermissionsAndroid.request(permission);

        if (result === PermissionsAndroid.RESULTS.GRANTED) return true;

        // "Don't ask again" dabaya ho to settings par bhejo
        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            openSettingsAlert(name);
        }
        return false;
    } catch (error) {
        console.log('Permission error:', error);
        return false;
    }
};

/**
 * Ek saath kai permissions
 * await checkMultiplePermissions(['camera', 'location'])
 * return: { camera: true, location: false }
 */
export const checkMultiplePermissions = async (names = []) => {
    const result = {};
    for (const name of names) {
        result[name] = await checkPermission(name);
    }
    return result;
};