// Detects whether running as native Capacitor app or in browser
const IS_NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const HOST = (location.hostname || '').toLowerCase();
const NETLIFY_BASE = 'https://streger.netlify.app';

// Use same-origin API calls ONLY when deployed on the actual Netlify domain.
// All other contexts (localhost, Live Server, network IP, native app) call
// the deployed Netlify functions directly (they allow CORS from any origin).
const IS_NETLIFY_DEPLOY = HOST.endsWith('netlify.app') || HOST === 'streger.netlify.app';

window.APP_CONFIG = {
    IS_NATIVE: IS_NATIVE,
    API_BASE: (!IS_NATIVE && IS_NETLIFY_DEPLOY) ? '' : NETLIFY_BASE,
    GOOGLE_CLIENT_ID: '656730854589-b30koq0rm67abjanisu7ss8pqjpavlip.apps.googleusercontent.com'
};
