/**
 * AYAB Web Application - Bootstrap Entry Point
 */

import { initializeApp } from './app.js';

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}