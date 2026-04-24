// Detects whether running as native Capacitor app or in browser
const IS_NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const HOST = (location.hostname || '').toLowerCase();
const IS_LOCAL_WEB = HOST === 'localhost' || HOST === '127.0.0.1';
const NETLIFY_BASE = 'https://streger.netlify.app';

window.APP_CONFIG = {
    IS_NATIVE: IS_NATIVE,
    // Browser deployments (including Netlify) should use same-origin functions.
    // Native app and localhost can use the deployed Netlify base.
    API_BASE: (IS_NATIVE || IS_LOCAL_WEB) ? NETLIFY_BASE : '',
    GOOGLE_CLIENT_ID: '656730854589-b30koq0rm67abjanisu7ss8pqjpavlip.apps.googleusercontent.com'
};
