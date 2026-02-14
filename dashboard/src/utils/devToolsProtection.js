/**
 * DevTools Protection
 * Prevents hackers from using browser DevTools to inspect code or see errors
 */

class DevToolsProtection {
  constructor() {
    this.isDevToolsOpen = false;
    this.init();
  }

  init() {
    // Disable console in production
    this.disableConsole();
    
    // Detect DevTools opening
    this.detectDevTools();
    
    // Block keyboard shortcuts
    this.blockKeyboardShortcuts();
    
    // Disable right-click
    this.disableRightClick();
    
    // Prevent text selection (optional)
    this.preventSelection();
    
    // Clear console periodically
    this.clearConsolePeriodically();
  }

  /**
   * Disable console methods in production
   */
  disableConsole() {
    if (import.meta.env.PROD) {
      const noop = () => {};
      window.console = {
        log: noop,
        warn: noop,
        error: noop,
        info: noop,
        debug: noop,
        trace: noop,
        dir: noop,
        dirxml: noop,
        group: noop,
        groupCollapsed: noop,
        groupEnd: noop,
        time: noop,
        timeEnd: noop,
        timeLog: noop,
        assert: noop,
        clear: noop,
        count: noop,
        countReset: noop,
        table: noop,
        profile: noop,
        profileEnd: noop,
        timeStamp: noop,
      };
    }
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

    // Alternative detection method
    const devtools = /./;
    devtools.toString = () => {
      this.onDevToolsOpen();
      return '';
    };
    
    // Trigger detection
    setInterval(() => {
      console.log('%c', devtools);
    }, 1000);
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
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+I (Inspect)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+S (Save Page)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
      }
      
      // Cmd+Option+I (Mac Inspect)
      if (e.metaKey && e.altKey && e.key === 'i') {
        e.preventDefault();
        return false;
      }
      
      // Cmd+Option+J (Mac Console)
      if (e.metaKey && e.altKey && e.key === 'j') {
        e.preventDefault();
        return false;
      }
      
      // Cmd+Option+C (Mac Inspect Element)
      if (e.metaKey && e.altKey && e.key === 'c') {
        e.preventDefault();
        return false;
      }
    });
  }

  /**
   * Disable right-click context menu
   */
  disableRightClick() {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });
  }

  /**
   * Prevent text selection (optional)
   */
  preventSelection() {
    document.addEventListener('selectstart', (e) => {
      e.preventDefault();
      return false;
    });
    
    document.addEventListener('copy', (e) => {
      e.preventDefault();
      return false;
    });
  }

  /**
   * Clear console periodically
   */
  clearConsolePeriodically() {
    setInterval(() => {
      if (typeof console.clear === 'function') {
        console.clear();
      }
    }, 2000);
  }

  /**
   * Disable debugger
   */
  antiDebugger() {
    setInterval(() => {
      debugger;
    }, 100);
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
