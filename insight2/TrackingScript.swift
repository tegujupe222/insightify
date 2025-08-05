import SwiftUI
import Foundation

// MARK: - Tracking Script Generator

class TrackingScriptGenerator {
    
    // MARK: - Configuration
    
    struct TrackingConfig {
        let websiteId: String
        let apiEndpoint: String
        let websocketEndpoint: String?
        let enableHeatmap: Bool
        let enableScrollTracking: Bool
        let enableFormTracking: Bool
        let enableConversionTracking: Bool
        let enableABTesting: Bool
        let privacyMode: Bool
        let gdprCompliant: Bool
        let sessionTimeout: Int // minutes
        let batchSize: Int
        let retryAttempts: Int
        let customEvents: [String]
        let conversionGoals: [String]
    }
    
    // MARK: - Script Generation
    
    func generateTrackingScript(config: TrackingConfig) -> String {
        return """
        (function() {
            'use strict';
            
            // Configuration
            const CONFIG = {
                websiteId: '\(config.websiteId)',
                apiEndpoint: '\(config.apiEndpoint)',
                websocketEndpoint: '\(config.websocketEndpoint ?? "")',
                enableHeatmap: \(config.enableHeatmap),
                enableScrollTracking: \(config.enableScrollTracking),
                enableFormTracking: \(config.enableFormTracking),
                enableConversionTracking: \(config.enableConversionTracking),
                enableABTesting: \(config.enableABTesting),
                privacyMode: \(config.privacyMode),
                gdprCompliant: \(config.gdprCompliant),
                sessionTimeout: \(config.sessionTimeout),
                batchSize: \(config.batchSize),
                retryAttempts: \(config.retryAttempts),
                customEvents: " + JSON.stringify(config.customEvents) + ",
                conversionGoals: " + JSON.stringify(config.conversionGoals) + ",
            };
            
            // Performance optimization
            const PERFORMANCE = {
                throttleDelay: 1000,
                batchDelay: 5000,
                maxQueueSize: 100,
                compressionEnabled: true
            };
            
            // Privacy settings
            const PRIVACY = {
                anonymizeIP: true,
                respectDoNotTrack: true,
                cookieConsent: false,
                dataRetention: 30 // days
            };
            
            // State management
            let sessionId = null;
            let sessionStartTime = null;
            let eventQueue = [];
            let isInitialized = false;
            let websocket = null;
            let retryCount = 0;
            
            // Utility functions
            const Utils = {
                // Generate unique session ID
                generateSessionId() {
                    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
                },
                
                // Get or create session ID
                getSessionId() {
                    if (!sessionId) {
                        sessionId = sessionStorage.getItem('insight_session_id') || this.generateSessionId();
                        sessionStorage.setItem('insight_session_id', sessionId);
                        sessionStartTime = Date.now();
                    }
                    return sessionId;
                },
                
                // Check if session is still valid
                isSessionValid() {
                    if (!sessionStartTime) return true;
                    const sessionAge = (Date.now() - sessionStartTime) / 1000 / 60; // minutes
                    return sessionAge < CONFIG.sessionTimeout;
                },
                
                // Throttle function for performance
                throttle(func, delay) {
                    let timeoutId;
                    return function(...args) {
                        if (timeoutId) return;
                        timeoutId = setTimeout(() => {
                            func.apply(this, args);
                            timeoutId = null;
                        }, delay);
                    };
                },
                
                // Debounce function
                debounce(func, delay) {
                    let timeoutId;
                    return function(...args) {
                        clearTimeout(timeoutId);
                        timeoutId = setTimeout(() => func.apply(this, args), delay);
                    };
                },
                
                // Compress data for transmission
                compress(data) {
                    if (!PERFORMANCE.compressionEnabled) return data;
                    try {
                        return btoa(JSON.stringify(data));
                    } catch (e) {
                        return data;
                    }
                },
                
                // Anonymize data for privacy
                anonymize(data) {
                    if (!CONFIG.privacyMode) return data;
                    
                    const anonymized = { ...data };
                    if (anonymized.userAgent) {
                        anonymized.userAgent = 'Anonymous';
                    }
                    if (anonymized.referrer) {
                        anonymized.referrer = null;
                    }
                    if (anonymized.ip) {
                        anonymized.ip = null;
                    }
                    
                    return anonymized;
                },
                
                // Check GDPR compliance
                checkGDPRCompliance() {
                    if (!CONFIG.gdprCompliant) return true;
                    
                    // Check for Do Not Track
                    if (navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes') {
                        return false;
                    }
                    
                    // Check for cookie consent (if implemented)
                    if (PRIVACY.cookieConsent) {
                        const consent = localStorage.getItem('insight_cookie_consent');
                        return consent === 'accepted';
                    }
                    
                    return true;
                },
                
                // Get device information
                getDeviceInfo() {
                    return {
                        userAgent: navigator.userAgent,
                        language: navigator.language,
                        platform: navigator.platform,
                        screenWidth: screen.width,
                        screenHeight: screen.height,
                        viewportWidth: window.innerWidth,
                        viewportHeight: window.innerHeight,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    };
                },
                
                // Generate unique event ID
                generateEventId() {
                    return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                }
            };
            
            // Event queue management
            const EventQueue = {
                add(event) {
                    if (!Utils.checkGDPRCompliance()) return;
                    
                    eventQueue.push({
                        ...event,
                        timestamp: new Date().toISOString(),
                        sessionId: Utils.getSessionId(),
                        eventId: Utils.generateEventId()
                    });
                    
                    if (eventQueue.length >= PERFORMANCE.maxQueueSize) {
                        this.flush();
                    }
                },
                
                flush() {
                    if (eventQueue.length === 0) return;
                    
                    const events = eventQueue.splice(0, CONFIG.batchSize);
                    const payload = {
                        websiteId: CONFIG.websiteId,
                        events: events.map(event => Utils.anonymize(event))
                    };
                    
                    this.sendToServer(payload);
                },
                
                sendToServer(payload) {
                    const compressedPayload = Utils.compress(payload);
                    
                    fetch(CONFIG.apiEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Website-ID': CONFIG.websiteId,
                            'X-Compression': PERFORMANCE.compressionEnabled ? 'gzip' : 'none'
                        },
                        body: JSON.stringify(payload)
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}`);
                        }
                        retryCount = 0;
                    })
                    .catch(error => {
                        console.warn('Analytics send error:', error);
                        retryCount++;
                        
                        if (retryCount < CONFIG.retryAttempts) {
                            setTimeout(() => {
                                this.sendToServer(payload);
                            }, Math.pow(2, retryCount) * 1000); // Exponential backoff
                        }
                    });
                }
            };
            
            // WebSocket connection for real-time updates
            const WebSocketManager = {
                connect() {
                    if (!CONFIG.websocketEndpoint) return;
                    
                    try {
                        websocket = new WebSocket(CONFIG.websocketEndpoint);
                        
                        websocket.onopen = () => {
                            console.log('Analytics WebSocket connected');
                        };
                        
                        websocket.onmessage = (event) => {
                            try {
                                const data = JSON.parse(event.data);
                                this.handleWebSocketMessage(data);
                            } catch (e) {
                                console.warn('WebSocket message parse error:', e);
                            }
                        };
                        
                        websocket.onclose = () => {
                            console.log('Analytics WebSocket disconnected');
                            setTimeout(() => this.connect(), 5000);
                        };
                        
                        websocket.onerror = (error) => {
                            console.warn('WebSocket error:', error);
                        };
                    } catch (e) {
                        console.warn('WebSocket connection failed:', e);
                    }
                },
                
                handleWebSocketMessage(data) {
                    switch (data.type) {
                        case 'ab_test_update':
                            if (CONFIG.enableABTesting) {
                                ABTestManager.applyTest(data.test);
                            }
                            break;
                        case 'config_update':
                            Object.assign(CONFIG, data.config);
                            break;
                        case 'tracking_toggle':
                            isInitialized = data.enabled;
                            break;
                    }
                },
                
                send(message) {
                    if (websocket && websocket.readyState === WebSocket.OPEN) {
                        websocket.send(JSON.stringify(message));
                    }
                }
            };
            
            // A/B Testing Manager
            const ABTestManager = {
                activeTests: new Map(),
                
                applyTest(test) {
                    this.activeTests.set(test.id, test);
                    
                    if (test.status === 'running' && test.variants) {
                        const variant = this.getVariant(test);
                        this.applyVariant(test, variant);
                    }
                },
                
                getVariant(test) {
                    const sessionVariant = sessionStorage.getItem(`ab_test_${test.id}`);
                    if (sessionVariant) {
                        return test.variants.find(v => v.name === sessionVariant);
                    }
                    
                    const variant = test.variants[Math.floor(Math.random() * test.variants.length)];
                    sessionStorage.setItem(`ab_test_${test.id}`, variant.name);
                    return variant;
                },
                
                applyVariant(test, variant) {
                    if (!variant.changes) return;
                    
                    variant.changes.forEach(change => {
                        const elements = document.querySelectorAll(change.selector);
                        elements.forEach(element => {
                            switch (change.property) {
                                case 'textContent':
                                    element.textContent = change.value;
                                    break;
                                case 'innerHTML':
                                    element.innerHTML = change.value;
                                    break;
                                case 'style':
                                    Object.assign(element.style, change.value);
                                    break;
                                case 'className':
                                    element.className = change.value;
                                    break;
                                case 'src':
                                    element.src = change.value;
                                    break;
                                case 'href':
                                    element.href = change.value;
                                    break;
                            }
                        });
                    });
                    
                    // Track A/B test exposure
                    EventQueue.add({
                        eventType: 'ab_test_exposure',
                        testId: test.id,
                        variantName: variant.name,
                        testName: test.name
                    });
                }
            };
            
            // Tracking functions
            const Tracking = {
                // Track page view
                trackPageView() {
                    if (!Utils.isSessionValid()) {
                        sessionId = null;
                        sessionStartTime = null;
                    }
                    
                    EventQueue.add({
                        eventType: 'pageview',
                        url: window.location.href,
                        title: document.title,
                        path: window.location.pathname,
                        referrer: document.referrer,
                        deviceInfo: Utils.getDeviceInfo()
                    });
                },
                
                // Track click events
                trackClick: Utils.throttle(function(event) {
                    if (!CONFIG.enableHeatmap) return;
                    
                    const element = event.target;
                    const rect = element.getBoundingClientRect();
                    
                    EventQueue.add({
                        eventType: 'click',
                        elementId: element.id || null,
                        elementClass: element.className || null,
                        elementTag: element.tagName.toLowerCase(),
                        x: event.clientX,
                        y: event.clientY,
                        elementX: rect.left,
                        elementY: rect.top,
                        elementText: element.textContent ? element.textContent.substring(0, 100) : null,
                        elementAttributes: this.getElementAttributes(element)
                    });
                }, PERFORMANCE.throttleDelay),
                
                // Track scroll depth
                trackScroll: Utils.debounce(function() {
                    if (!CONFIG.enableScrollTracking) return;
                    
                    const scrollDepth = Math.round(
                        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
                    );
                    
                    EventQueue.add({
                        eventType: 'scroll',
                        scrollDepth: scrollDepth,
                        scrollY: window.scrollY,
                        documentHeight: document.body.scrollHeight
                    });
                }, PERFORMANCE.throttleDelay),
                
                // Track form submissions
                trackFormSubmission(event) {
                    if (!CONFIG.enableFormTracking) return;
                    
                    const form = event.target;
                    const formData = new FormData(form);
                    const formFields = {};
                    
                    for (let [key, value] of formData.entries()) {
                        formFields[key] = value.toString().substring(0, 50);
                    }
                    
                    EventQueue.add({
                        eventType: 'form_submission',
                        formId: form.id || null,
                        formAction: form.action || null,
                        formMethod: form.method || 'get',
                        formFields: formFields
                    });
                },
                
                // Track conversions
                trackConversion(goal, value = 0, metadata = {}) {
                    if (!CONFIG.enableConversionTracking) return;
                    if (!CONFIG.conversionGoals.includes(goal)) return;
                    
                    EventQueue.add({
                        eventType: 'conversion',
                        goal: goal,
                        value: value,
                        metadata: metadata
                    });
                },
                
                // Track custom events
                trackCustomEvent(eventName, data = {}) {
                    if (!CONFIG.customEvents.includes(eventName)) return;
                    
                    EventQueue.add({
                        eventType: 'custom',
                        eventName: eventName,
                        data: data
                    });
                },
                
                // Track performance metrics
                trackPerformance() {
                    if ('performance' in window) {
                        const perfData = performance.getEntriesByType('navigation')[0];
                        if (perfData) {
                            EventQueue.add({
                                eventType: 'performance',
                                loadTime: perfData.loadEventEnd - perfData.loadEventStart,
                                domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                                firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
                                firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
                            });
                        }
                    }
                },
                
                // Get element attributes for tracking
                getElementAttributes(element) {
                    const attributes = {};
                    const importantAttrs = ['data-testid', 'data-analytics', 'aria-label', 'title'];
                    
                    importantAttrs.forEach(attr => {
                        if (element.hasAttribute(attr)) {
                            attributes[attr] = element.getAttribute(attr);
                        }
                    });
                    
                    return attributes;
                }
            };
            
            // Initialize tracking
            function init() {
                if (isInitialized) return;
                
                // Check privacy compliance
                if (!Utils.checkGDPRCompliance()) {
                    console.log('Analytics disabled due to privacy settings');
                    return;
                }
                
                // Initialize session
                Utils.getSessionId();
                
                // Track initial page view
                Tracking.trackPageView();
                
                // Track performance metrics
                if (document.readyState === 'complete') {
                    Tracking.trackPerformance();
                } else {
                    window.addEventListener('load', Tracking.trackPerformance);
                }
                
                // Set up event listeners
                if (CONFIG.enableHeatmap) {
                    document.addEventListener('click', Tracking.trackClick);
                }
                
                if (CONFIG.enableScrollTracking) {
                    window.addEventListener('scroll', Tracking.trackScroll);
                }
                
                if (CONFIG.enableFormTracking) {
                    document.addEventListener('submit', Tracking.trackFormSubmission);
                }
                
                // Set up periodic flushing
                setInterval(() => {
                    EventQueue.flush();
                }, PERFORMANCE.batchDelay);
                
                // Connect WebSocket
                WebSocketManager.connect();
                
                isInitialized = true;
                console.log('Insight Analytics initialized');
            }
            
            // Expose functions globally
            window.insight = {
                trackPageView: Tracking.trackPageView,
                trackClick: Tracking.trackClick,
                trackScroll: Tracking.trackScroll,
                trackConversion: Tracking.trackConversion,
                trackCustomEvent: Tracking.trackCustomEvent,
                trackFormSubmission: Tracking.trackFormSubmission,
                getSessionId: Utils.getSessionId,
                isInitialized: () => isInitialized,
                flush: () => EventQueue.flush(),
                config: CONFIG
            };
            
            // Start tracking when DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
            } else {
                init();
            }
            
        })();
        """
    }
    
    // MARK: - Privacy Policy Generator
    
    func generatePrivacyPolicy(websiteName: String, websiteUrl: String) -> String {
        return """
        <div class="privacy-policy">
            <h2>プライバシーポリシー - \(websiteName)</h2>
            
            <h3>1. データ収集について</h3>
            <p>当サイトでは、ユーザーエクスペリエンスの向上とサイト改善のために、以下の情報を収集しています：</p>
            <ul>
                <li>ページビュー情報</li>
                <li>クリック位置データ（ヒートマップ）</li>
                <li>スクロール深度</li>
                <li>フォーム送信データ</li>
                <li>デバイス情報（ブラウザ、OS、画面サイズ）</li>
            </ul>
            
            <h3>2. データの使用目的</h3>
            <p>収集したデータは以下の目的でのみ使用されます：</p>
            <ul>
                <li>サイトのパフォーマンス分析</li>
                <li>ユーザー行動の理解</li>
                <li>コンテンツの最適化</li>
                <li>A/Bテストの実施</li>
            </ul>
            
            <h3>3. データの保護</h3>
            <p>収集したデータは適切に暗号化され、安全に管理されます。個人を特定できる情報は収集しません。</p>
            
            <h3>4. データの保持期間</h3>
            <p>収集したデータは30日間保持され、その後自動的に削除されます。</p>
            
            <h3>5. お問い合わせ</h3>
            <p>プライバシーに関するご質問は、以下までお問い合わせください：</p>
            <p>Email: privacy@\(websiteUrl)</p>
        </div>
        """
    }
    
    // MARK: - Cookie Consent Banner
    
    func generateCookieConsentBanner() -> String {
        return """
        <div id="insight-cookie-banner" style="
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #333;
            color: white;
            padding: 20px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
        ">
            <div style="max-width: 1200px; margin: 0 auto;">
                <p style="margin: 0 0 15px 0;">
                    このサイトでは、ユーザーエクスペリエンスの向上のためにCookieを使用しています。
                    サイトを利用することで、Cookieの使用に同意したことになります。
                </p>
                <div style="text-align: right;">
                    <button onclick="acceptCookies()" style="
                        background: #4CAF50;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        margin-right: 10px;
                        cursor: pointer;
                        border-radius: 4px;
                    ">同意する</button>
                    <button onclick="rejectCookies()" style="
                        background: #f44336;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        cursor: pointer;
                        border-radius: 4px;
                    ">拒否する</button>
                </div>
            </div>
        </div>
        
        <script>
        function acceptCookies() {
            localStorage.setItem('insight_cookie_consent', 'accepted');
            document.getElementById('insight-cookie-banner').style.display = 'none';
            if (window.insight && window.insight.init) {
                window.insight.init();
            }
        }
        
        function rejectCookies() {
            localStorage.setItem('insight_cookie_consent', 'rejected');
            document.getElementById('insight-cookie-banner').style.display = 'none';
        }
        
        // Show banner if consent not given
        if (!localStorage.getItem('insight_cookie_consent')) {
            document.getElementById('insight-cookie-banner').style.display = 'block';
        }
        </script>
        """
    }
}

struct TrackingScriptView: View {
    @EnvironmentObject var analyticsManager: AnalyticsManager
    @State private var selectedWebsite = "https://example.com"
    @State private var trackingEnabled = true
    @State private var heatmapEnabled = true
    @State private var abTestingEnabled = true
    @State private var privacyMode = false
    @State private var showingScriptPreview = false
    
    private var trackingScript: String {
        """
        <!-- Insight Analytics Tracking Script -->
        <script>
        (function() {
            'use strict';
            
            // Configuration
            const config = {
                website: '\(selectedWebsite)',
                trackingEnabled: \(trackingEnabled),
                heatmapEnabled: \(heatmapEnabled),
                abTestingEnabled: \(abTestingEnabled),
                privacyMode: \(privacyMode)
            };
            
            // Generate session ID
            function generateSessionId() {
                return 'session_' + Math.random().toString(36).substr(2, 9);
            }
            
            // Get or create session ID
            function getSessionId() {
                let sessionId = sessionStorage.getItem('insight_session_id');
                if (!sessionId) {
                    sessionId = generateSessionId();
                    sessionStorage.setItem('insight_session_id', sessionId);
                }
                return sessionId;
            }
            
            // Send analytics data
            function sendAnalytics(eventType, data) {
                if (!config.trackingEnabled) return;
                
                const payload = {
                    eventType: eventType,
                    url: window.location.href,
                    sessionId: getSessionId(),
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    referrer: document.referrer,
                    ...data
                };
                
                // Send to analytics endpoint
                fetch('https://api.insight-analytics.com/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                }).catch(console.error);
            }
            
            // Track page view
            function trackPageView() {
                sendAnalytics('pageview', {
                    title: document.title,
                    path: window.location.pathname
                });
            }
            
            // Track clicks
            function trackClick(event) {
                if (!config.heatmapEnabled) return;
                
                const element = event.target;
                const rect = element.getBoundingClientRect();
                
                sendAnalytics('click', {
                    elementId: element.id || null,
                    elementClass: element.className || null,
                    elementTag: element.tagName.toLowerCase(),
                    x: event.clientX,
                    y: event.clientY,
                    elementX: rect.left + event.clientX,
                    elementY: rect.top + event.clientY
                });
            }
            
            // Track scroll depth
            function trackScroll() {
                if (!config.heatmapEnabled) return;
                
                const scrollDepth = Math.round(
                    (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
                );
                
                sendAnalytics('scroll', {
                    scrollDepth: scrollDepth,
                    scrollY: window.scrollY,
                    documentHeight: document.body.scrollHeight
                });
            }
            
            // A/B Testing
            function getABTestVariant(testId) {
                if (!config.abTestingEnabled) return null;
                
                let variant = sessionStorage.getItem(`insight_ab_${testId}`);
                if (!variant) {
                    variant = Math.random() < 0.5 ? 'A' : 'B';
                    sessionStorage.setItem(`insight_ab_${testId}`, variant);
                }
                return variant;
            }
            
            // Apply A/B test changes
            function applyABTest(testId, changes) {
                const variant = getABTestVariant(testId);
                if (variant === 'B' && changes) {
                    changes.forEach(change => {
                        const element = document.querySelector(change.selector);
                        if (element) {
                            switch (change.property) {
                                case 'textContent':
                                    element.textContent = change.value;
                                    break;
                                case 'backgroundColor':
                                    element.style.backgroundColor = change.value;
                                    break;
                                case 'fontSize':
                                    element.style.fontSize = change.value;
                                    break;
                                case 'display':
                                    element.style.display = change.value;
                                    break;
                            }
                        }
                    });
                }
            }
            
            // Track conversions
            function trackConversion(goal, value = 0) {
                sendAnalytics('conversion', {
                    goal: goal,
                    value: value
                });
            }
            
            // Privacy mode - anonymize data
            function anonymizeData(data) {
                if (!config.privacyMode) return data;
                
                return {
                    ...data,
                    userAgent: 'Anonymous',
                    referrer: null,
                    sessionId: null
                };
            }
            
            // Initialize tracking
            function init() {
                // Track initial page view
                trackPageView();
                
                // Add event listeners
                if (config.heatmapEnabled) {
                    document.addEventListener('click', trackClick);
                    window.addEventListener('scroll', throttle(trackScroll, 1000));
                }
                
                // Track form submissions as conversions
                document.addEventListener('submit', function(event) {
                    const form = event.target;
                    const goal = form.dataset.conversionGoal || 'form_submission';
                    trackConversion(goal);
                });
                
                // Track link clicks to external sites
                document.addEventListener('click', function(event) {
                    const link = event.target.closest('a');
                    if (link && link.hostname !== window.location.hostname) {
                        trackConversion('external_link', 0);
                    }
                });
                
                // Load A/B tests
                if (config.abTestingEnabled) {
                    loadABTests();
                }
            }
            
            // Load A/B tests from server
            function loadABTests() {
                fetch('https://api.insight-analytics.com/ab-tests')
                    .then(response => response.json())
                    .then(tests => {
                        tests.forEach(test => {
                            if (test.status === 'running') {
                                applyABTest(test.id, test.variants.find(v => v.name === 'B')?.changes);
                            }
                        });
                    })
                    .catch(console.error);
            }
            
            // Utility function for throttling
            function throttle(func, limit) {
                let inThrottle;
                return function() {
                    const args = arguments;
                    const context = this;
                    if (!inThrottle) {
                        func.apply(context, args);
                        inThrottle = true;
                        setTimeout(() => inThrottle = false, limit);
                    }
                }
            }
            
            // Start tracking when DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
            } else {
                init();
            }
            
            // Expose functions globally for manual tracking
            window.insight = {
                trackPageView,
                trackClick,
                trackConversion,
                getABTestVariant,
                applyABTest
            };
            
        })();
        </script>
        """
    }
    
    var body: some View {
        VStack(spacing: 20) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("トラッキング設定")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("ウェブサイトへのトラッキングコード管理")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Button("スクリプトをプレビュー") {
                    showingScriptPreview = true
                }
                .buttonStyle(.borderedProminent)
            }
            .padding(.horizontal)
            
            // Configuration
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("基本設定")
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    VStack(spacing: 12) {
                        HStack {
                            Text("ウェブサイトURL")
                                .font(.subheadline)
                            
                            Spacer()
                            
                            TextField("https://example.com", text: $selectedWebsite)
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 300)
                        }
                        
                        Toggle("トラッキングを有効にする", isOn: $trackingEnabled)
                        Toggle("ヒートマップを有効にする", isOn: $heatmapEnabled)
                        Toggle("A/Bテストを有効にする", isOn: $abTestingEnabled)
                        Toggle("プライバシーモード", isOn: $privacyMode)
                    }
                }
                .padding()
                .background(Color(.controlBackgroundColor))
                .cornerRadius(12)
            }
            .padding(.horizontal)
            
            // Installation instructions
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("インストール手順")
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("1. HTMLのheadタグ内にスクリプトを追加")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            Text("以下のコードをウェブサイトのHTMLの<head>セクションに追加してください。")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("2. 設定を確認")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            Text("ウェブサイトのURLとトラッキング設定が正しいことを確認してください。")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("3. データの確認")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            Text("数分後にダッシュボードでデータが表示されることを確認してください。")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                                    }
                    .padding()
                    .background(Color(.controlBackgroundColor))
                    .cornerRadius(12)
                }
                .padding(.horizontal)
                
                // Code snippet
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("トラッキングコード")
                            .font(.headline)
                            .fontWeight(.semibold)
                        
                        Spacer()
                        
                        Button("コピー") {
                            copyToClipboard()
                        }
                        .buttonStyle(.bordered)
                    }
                    
                    ScrollView {
                                            Text(trackingScript)
                        .font(.system(.caption, design: .monospaced))
                        .padding()
                        .background(Color(.textBackgroundColor))
                        .cornerRadius(8)
                    }
                    .frame(height: 300)
                }
                .padding()
                .background(Color(.controlBackgroundColor))
                .cornerRadius(12)
            }
            .padding(.horizontal)
            
            // Status indicators
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                StatusCard(
                    title: "トラッキング状態",
                    status: trackingEnabled ? "有効" : "無効",
                    color: trackingEnabled ? .green : .red,
                    icon: "antenna.radiowaves.left.and.right"
                )
                
                StatusCard(
                    title: "ヒートマップ",
                    status: heatmapEnabled ? "有効" : "無効",
                    color: heatmapEnabled ? .green : .red,
                    icon: "flame.fill"
                )
                
                StatusCard(
                    title: "A/Bテスト",
                    status: abTestingEnabled ? "有効" : "無効",
                    color: abTestingEnabled ? .green : .red,
                    icon: "arrow.left.arrow.right"
                )
            }
            .padding(.horizontal)
        }
        .sheet(isPresented: $showingScriptPreview) {
            ScriptPreviewView(script: trackingScript)
        }
    }
    
    private func copyToClipboard() {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(trackingScript, forType: .string)
    }
}

// MARK: - Status Card

struct StatusCard: View {
    let title: String
    let status: String
    let color: Color
    let icon: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                    .font(.title2)
                
                Spacer()
                
                Text(status)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(color)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.controlBackgroundColor))
        .cornerRadius(12)
    }
}

// MARK: - Script Preview View

struct ScriptPreviewView: View {
    let script: String
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("トラッキングスクリプトプレビュー")
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    Text("このコードをウェブサイトのHTMLの<head>セクションに追加してください:")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    Text(script)
                        .font(.system(.caption, design: .monospaced))
                        .padding()
                        .background(Color(.textBackgroundColor))
                        .cornerRadius(8)
                }
                .padding()
            }
            .navigationTitle("スクリプトプレビュー")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .primaryAction) {
                    Button("コピー") {
                        NSPasteboard.general.clearContents()
                        NSPasteboard.general.setString(script, forType: .string)
                    }
                }
            }
        }
    }
}

#Preview {
    TrackingScriptView()
        .environmentObject(AnalyticsManager())
} 