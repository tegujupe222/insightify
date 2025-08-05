import Foundation
import SwiftUI

// MARK: - Website Model

struct Website: Identifiable, Codable {
    let id: UUID
    let name: String
    let url: String
    let description: String?
    let trackingCode: String
    let isActive: Bool
    let createdAt: Date
    let lastDataReceived: Date?
    let settings: WebsiteSettings
    
    init(id: UUID = UUID(), name: String, url: String, description: String? = nil, trackingCode: String = "", isActive: Bool = true, createdAt: Date = Date(), lastDataReceived: Date? = nil, settings: WebsiteSettings = WebsiteSettings()) {
        self.id = id
        self.name = name
        self.url = url
        self.description = description
        self.trackingCode = trackingCode
        self.isActive = isActive
        self.createdAt = createdAt
        self.lastDataReceived = lastDataReceived
        self.settings = settings
    }
}

struct WebsiteSettings: Codable {
    var trackingEnabled: Bool = true
    var heatmapEnabled: Bool = true
    var abTestingEnabled: Bool = true
    var privacyMode: Bool = false
    var customEvents: [String] = []
    var conversionGoals: [String] = []
    
    init(trackingEnabled: Bool = true, heatmapEnabled: Bool = true, abTestingEnabled: Bool = true, privacyMode: Bool = false, customEvents: [String] = [], conversionGoals: [String] = []) {
        self.trackingEnabled = trackingEnabled
        self.heatmapEnabled = heatmapEnabled
        self.abTestingEnabled = abTestingEnabled
        self.privacyMode = privacyMode
        self.customEvents = customEvents
        self.conversionGoals = conversionGoals
    }
}

// MARK: - Website Manager

class WebsiteManager: ObservableObject {
    @Published var websites: [Website] = []
    @Published var selectedWebsite: Website?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let userDefaults = UserDefaults.standard
    private let websitesKey = "saved_websites"
    
    init() {
        loadWebsites()
    }
    
    // MARK: - Website Management
    
    func addWebsite(name: String, url: String, description: String? = nil) {
        let settings = WebsiteSettings()
        let trackingCode = generateTrackingCode(for: url, settings: settings)
        
        let website = Website(
            name: name,
            url: url,
            description: description,
            trackingCode: trackingCode,
            settings: settings
        )
        
        websites.append(website)
        saveWebsites()
        
        #if DEBUG
        print("🌐 Website added: \(name) (\(url))")
        #endif
    }
    
    func updateWebsite(_ website: Website) {
        if let index = websites.firstIndex(where: { $0.id == website.id }) {
            websites[index] = website
            saveWebsites()
        }
    }
    
    func deleteWebsite(_ website: Website) {
        websites.removeAll { $0.id == website.id }
        saveWebsites()
    }
    
    func toggleWebsiteStatus(_ website: Website) {
        var updatedWebsite = website
        updatedWebsite = Website(
            id: website.id,
            name: website.name,
            url: website.url,
            description: website.description,
            trackingCode: website.trackingCode,
            isActive: !website.isActive,
            createdAt: website.createdAt,
            lastDataReceived: website.lastDataReceived,
            settings: website.settings
        )
        updateWebsite(updatedWebsite)
    }
    
    // MARK: - Tracking Code Generation
    
    func generateTrackingCode(for url: String, settings: WebsiteSettings) -> String {
        return """
        <!-- Insight Analytics Tracking Script -->
        <script>
        (function() {
            'use strict';
            
            // Configuration
            const config = {
                website: '\(url)',
                trackingEnabled: \(settings.trackingEnabled),
                heatmapEnabled: \(settings.heatmapEnabled),
                abTestingEnabled: \(settings.abTestingEnabled),
                privacyMode: \(settings.privacyMode),
                customEvents: \(settings.customEvents),
                conversionGoals: \(settings.conversionGoals)
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
                    websiteId: '\(UUID().uuidString)',
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
                    elementY: rect.top + event.clientY,
                    elementText: element.textContent ? element.textContent.substring(0, 100) : null,
                    viewportWidth: window.innerWidth,
                    viewportHeight: window.innerHeight
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
            
            // Track custom events
            function trackCustomEvent(eventName, data = {}) {
                if (!config.customEvents.includes(eventName)) return;
                
                sendAnalytics('custom', {
                    eventName: eventName,
                    ...data
                });
            }
            
            // Track conversions
            function trackConversion(goal, value = 0) {
                if (!config.conversionGoals.includes(goal)) return;
                
                sendAnalytics('conversion', {
                    goal: goal,
                    value: value
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
                trackScroll,
                trackCustomEvent,
                trackConversion,
                getABTestVariant,
                applyABTest
            };
            
        })();
        </script>
        """
    }
    
    func regenerateTrackingCode(for website: Website) -> Website {
        let newTrackingCode = generateTrackingCode(for: website.url, settings: website.settings)
        
        return Website(
            id: website.id,
            name: website.name,
            url: website.url,
            description: website.description,
            trackingCode: newTrackingCode,
            isActive: website.isActive,
            createdAt: website.createdAt,
            lastDataReceived: website.lastDataReceived,
            settings: website.settings
        )
    }
    
    // MARK: - Data Persistence
    
    private func saveWebsites() {
        if let encoded = try? JSONEncoder().encode(websites) {
            userDefaults.set(encoded, forKey: websitesKey)
        }
    }
    
    private func loadWebsites() {
        if let data = userDefaults.data(forKey: websitesKey),
           let decoded = try? JSONDecoder().decode([Website].self, from: data) {
            websites = decoded
        }
    }
    
    // MARK: - Analytics Integration
    
    func updateLastDataReceived(for websiteId: UUID) {
        if let index = websites.firstIndex(where: { $0.id == websiteId }) {
            var updatedWebsite = websites[index]
            updatedWebsite = Website(
                id: updatedWebsite.id,
                name: updatedWebsite.name,
                url: updatedWebsite.url,
                description: updatedWebsite.description,
                trackingCode: updatedWebsite.trackingCode,
                isActive: updatedWebsite.isActive,
                createdAt: updatedWebsite.createdAt,
                lastDataReceived: Date(),
                settings: updatedWebsite.settings
            )
            websites[index] = updatedWebsite
            saveWebsites()
        }
    }
    
    // MARK: - Validation
    
    func validateWebsiteURL(_ url: String) -> Bool {
        // 空文字列チェック
        guard !url.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return false
        }
        
        // URL形式チェック
        guard let urlObject = URL(string: url.trimmingCharacters(in: .whitespacesAndNewlines)) else {
            return false
        }
        
        // スキームチェック
        guard let scheme = urlObject.scheme,
              (scheme == "http" || scheme == "https") else {
            return false
        }
        
        // ホストチェック
        guard let host = urlObject.host,
              !host.isEmpty else {
            return false
        }
        
        return true
    }
    
    func isWebsiteNameUnique(_ name: String) -> Bool {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return false }
        
        return !websites.contains { $0.name.lowercased() == trimmedName.lowercased() }
    }
} 