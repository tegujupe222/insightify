/**
 * Insightify Analytics Tracker
 * Lightweight analytics tracking script
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    API_BASE_URL: window.location.hostname === 'localhost' 
      ? 'http://localhost:3001/api' 
      : 'https://' + window.location.hostname + '/api',
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    BATCH_SIZE: 10,
    BATCH_TIMEOUT: 5000, // 5 seconds
    HEATMAP_ENABLED: true,
    SESSION_RECORDING_ENABLED: false
  };

  // State management
  let state = {
    projectId: null,
    sessionId: null,
    visitorId: null,
    pageViews: [],
    events: [],
    heatmapData: [],
    sessionStartTime: null,
    lastActivity: null
  };

  // Utility functions
  const utils = {
    generateId: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },

    getDeviceType: () => {
      const ua = navigator.userAgent;
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet';
      }
      if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
        return 'mobile';
      }
      return 'desktop';
    },

    getBrowser: () => {
      const ua = navigator.userAgent;
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Safari')) return 'Safari';
      if (ua.includes('Edge')) return 'Edge';
      if (ua.includes('MSIE') || ua.includes('Trident/')) return 'Internet Explorer';
      return 'Unknown';
    },

    getOS: () => {
      const ua = navigator.userAgent;
      if (ua.includes('Windows')) return 'Windows';
      if (ua.includes('Mac')) return 'macOS';
      if (ua.includes('Linux')) return 'Linux';
      if (ua.includes('Android')) return 'Android';
      if (ua.includes('iOS')) return 'iOS';
      return 'Unknown';
    },

    getReferrer: () => {
      return document.referrer || 'direct';
    },

    getPageInfo: () => {
      return {
        url: window.location.href,
        title: document.title,
        path: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash
      };
    },

    debounce: (func, wait) => {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }
  };

  // Session management
  const session = {
    init: () => {
      // Get or create visitor ID
      state.visitorId = localStorage.getItem('insightify_visitor_id') || utils.generateId();
      localStorage.setItem('insightify_visitor_id', state.visitorId);

      // Check for existing session
      const lastSession = sessionStorage.getItem('insightify_session');
      const now = Date.now();

      if (lastSession) {
        const sessionData = JSON.parse(lastSession);
        if (now - sessionData.lastActivity < CONFIG.SESSION_TIMEOUT) {
          state.sessionId = sessionData.sessionId;
          state.sessionStartTime = sessionData.startTime;
        }
      }

      // Create new session if needed
      if (!state.sessionId) {
        state.sessionId = utils.generateId();
        state.sessionStartTime = now;
      }

      state.lastActivity = now;
      session.save();
    },

    save: () => {
      sessionStorage.setItem('insightify_session', JSON.stringify({
        sessionId: state.sessionId,
        startTime: state.sessionStartTime,
        lastActivity: state.lastActivity
      }));
    },

    update: () => {
      state.lastActivity = Date.now();
      session.save();
    }
  };

  // Data collection
  const collector = {
    trackPageView: () => {
      const pageInfo = utils.getPageInfo();
      const pageView = {
        id: utils.generateId(),
        projectId: state.projectId,
        sessionId: state.sessionId,
        pageUrl: pageInfo.url,
        referrer: utils.getReferrer(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        deviceType: utils.getDeviceType(),
        browser: utils.getBrowser(),
        os: utils.getOS()
      };

      state.pageViews.push(pageView);
      collector.sendBatch();
      session.update();
    },

    trackEvent: (eventType, eventData = {}) => {
      const pageInfo = utils.getPageInfo();
      const event = {
        id: utils.generateId(),
        projectId: state.projectId,
        sessionId: state.sessionId,
        eventType,
        eventData,
        pageUrl: pageInfo.url,
        timestamp: new Date().toISOString()
      };

      state.events.push(event);
      collector.sendBatch();
      session.update();
    },

    trackHeatmap: (x, y, type = 'click') => {
      if (!CONFIG.HEATMAP_ENABLED) return;

      const pageInfo = utils.getPageInfo();
      const heatmapPoint = {
        id: utils.generateId(),
        projectId: state.projectId,
        sessionId: state.sessionId,
        x: Math.round(x),
        y: Math.round(y),
        type,
        pageUrl: pageInfo.url,
        timestamp: new Date().toISOString()
      };

      state.heatmapData.push(heatmapPoint);
      collector.sendBatch();
    },

    sendBatch: utils.debounce(() => {
      const batch = {
        projectId: state.projectId,
        pageViews: state.pageViews.splice(0, CONFIG.BATCH_SIZE),
        events: state.events.splice(0, CONFIG.BATCH_SIZE),
        heatmapData: state.heatmapData.splice(0, CONFIG.BATCH_SIZE)
      };

      if (batch.pageViews.length === 0 && batch.events.length === 0 && batch.heatmapData.length === 0) {
        return;
      }

      // Send data to API with retry logic
      const sendWithRetry = async (retries = 3) => {
        try {
          const response = await fetch(`${CONFIG.API_BASE_URL}/analytics/batch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(batch)
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (error) {
          console.warn('Insightify: Failed to send analytics data', error);
          
          if (retries > 0) {
            setTimeout(() => sendWithRetry(retries - 1), 1000);
          }
        }
      };

      sendWithRetry();
    }, CONFIG.BATCH_TIMEOUT)
  };

  // Event listeners
  const listeners = {
    init: () => {
      // Page view tracking
      collector.trackPageView();

      // Click tracking
      document.addEventListener('click', (e) => {
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        collector.trackHeatmap(x, y, 'click');
        collector.trackEvent('click', {
          element: e.target.tagName.toLowerCase(),
          className: e.target.className,
          id: e.target.id,
          text: e.target.textContent?.substring(0, 100)
        });
      });

      // Scroll tracking
      let scrollTimeout;
      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          const scrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
          collector.trackEvent('scroll', { depth: scrollDepth });
        }, 100);
      });

      // Form submission tracking
      document.addEventListener('submit', (e) => {
        collector.trackEvent('form_submit', {
          formId: e.target.id,
          formAction: e.target.action
        });
      });

      // Link click tracking
      document.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' || e.target.closest('a')) {
          const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
          collector.trackEvent('link_click', {
            href: link.href,
            text: link.textContent?.substring(0, 100)
          });
        }
      });

      // Page visibility tracking
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          collector.trackEvent('page_hide');
        } else {
          collector.trackEvent('page_show');
        }
      });

      // Before unload tracking
      window.addEventListener('beforeunload', () => {
        collector.trackEvent('page_exit');
        collector.sendBatch(); // Force send remaining data
      });
    }
  };

  // Public API
  const insightify = {
    track: (eventType, eventData) => {
      collector.trackEvent(eventType, eventData);
    },

    setProjectId: (projectId) => {
      state.projectId = projectId;
    },

    getSessionId: () => {
      return state.sessionId;
    },

    getVisitorId: () => {
      return state.visitorId;
    }
  };

  // Initialize tracker
  const init = () => {
    // Get project ID from script tag
    const script = document.currentScript || document.querySelector('script[data-project-id]');
    if (script) {
      const projectId = script.getAttribute('data-project-id');
      if (projectId) {
        insightify.setProjectId(projectId);
      }
    }

    // Initialize session
    session.init();

    // Initialize event listeners
    listeners.init();

    // Expose public API
    window.insightify = insightify;

    console.log('Insightify Analytics initialized');
  };

  // Start tracking when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); 