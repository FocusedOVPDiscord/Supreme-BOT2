/**
 * DevTools Protection - Safe Version
 * Hides console errors without breaking the application
 */

class DevToolsProtection {
  constructor() {
    this.init();
  }

  init() {
    // Only run in production
    if (import.meta.env.PROD) {
      this.disableConsole();
      this.blockKeyboardShortcuts();
      this.disableRightClick();
      this.suppressErrors();
    }
  }

  /**
   * Disable console output in production
   */
  disableConsole() {
    const noop = () => {};
    
    // Save original methods for internal use
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };

    // Override console methods
    window.console.log = noop;
    window.console.error = noop;
    window.console.warn = noop;
    window.console.info = noop;
    window.console.debug = noop;
    window.console.trace = noop;
  }

  /**
   * Suppress error display in console (but allow app to function)
   */
  suppressErrors() {
    // Catch errors but don't break the app
    window.addEventListener('error', (e) => {
      e.stopImmediatePropagation();
      // Don't prevent default - let the app handle errors internally
    }, true);

    window.addEventListener('unhandledrejection', (e) => {
      e.stopImmediatePropagation();
      // Don't prevent default - let the app handle errors internally
    }, true);
  }

  /**
   * Block keyboard shortcuts for DevTools
   */
  blockKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // F12
      if (e.keyCode === 123) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+I
      if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+J
      if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+U
      if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
        return false;
      }
      
      // Cmd+Option+I (Mac)
      if (e.metaKey && e.altKey && e.keyCode === 73) {
        e.preventDefault();
        return false;
      }
      
      // Cmd+Option+J (Mac)
      if (e.metaKey && e.altKey && e.keyCode === 74) {
        e.preventDefault();
        return false;
      }
    });
  }

  /**
   * Disable right-click
   */
  disableRightClick() {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });
  }
}

// Initialize protection
let protection = null;

export function initDevToolsProtection() {
  if (!protection) {
    protection = new DevToolsProtection();
  }
  return protection;
}

export default DevToolsProtection;
