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
    @EnvironmentObject var websiteManager: WebsiteManager
    @State private var showingAddWebsiteSheet = false
    @State private var selectedWebsite: Website?
    @State private var showingScriptDetail = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 16) {
                    HStack {
                        Text("トラッキングスクリプト")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(DesignSystem.textPrimary)
                        
                        Spacer()
                        
                        AnimatedButton(
                            title: "ウェブサイト追加",
                            icon: "plus",
                            style: .primary,
                            action: { showingAddWebsiteSheet = true }
                        )
                    }
                    
                    Text("ウェブサイトにトラッキングスクリプトを埋め込んで、ユーザーの行動を分析しましょう")
                        .font(.subheadline)
                        .foregroundColor(DesignSystem.textSecondary)
                        .multilineTextAlignment(.leading)
                }
                .padding(DesignSystem.padding)
                
                // Content
                if websiteManager.websites.isEmpty {
                    EmptyStateView(
                        icon: "antenna.radiowaves.left.and.right",
                        title: "ウェブサイトがありません",
                        message: "最初のウェブサイトを追加して、トラッキングを開始しましょう",
                        actionTitle: "ウェブサイトを追加",
                        action: { showingAddWebsiteSheet = true }
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(websiteManager.websites) { website in
                                WebsiteTrackingCard(website: website) {
                                    selectedWebsite = website
                                    showingScriptDetail = true
                                }
                            }
                        }
                        .padding(DesignSystem.padding)
                    }
                }
            }
            .background(DesignSystem.backgroundGradient)
            .sheet(isPresented: $showingAddWebsiteSheet) {
                AddWebsiteSheet()
            }
            .sheet(isPresented: $showingScriptDetail) {
                if let website = selectedWebsite {
                    ScriptDetailView(website: website)
                }
            }
        }
    }
}

struct WebsiteTrackingCard: View {
    let website: Website
    let onTap: () -> Void
    @EnvironmentObject var websiteManager: WebsiteManager
    
    var body: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(website.name)
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(DesignSystem.textPrimary)
                        
                        Text(website.url)
                            .font(.subheadline)
                            .foregroundColor(DesignSystem.textSecondary)
                            .lineLimit(1)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        StatusIndicator(isActive: website.isActive)
                        
                        if let lastData = website.lastDataReceived {
                            Text("最終データ: \(lastData.formatted(date: .abbreviated, time: .shortened))")
                                .font(.caption)
                                .foregroundColor(DesignSystem.textSecondary)
                        } else {
                            Text("データなし")
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                    }
                }
                
                // Settings Summary
                HStack(spacing: 16) {
                    SettingBadge(
                        title: "トラッキング",
                        isEnabled: website.settings.trackingEnabled,
                        icon: "antenna.radiowaves.left.and.right"
                    )
                    
                    SettingBadge(
                        title: "ヒートマップ",
                        isEnabled: website.settings.heatmapEnabled,
                        icon: "flame.fill"
                    )
                    
                    SettingBadge(
                        title: "A/Bテスト",
                        isEnabled: website.settings.abTestingEnabled,
                        icon: "arrow.left.arrow.right"
                    )
                    
                    SettingBadge(
                        title: "プライバシー",
                        isEnabled: website.settings.privacyMode,
                        icon: "lock.fill"
                    )
                }
                
                // Actions
                HStack {
                    AnimatedButton(
                        title: "スクリプト表示",
                        icon: "doc.text",
                        style: .secondary,
                        action: onTap
                    )
                    
                    Spacer()
                    
                    AnimatedButton(
                        title: website.isActive ? "停止" : "開始",
                        icon: website.isActive ? "pause.fill" : "play.fill",
                        style: website.isActive ? .danger : .success,
                        action: {
                            websiteManager.toggleWebsiteStatus(website)
                        }
                    )
                }
            }
        }
    }
}

struct StatusIndicator: View {
    let isActive: Bool
    
    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(isActive ? Color.green : Color.red)
                .frame(width: 8, height: 8)
            
            Text(isActive ? "アクティブ" : "停止中")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(isActive ? .green : .red)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            Capsule()
                .fill((isActive ? Color.green : Color.red).opacity(0.1))
        )
    }
}

struct SettingBadge: View {
    let title: String
    let isEnabled: Bool
    let icon: String
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundColor(isEnabled ? DesignSystem.textPrimary : DesignSystem.textSecondary)
            
            Text(title)
                .font(.caption)
                .foregroundColor(isEnabled ? DesignSystem.textPrimary : DesignSystem.textSecondary)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            Capsule()
                .fill(isEnabled ? Color.blue.opacity(0.1) : Color.gray.opacity(0.1))
        )
    }
}

struct AddWebsiteSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var websiteManager: WebsiteManager
    
    @State private var name = ""
    @State private var url = ""
    @State private var description = ""
    @State private var trackingEnabled = true
    @State private var heatmapEnabled = true
    @State private var abTestingEnabled = true
    @State private var privacyMode = false
    @State private var customEvents: [String] = []
    @State private var conversionGoals: [String] = []
    @State private var newCustomEvent = ""
    @State private var newConversionGoal = ""
    @State private var showingValidationError = false
    @State private var validationMessage = ""
    
    var body: some View {
        NavigationView {
            Form {
                Section("基本情報") {
                    TextField("ウェブサイト名", text: $name)
                    TextField("URL", text: $url)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    TextField("説明", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }
                
                Section("トラッキング設定") {
                    Toggle("ページビュートラッキング", isOn: $trackingEnabled)
                    Toggle("ヒートマップ", isOn: $heatmapEnabled)
                    Toggle("A/Bテスト", isOn: $abTestingEnabled)
                    Toggle("プライバシーモード", isOn: $privacyMode)
                }
                
                Section("カスタムイベント") {
                    ForEach(customEvents, id: \.self) { event in
                        HStack {
                            Text(event)
                            Spacer()
                            Button("削除") {
                                customEvents.removeAll { $0 == event }
                            }
                            .foregroundColor(.red)
                        }
                    }
                    
                    HStack {
                        TextField("新しいイベント", text: $newCustomEvent)
                        Button("追加") {
                            if !newCustomEvent.isEmpty {
                                customEvents.append(newCustomEvent)
                                newCustomEvent = ""
                            }
                        }
                        .disabled(newCustomEvent.isEmpty)
                    }
                }
                
                Section("コンバージョン目標") {
                    ForEach(conversionGoals, id: \.self) { goal in
                        HStack {
                            Text(goal)
                            Spacer()
                            Button("削除") {
                                conversionGoals.removeAll { $0 == goal }
                            }
                            .foregroundColor(.red)
                        }
                    }
                    
                    HStack {
                        TextField("新しい目標", text: $newConversionGoal)
                        Button("追加") {
                            if !newConversionGoal.isEmpty {
                                conversionGoals.append(newConversionGoal)
                                newConversionGoal = ""
                            }
                        }
                        .disabled(newConversionGoal.isEmpty)
                    }
                }
            }
            .navigationTitle("ウェブサイト追加")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("キャンセル") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("追加") {
                        addWebsite()
                    }
                    .disabled(name.isEmpty || url.isEmpty)
                }
            }
            .alert("バリデーションエラー", isPresented: $showingValidationError) {
                Button("OK") { }
            } message: {
                Text(validationMessage)
            }
        }
    }
    
    private func addWebsite() {
        // バリデーション
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            validationMessage = "ウェブサイト名を入力してください"
            showingValidationError = true
            return
        }
        
        guard !url.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            validationMessage = "URLを入力してください"
            showingValidationError = true
            return
        }
        
        guard websiteManager.validateWebsiteURL(url) else {
            validationMessage = "有効なURLを入力してください"
            showingValidationError = true
            return
        }
        
        guard websiteManager.isWebsiteNameUnique(name) else {
            validationMessage = "この名前は既に使用されています"
            showingValidationError = true
            return
        }
        
        // 設定を作成
        let settings = WebsiteSettings(
            trackingEnabled: trackingEnabled,
            heatmapEnabled: heatmapEnabled,
            abTestingEnabled: abTestingEnabled,
            privacyMode: privacyMode,
            customEvents: customEvents,
            conversionGoals: conversionGoals
        )
        
        // ウェブサイトを追加
        websiteManager.addWebsite(
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            url: url.trimmingCharacters(in: .whitespacesAndNewlines),
            description: description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : description.trimmingCharacters(in: .whitespacesAndNewlines)
        )
        
        dismiss()
    }
}

struct ScriptDetailView: View {
    let website: Website
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var websiteManager: WebsiteManager
    @State private var showingSettingsSheet = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(alignment: .leading, spacing: 16) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(website.name)
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(DesignSystem.textPrimary)
                                
                                Text(website.url)
                                    .font(.subheadline)
                                    .foregroundColor(DesignSystem.textSecondary)
                            }
                            
                            Spacer()
                            
                            StatusIndicator(isActive: website.isActive)
                        }
                        
                        if let description = website.description {
                            Text(description)
                                .font(.subheadline)
                                .foregroundColor(DesignSystem.textSecondary)
                        }
                    }
                    .padding(DesignSystem.padding)
                    .background(
                        RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                            .fill(DesignSystem.cardBackground)
                    )
                    
                    // Settings
                    ModernCardView {
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Text("トラッキング設定")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(DesignSystem.textPrimary)
                                
                                Spacer()
                                
                                AnimatedButton(
                                    title: "編集",
                                    icon: "pencil",
                                    style: .secondary,
                                    action: { showingSettingsSheet = true }
                                )
                            }
                            
                            VStack(spacing: 12) {
                                SettingRow(
                                    title: "ページビュートラッキング",
                                    isEnabled: website.settings.trackingEnabled,
                                    icon: "antenna.radiowaves.left.and.right"
                                )
                                
                                SettingRow(
                                    title: "ヒートマップ",
                                    isEnabled: website.settings.heatmapEnabled,
                                    icon: "flame.fill"
                                )
                                
                                SettingRow(
                                    title: "A/Bテスト",
                                    isEnabled: website.settings.abTestingEnabled,
                                    icon: "arrow.left.arrow.right"
                                )
                                
                                SettingRow(
                                    title: "プライバシーモード",
                                    isEnabled: website.settings.privacyMode,
                                    icon: "lock.fill"
                                )
                            }
                        }
                    }
                    
                    // Tracking Script
                    ModernCardView {
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Text("トラッキングスクリプト")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(DesignSystem.textPrimary)
                                
                                Spacer()
                                
                                AnimatedButton(
                                    title: "コピー",
                                    icon: "doc.on.doc",
                                    style: .secondary,
                                    action: copyScript
                                )
                            }
                            
                            ScrollView {
                                Text(website.trackingCode)
                                    .font(.system(.caption, design: .monospaced))
                                    .foregroundColor(DesignSystem.textPrimary)
                                    .padding(12)
                                    .background(
                                        RoundedRectangle(cornerRadius: DesignSystem.smallCornerRadius)
                                            .fill(Color.gray.opacity(0.1))
                                    )
                            }
                            .frame(maxHeight: 300)
                        }
                    }
                    
                    // Instructions
                    ModernCardView {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("実装手順")
                                .font(.headline)
                                .fontWeight(.semibold)
                                .foregroundColor(DesignSystem.textPrimary)
                            
                            VStack(alignment: .leading, spacing: 12) {
                                InstructionStep(
                                    number: 1,
                                    title: "スクリプトをコピー",
                                    description: "上記のトラッキングスクリプトをコピーします"
                                )
                                
                                InstructionStep(
                                    number: 2,
                                    title: "HTMLに埋め込み",
                                    description: "ウェブサイトの</head>タグの直前にスクリプトを貼り付けます"
                                )
                                
                                InstructionStep(
                                    number: 3,
                                    title: "動作確認",
                                    description: "ページを読み込んで、コンソールにエラーがないことを確認します"
                                )
                                
                                InstructionStep(
                                    number: 4,
                                    title: "データ確認",
                                    description: "ダッシュボードでデータが受信されていることを確認します"
                                )
                            }
                        }
                    }
                }
                .padding(DesignSystem.padding)
            }
            .background(DesignSystem.backgroundGradient)
            .navigationTitle("スクリプト詳細")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("閉じる") {
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showingSettingsSheet) {
                SettingsSheet(website: website)
            }
        }
    }
    
    private func copyScript() {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(website.trackingCode, forType: .string)
    }
}

struct SettingRow: View {
    let title: String
    let isEnabled: Bool
    let icon: String
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundColor(isEnabled ? DesignSystem.textPrimary : DesignSystem.textSecondary)
                .frame(width: 20)
            
            Text(title)
                .font(.subheadline)
                .foregroundColor(DesignSystem.textPrimary)
            
            Spacer()
            
            Image(systemName: isEnabled ? "checkmark.circle.fill" : "xmark.circle.fill")
                .foregroundColor(isEnabled ? .green : .red)
        }
    }
}

struct InstructionStep: View {
    let number: Int
    let title: String
    let description: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .frame(width: 20, height: 20)
                .background(
                    Circle()
                        .fill(DesignSystem.textAccent)
                )
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(DesignSystem.textPrimary)
                
                Text(description)
                    .font(.caption)
                    .foregroundColor(DesignSystem.textSecondary)
            }
        }
    }
}

struct SettingsSheet: View {
    let website: Website
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var websiteManager: WebsiteManager
    
    @State private var trackingEnabled: Bool
    @State private var heatmapEnabled: Bool
    @State private var abTestingEnabled: Bool
    @State private var privacyMode: Bool
    @State private var customEvents: [String]
    @State private var conversionGoals: [String]
    @State private var newCustomEvent = ""
    @State private var newConversionGoal = ""
    
    init(website: Website) {
        self.website = website
        self._trackingEnabled = State(initialValue: website.settings.trackingEnabled)
        self._heatmapEnabled = State(initialValue: website.settings.heatmapEnabled)
        self._abTestingEnabled = State(initialValue: website.settings.abTestingEnabled)
        self._privacyMode = State(initialValue: website.settings.privacyMode)
        self._customEvents = State(initialValue: website.settings.customEvents)
        self._conversionGoals = State(initialValue: website.settings.conversionGoals)
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("トラッキング設定") {
                    Toggle("ページビュートラッキング", isOn: $trackingEnabled)
                    Toggle("ヒートマップ", isOn: $heatmapEnabled)
                    Toggle("A/Bテスト", isOn: $abTestingEnabled)
                    Toggle("プライバシーモード", isOn: $privacyMode)
                }
                
                Section("カスタムイベント") {
                    ForEach(customEvents, id: \.self) { event in
                        HStack {
                            Text(event)
                            Spacer()
                            Button("削除") {
                                customEvents.removeAll { $0 == event }
                            }
                            .foregroundColor(.red)
                        }
                    }
                    
                    HStack {
                        TextField("新しいイベント", text: $newCustomEvent)
                        Button("追加") {
                            if !newCustomEvent.isEmpty {
                                customEvents.append(newCustomEvent)
                                newCustomEvent = ""
                            }
                        }
                        .disabled(newCustomEvent.isEmpty)
                    }
                }
                
                Section("コンバージョン目標") {
                    ForEach(conversionGoals, id: \.self) { goal in
                        HStack {
                            Text(goal)
                            Spacer()
                            Button("削除") {
                                conversionGoals.removeAll { $0 == goal }
                            }
                            .foregroundColor(.red)
                        }
                    }
                    
                    HStack {
                        TextField("新しい目標", text: $newConversionGoal)
                        Button("追加") {
                            if !newConversionGoal.isEmpty {
                                conversionGoals.append(newConversionGoal)
                                newConversionGoal = ""
                            }
                        }
                        .disabled(newConversionGoal.isEmpty)
                    }
                }
            }
            .navigationTitle("設定編集")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("キャンセル") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        saveSettings()
                    }
                }
            }
        }
    }
    
    private func saveSettings() {
        let newSettings = WebsiteSettings(
            trackingEnabled: trackingEnabled,
            heatmapEnabled: heatmapEnabled,
            abTestingEnabled: abTestingEnabled,
            privacyMode: privacyMode,
            customEvents: customEvents,
            conversionGoals: conversionGoals
        )
        
        let updatedWebsite = Website(
            id: website.id,
            name: website.name,
            url: website.url,
            description: website.description,
            trackingCode: websiteManager.generateTrackingCode(for: website.url, settings: newSettings),
            isActive: website.isActive,
            createdAt: website.createdAt,
            lastDataReceived: website.lastDataReceived,
            settings: newSettings
        )
        
        websiteManager.updateWebsite(updatedWebsite)
        dismiss()
    }
}

#Preview {
    TrackingScriptView()
        .environmentObject(WebsiteManager())
} 