/**
 * DevTools Protection
 * Completely hides all console errors, logs, and network errors from hackers
 */

class DevToolsProtection {
  constructor() {
    this.isDevToolsOpen = false;
    this.init();
  }

  init() {
    // MUST be first - disable ALL console output immediately
    this.disableConsoleCompletely();
    
    // Suppress all errors
    this.suppressAllErrors();
    
    // Detect DevTools opening
    this.detectDevTools();
    
    // Block keyboard shortcuts
    this.blockKeyboardShortcuts();
    
    // Disable right-click
    this.disableRightClick();
    
    // Prevent text selection
    this.preventSelection();
  }

  /**
   * Completely disable ALL console output
   */
  disableConsoleCompletely() {
    // Create empty function
    const noop = () => {};
    
    // Override ALL console methods
    const consoleMethods = [
      'log', 'warn', 'error', 'info', 'debug', 'trace', 'dir', 'dirxml',
      'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'timeLog',
      'assert', 'clear', 'count', 'countReset', 'table', 'profile',
      'profileEnd', 'timeStamp', 'exception', 'memory'
    ];
    
    consoleMethods.forEach(method => {
      try {
        window.console[method] = noop;
        console[method] = noop;
      } catch (e) {
        // Ignore errors
      }
    });

    // Freeze console object to prevent modifications
    try {
      Object.freeze(window.console);
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Suppress ALL JavaScript errors globally
   */
  suppressAllErrors() {
    // Catch all uncaught errors
    window.addEventListener('error', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }, true);

    // Catch all promise rejections
    window.addEventListener('unhandledrejection', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }, true);

    // Override onerror
    window.onerror = () => false;
    
    // Override onunhandledrejection
    window.onunhandledrejection = () => false;

    // Catch all console errors at the lowest level
    const originalError = console.error;
    console.error = () => {};
    
    // Intercept fetch errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        return response;
      } catch (error) {
        // Silently fail - don't log anything
        return new Response(null, { status: 500 });
      }
    };

    // Intercept XMLHttpRequest errors
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(...args) {
      this._url = args[1];
      return originalXHROpen.apply(this, args);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
      this.addEventListener('error', (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
      
      this.addEventListener('load', () => {
        // Suppress error status codes from console
        if (this.status >= 400) {
          // Don't log anything
        }
      }, false);
      
      return originalXHRSend.apply(this, args);
    };
  }

  /**
   * Detect if DevTools is open
   */
  detectDevTools() {
    const threshold = 160;
    
    setInterval(() => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        if (!this.isDevToolsOpen) {
          this.isDevToolsOpen = true;
          this.onDevToolsOpen();
        }
      } else {
        this.isDevToolsOpen = false;
      }
    }, 500);

    // Alternative detection using debugger
    const checkDevTools = () => {
      const start = performance.now();
      debugger;
      const end = performance.now();
      
      if (end - start > 100) {
        this.onDevToolsOpen();
      }
    };

    // Check periodically (but not too often to avoid performance issues)
    setInterval(checkDevTools, 1000);
  }

  /**
   * Action when DevTools is detected
   */
  onDevToolsOpen() {
    // Clear the page
    document.body.innerHTML = `
      <div style="
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-family: Arial, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <div>
          <h1 style="font-size: 3em; margin-bottom: 20px;">⚠️ Access Denied</h1>
          <p style="font-size: 1.5em; margin-bottom: 30px;">
            Developer tools are not allowed on this page.
          </p>
          <p style="font-size: 1em; opacity: 0.8;">
            Please close DevTools and refresh the page.
          </p>
        </div>
      </div>
    `;
    
    // Redirect after 3 seconds
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }

  /**
   * Block keyboard shortcuts for DevTools
   */
  blockKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Ctrl+Shift+I (Inspect)
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.keyCode === 73)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.keyCode === 74)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.keyCode === 67)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.keyCode === 85)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Ctrl+S (Save Page)
      if (e.ctrlKey && (e.key === 's' || e.key === 'S' || e.keyCode === 83)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Cmd+Option+I (Mac Inspect)
      if (e.metaKey && e.altKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Cmd+Option+J (Mac Console)
      if (e.metaKey && e.altKey && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Cmd+Option+C (Mac Inspect Element)
      if (e.metaKey && e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }, true); // Use capture phase
  }

  /**
   * Disable right-click context menu
   */
  disableRightClick() {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }, true);
  }

  /**
   * Prevent text selection
   */
  preventSelection() {
    document.addEventListener('selectstart', (e) => {
      e.preventDefault();
      return false;
    }, true);
    
    document.addEventListener('copy', (e) => {
      e.preventDefault();
      return false;
    }, true);
    
    document.addEventListener('cut', (e) => {
      e.preventDefault();
      return false;
    }, true);
  }
}

// Initialize protection IMMEDIATELY
let protection = null;

export function initDevToolsProtection() {
  if (!protection) {
    protection = new DevToolsProtection();
  }
  return protection;
}

// Auto-initialize as soon as this module loads
if (typeof window !== 'undefined') {
  initDevToolsProtection();
}

export default DevToolsProtection;
