import Foundation
import Combine
import SwiftUI

// MARK: - Data Models

struct PageViewData: Identifiable, Codable {
    let id: UUID
    let url: String
    let timestamp: Date
    let sessionId: String
    let userAgent: String
    let referrer: String?
    let pageTitle: String
    let loadTime: Double?
    
    init(id: UUID = UUID(), url: String, timestamp: Date, sessionId: String, userAgent: String, referrer: String?, pageTitle: String, loadTime: Double?) {
        self.id = id
        self.url = url
        self.timestamp = timestamp
        self.sessionId = sessionId
        self.userAgent = userAgent
        self.referrer = referrer
        self.pageTitle = pageTitle
        self.loadTime = loadTime
    }
}

struct ClickEvent: Identifiable, Codable {
    let id: UUID
    let url: String
    let elementId: String?
    let elementClass: String?
    let elementTag: String
    let x: Int
    let y: Int
    let timestamp: Date
    let sessionId: String
    let elementText: String?
    let viewportWidth: Int?
    let viewportHeight: Int?
    
    init(id: UUID = UUID(), url: String, elementId: String?, elementClass: String?, elementTag: String, x: Int, y: Int, timestamp: Date, sessionId: String, elementText: String?, viewportWidth: Int?, viewportHeight: Int?) {
        self.id = id
        self.url = url
        self.elementId = elementId
        self.elementClass = elementClass
        self.elementTag = elementTag
        self.x = x
        self.y = y
        self.timestamp = timestamp
        self.sessionId = sessionId
        self.elementText = elementText
        self.viewportWidth = viewportWidth
        self.viewportHeight = viewportHeight
    }
}

struct ConversionEvent: Identifiable, Codable {
    let id: UUID
    let url: String
    let goal: String
    let value: Double
    let timestamp: Date
    let sessionId: String
    let abTestVariant: String?
    let metadata: [String: String]?
    
    init(id: UUID = UUID(), url: String, goal: String, value: Double, timestamp: Date, sessionId: String, abTestVariant: String?, metadata: [String: String]?) {
        self.id = id
        self.url = url
        self.goal = goal
        self.value = value
        self.timestamp = timestamp
        self.sessionId = sessionId
        self.abTestVariant = abTestVariant
        self.metadata = metadata
    }
}

struct ABTest: Identifiable, Codable {
    let id: UUID
    let name: String
    let description: String
    let startDate: Date
    let endDate: Date?
    let status: ABTestStatus
    let variants: [ABTestVariant]
    let trafficSplit: Double
    let conversionGoal: String
    
    init(id: UUID = UUID(), name: String, description: String, startDate: Date, endDate: Date?, status: ABTestStatus, variants: [ABTestVariant], trafficSplit: Double, conversionGoal: String) {
        self.id = id
        self.name = name
        self.description = description
        self.startDate = startDate
        self.endDate = endDate
        self.status = status
        self.variants = variants
        self.trafficSplit = trafficSplit
        self.conversionGoal = conversionGoal
    }
}

enum ABTestStatus: String, Codable, CaseIterable {
    case running = "実行中"
    case paused = "一時停止"
    case completed = "完了"
    case draft = "下書き"
}

struct ABTestVariant: Identifiable, Codable {
    let id: UUID
    let name: String
    let description: String
    let visitors: Int
    let conversions: Int
    let conversionRate: Double
    let revenue: Double?
    let changes: [ElementChange]?
    
    init(id: UUID = UUID(), name: String, description: String, visitors: Int, conversions: Int, conversionRate: Double, revenue: Double?, changes: [ElementChange]? = nil) {
        self.id = id
        self.name = name
        self.description = description
        self.visitors = visitors
        self.conversions = conversions
        self.conversionRate = conversionRate
        self.revenue = revenue
        self.changes = changes
    }
}

struct Funnel: Identifiable, Codable {
    let id: UUID
    let name: String
    let description: String
    let steps: [FunnelStep]
    let totalConversions: Int
    let conversionRate: Double
    let createdAt: Date
    
    init(id: UUID = UUID(), name: String, description: String, steps: [FunnelStep], totalConversions: Int, conversionRate: Double, createdAt: Date) {
        self.id = id
        self.name = name
        self.description = description
        self.steps = steps
        self.totalConversions = totalConversions
        self.conversionRate = conversionRate
        self.createdAt = createdAt
    }
}

struct FunnelStep: Identifiable, Codable {
    let id: UUID
    let name: String
    let url: String
    let visitors: Int
    let conversions: Int
    let conversionRate: Double
    let dropOffRate: Double
    
    init(id: UUID = UUID(), name: String, url: String, visitors: Int, conversions: Int, conversionRate: Double, dropOffRate: Double) {
        self.id = id
        self.name = name
        self.url = url
        self.visitors = visitors
        self.conversions = conversions
        self.conversionRate = conversionRate
        self.dropOffRate = dropOffRate
    }
}

struct SessionData: Codable {
    let id: String
    let startTime: Date
    var lastActivity: Date
    var pageViews: [PageViewData]
    var clicks: [ClickEvent]
    var conversions: [ConversionEvent]
    var scrollDepth: Int?
    
    var duration: TimeInterval {
        lastActivity.timeIntervalSince(startTime)
    }
}

struct SessionStats {
    let activeSessions: Int
    let totalPageViews: Int
    let totalClicks: Int
    let totalConversions: Int
    let averageSessionDuration: TimeInterval
}

struct ElementChange: Codable {
    let selector: String
    let property: String
    let value: String
}

// MARK: - Legacy Data Manager (Deprecated)

// This class is deprecated and will be replaced by the new DataManager in DataManager.swift
// Keeping for backward compatibility during transition
class LegacyDataManager {
    private let userDefaults = UserDefaults.standard
    
    // MARK: - Keys
    private enum Keys {
        static let pageViews = "analytics_page_views"
        static let clickEvents = "analytics_click_events"
        static let conversionEvents = "analytics_conversion_events"
        static let abTests = "analytics_ab_tests"
        static let funnels = "analytics_funnels"
        static let realtimeSessions = "analytics_realtime_sessions"
        static let lastUpdated = "analytics_last_updated"
    }
    
    // MARK: - Error Types
    
    enum DataManagerError: LocalizedError {
        case dataLoadFailed
        case dataSaveFailed
        
        var errorDescription: String? {
            switch self {
            case .dataLoadFailed:
                return "データ読み込みに失敗"
            case .dataSaveFailed:
                return "データ保存に失敗"
            }
        }
    }
    
    // MARK: - Load Methods
    
    func loadPageViews() async throws -> [PageViewData] {
        guard let data = userDefaults.data(forKey: Keys.pageViews),
              let pageViews = try? JSONDecoder().decode([PageViewData].self, from: data) else {
            throw DataManagerError.dataLoadFailed
        }
        return pageViews
    }
    
    func loadClickEvents() async throws -> [ClickEvent] {
        guard let data = userDefaults.data(forKey: Keys.clickEvents),
              let clickEvents = try? JSONDecoder().decode([ClickEvent].self, from: data) else {
            throw DataManagerError.dataLoadFailed
        }
        return clickEvents
    }
    
    func loadConversionEvents() async throws -> [ConversionEvent] {
        guard let data = userDefaults.data(forKey: Keys.conversionEvents),
              let conversionEvents = try? JSONDecoder().decode([ConversionEvent].self, from: data) else {
            throw DataManagerError.dataLoadFailed
        }
        return conversionEvents
    }
    
    func loadABTests() async throws -> [ABTest] {
        guard let data = userDefaults.data(forKey: Keys.abTests),
              let abTests = try? JSONDecoder().decode([ABTest].self, from: data) else {
            throw DataManagerError.dataLoadFailed
        }
        return abTests
    }
    
    func loadFunnels() async throws -> [Funnel] {
        guard let data = userDefaults.data(forKey: Keys.funnels),
              let funnels = try? JSONDecoder().decode([Funnel].self, from: data) else {
            throw DataManagerError.dataLoadFailed
        }
        return funnels
    }
    
    func loadRealtimeSessions() async throws -> [String: SessionData] {
        guard let data = userDefaults.data(forKey: Keys.realtimeSessions),
              let sessions = try? JSONDecoder().decode([String: SessionData].self, from: data) else {
            throw DataManagerError.dataLoadFailed
        }
        return sessions
    }
    
    func loadLastUpdated() async throws -> Date {
        return userDefaults.object(forKey: Keys.lastUpdated) as? Date ?? Date()
    }
    
    // MARK: - Save Methods
    
    func savePageViews(_ pageViews: [PageViewData]) async {
        if let data = try? JSONEncoder().encode(pageViews) {
            userDefaults.set(data, forKey: Keys.pageViews)
        }
    }
    
    func saveClickEvents(_ clickEvents: [ClickEvent]) async {
        if let data = try? JSONEncoder().encode(clickEvents) {
            userDefaults.set(data, forKey: Keys.clickEvents)
        }
    }
    
    func saveConversionEvents(_ conversionEvents: [ConversionEvent]) async {
        if let data = try? JSONEncoder().encode(conversionEvents) {
            userDefaults.set(data, forKey: Keys.conversionEvents)
        }
    }
    
    func saveABTests(_ abTests: [ABTest]) async {
        if let data = try? JSONEncoder().encode(abTests) {
            userDefaults.set(data, forKey: Keys.abTests)
        }
    }
    
    func saveFunnels(_ funnels: [Funnel]) async {
        if let data = try? JSONEncoder().encode(funnels) {
            userDefaults.set(data, forKey: Keys.funnels)
        }
    }
    
    func saveRealtimeSessions(_ sessions: [String: SessionData]) async {
        if let data = try? JSONEncoder().encode(sessions) {
            userDefaults.set(data, forKey: Keys.realtimeSessions)
        }
    }
    
    func saveLastUpdated(_ date: Date) async {
        userDefaults.set(date, forKey: Keys.lastUpdated)
    }
    
    // MARK: - Clear Methods
    
    func clearAllData() async {
        userDefaults.removeObject(forKey: Keys.pageViews)
        userDefaults.removeObject(forKey: Keys.clickEvents)
        userDefaults.removeObject(forKey: Keys.conversionEvents)
        userDefaults.removeObject(forKey: Keys.abTests)
        userDefaults.removeObject(forKey: Keys.funnels)
        userDefaults.removeObject(forKey: Keys.realtimeSessions)
        userDefaults.removeObject(forKey: Keys.lastUpdated)
    }
    
    func clearOldData(olderThan days: Int) async {
        let cutoffDate = Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()
        
        do {
            // Clear old page views
            let pageViews = try await loadPageViews()
            let filteredPageViews = pageViews.filter { $0.timestamp > cutoffDate }
            await savePageViews(filteredPageViews)
            
            // Clear old click events
            let clickEvents = try await loadClickEvents()
            let filteredClickEvents = clickEvents.filter { $0.timestamp > cutoffDate }
            await saveClickEvents(filteredClickEvents)
            
            // Clear old conversion events
            let conversionEvents = try await loadConversionEvents()
            let filteredConversionEvents = conversionEvents.filter { $0.timestamp > cutoffDate }
            await saveConversionEvents(filteredConversionEvents)
            
            // Clear old sessions
            let sessions = try await loadRealtimeSessions()
            let filteredSessions = sessions.filter { $0.value.lastActivity > cutoffDate }
            await saveRealtimeSessions(filteredSessions)
        } catch {
            print("Clear old data error: \(error)")
        }
    }
}

@MainActor
class AnalyticsManager: ObservableObject {
    @Published var pageViews: [PageViewData] = []
    @Published var clickEvents: [ClickEvent] = []
    @Published var conversionEvents: [ConversionEvent] = []
    @Published var abTests: [ABTest] = []
    @Published var funnels: [Funnel] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var lastUpdated: Date = Date()
    
    // リアルタイム計測用の追加プロパティ
    @Published var realtimeSessions: [String: SessionData] = [:]
    @Published var currentSessionId: String?
    @Published var isTrackingEnabled = true
    
    private var cancellables = Set<AnyCancellable>()
    private let dataManager = LegacyDataManager()
    private let updateTimer = Timer.publish(every: 30, on: .main, in: .common).autoconnect()
    private let autoSaveTimer = Timer.publish(every: 60, on: .main, in: .common).autoconnect()
    
    init() {
        setupDataObservers()
        setupAutoRefresh()
        setupAutoSave()
        Task { [weak self] in
            await self?.loadData()
        }
    }
    
    deinit {
        cancellables.removeAll()
    }
    
    // MARK: - Real-time Data Processing
    
    func processWebViewEvent(_ eventData: [String: Any]) {
        guard isTrackingEnabled else { return }
        
        do {
            // データの検証を強化
            guard let eventType = eventData["eventType"] as? String,
                  let url = eventData["url"] as? String,
                  let sessionId = eventData["sessionId"] as? String,
                  let timestampString = eventData["timestamp"] as? String,
                  !url.isEmpty,
                  !sessionId.isEmpty,
                  !timestampString.isEmpty else {
                throw AnalyticsError.invalidEventData
            }
            
            // タイムスタンプの解析を安全に行う
            let formatter = ISO8601DateFormatter()
            guard let timestamp = formatter.date(from: timestampString) else {
                throw AnalyticsError.invalidTimestamp
            }
            
            // セッション管理
            if realtimeSessions[sessionId] == nil {
                realtimeSessions[sessionId] = SessionData(
                    id: sessionId,
                    startTime: timestamp,
                    lastActivity: timestamp,
                    pageViews: [],
                    clicks: [],
                    conversions: []
                )
            }
            
            realtimeSessions[sessionId]?.lastActivity = timestamp
            
            switch eventType {
            case "pageview":
                handlePageViewEvent(eventData, sessionId: sessionId, timestamp: timestamp)
            case "click":
                handleClickEvent(eventData, sessionId: sessionId, timestamp: timestamp)
            case "scroll":
                handleScrollEvent(eventData, sessionId: sessionId, timestamp: timestamp)
            case "conversion":
                handleConversionEvent(eventData, sessionId: sessionId, timestamp: timestamp)
            default:
                throw AnalyticsError.unknownEventType
            }
            
            lastUpdated = Date()
            
        } catch {
            errorMessage = "イベント処理エラー: \(error.localizedDescription)"
            #if DEBUG
            print("AnalyticsManager Error: \(error)")
            #endif
        }
    }
    
    private func handlePageViewEvent(_ data: [String: Any], sessionId: String, timestamp: Date) {
        guard let title = data["title"] as? String,
              let path = data["path"] as? String else { return }
        
        let pageView = PageViewData(
            id: UUID(),
            url: data["url"] as? String ?? "",
            timestamp: timestamp,
            sessionId: sessionId,
            userAgent: data["userAgent"] as? String ?? "",
            referrer: data["referrer"] as? String,
            pageTitle: title,
            loadTime: nil
        )
        
        pageViews.append(pageView)
        realtimeSessions[sessionId]?.pageViews.append(pageView)
        
        #if DEBUG
        print("📄 Page view tracked: \(title) at \(path)")
        #endif
    }
    
    private func handleClickEvent(_ data: [String: Any], sessionId: String, timestamp: Date) {
        guard let elementTag = data["elementTag"] as? String,
              let x = data["x"] as? Int,
              let y = data["y"] as? Int else { return }
        
        let clickEvent = ClickEvent(
            id: UUID(),
            url: data["url"] as? String ?? "",
            elementId: data["elementId"] as? String,
            elementClass: data["elementClass"] as? String,
            elementTag: elementTag,
            x: x,
            y: y,
            timestamp: timestamp,
            sessionId: sessionId,
            elementText: data["elementText"] as? String,
            viewportWidth: data["viewportWidth"] as? Int,
            viewportHeight: data["viewportHeight"] as? Int
        )
        
        clickEvents.append(clickEvent)
        realtimeSessions[sessionId]?.clicks.append(clickEvent)
        
        #if DEBUG
        print("🖱️ Click tracked: \(elementTag) at (\(x), \(y))")
        #endif
    }
    
    private func handleScrollEvent(_ data: [String: Any], sessionId: String, timestamp: Date) {
        guard let scrollDepth = data["scrollDepth"] as? Int else { return }
        
        // スクロール深度をセッションデータに記録
        realtimeSessions[sessionId]?.scrollDepth = scrollDepth
        
        #if DEBUG
        print("📜 Scroll tracked: \(scrollDepth)% depth")
        #endif
    }
    
    private func handleConversionEvent(_ data: [String: Any], sessionId: String, timestamp: Date) {
        guard let goal = data["goal"] as? String else { return }
        let value = data["value"] as? Double ?? 0.0
        
        let conversionEvent = ConversionEvent(
            id: UUID(),
            url: data["url"] as? String ?? "",
            goal: goal,
            value: value,
            timestamp: timestamp,
            sessionId: sessionId,
            abTestVariant: data["abTestVariant"] as? String,
            metadata: data["metadata"] as? [String: String]
        )
        
        conversionEvents.append(conversionEvent)
        realtimeSessions[sessionId]?.conversions.append(conversionEvent)
        
        #if DEBUG
        print("🎯 Conversion tracked: \(goal) with value \(value)")
        #endif
    }
    
    // MARK: - Session Management
    
    func getActiveSessions() -> [SessionData] {
        let now = Date()
        let activeTimeout: TimeInterval = 30 * 60 // 30分
        
        return realtimeSessions.values.filter { session in
            now.timeIntervalSince(session.lastActivity) < activeTimeout
        }.sorted { $0.lastActivity > $1.lastActivity }
    }
    
    func getSessionStats() -> SessionStats {
        let activeSessions = getActiveSessions()
        let totalPageViews = activeSessions.reduce(0) { $0 + $1.pageViews.count }
        let totalClicks = activeSessions.reduce(0) { $0 + $1.clicks.count }
        let totalConversions = activeSessions.reduce(0) { $0 + $1.conversions.count }
        
        return SessionStats(
            activeSessions: activeSessions.count,
            totalPageViews: totalPageViews,
            totalClicks: totalClicks,
            totalConversions: totalConversions,
            averageSessionDuration: calculateAverageSessionDuration(activeSessions)
        )
    }
    
    private func calculateAverageSessionDuration(_ sessions: [SessionData]) -> TimeInterval {
        guard !sessions.isEmpty else { return 0 }
        
        let totalDuration = sessions.reduce(0.0) { total, session in
            total + session.lastActivity.timeIntervalSince(session.startTime)
        }
        
        return totalDuration / Double(sessions.count)
    }
    
    // MARK: - Tracking Control
    
    func toggleTracking() {
        isTrackingEnabled.toggle()
        #if DEBUG
        print("📊 Tracking \(isTrackingEnabled ? "enabled" : "disabled")")
        #endif
    }
    
    func clearSessionData() {
        realtimeSessions.removeAll()
        #if DEBUG
        print("🗑️ Session data cleared")
        #endif
    }
    
    func clearAllData() async {
        await dataManager.clearAllData()
        pageViews.removeAll()
        clickEvents.removeAll()
        conversionEvents.removeAll()
        abTests.removeAll()
        funnels.removeAll()
        realtimeSessions.removeAll()
        lastUpdated = Date()
        errorMessage = nil
    }
    
    func clearOldData(olderThan days: Int) async {
        await dataManager.clearOldData(olderThan: days)
        await loadData() // データを再読み込み
    }
    
    // MARK: - Setup Methods
    
    private func setupDataObservers() {
        // データ変更時の自動保存を設定
        Publishers.CombineLatest4(
            $pageViews,
            $clickEvents,
            $conversionEvents,
            $realtimeSessions
        )
        .debounce(for: .seconds(2), scheduler: DispatchQueue.main)
        .sink { [weak self] pageViews, clickEvents, conversionEvents, sessions in
            Task { [weak self] in
                await self?.saveAllData()
            }
        }
        .store(in: &cancellables)
        
        // エラー状態の監視
        $errorMessage
            .compactMap { $0 }
            .sink { error in
                print("AnalyticsManager Error: \(error)")
            }
            .store(in: &cancellables)
    }
    
    private func setupAutoRefresh() {
        updateTimer
            .sink { [weak self] _ in
                Task { [weak self] in
                    await self?.refreshData()
                }
            }
            .store(in: &cancellables)
    }
    
    private func setupAutoSave() {
        autoSaveTimer
            .sink { [weak self] _ in
                Task { [weak self] in
                    await self?.saveAllData()
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Data Loading
    
    private func loadData() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let loadedPageViews = try await dataManager.loadPageViews()
            let loadedClickEvents = try await dataManager.loadClickEvents()
            let loadedConversionEvents = try await dataManager.loadConversionEvents()
            let loadedABTests = try await dataManager.loadABTests()
            let loadedFunnels = try await dataManager.loadFunnels()
            let loadedSessions = try await dataManager.loadRealtimeSessions()
            let loadedLastUpdated = try await dataManager.loadLastUpdated()
            
            // If no saved data exists, load sample data
            if loadedPageViews.isEmpty && loadedClickEvents.isEmpty && loadedConversionEvents.isEmpty {
                await loadSampleData()
            } else {
                pageViews = loadedPageViews
                clickEvents = loadedClickEvents
                conversionEvents = loadedConversionEvents
                abTests = loadedABTests
                funnels = loadedFunnels
                realtimeSessions = loadedSessions
                lastUpdated = loadedLastUpdated
            }
        } catch {
            errorMessage = "データ読み込みエラー: \(error.localizedDescription)"
            #if DEBUG
            print("Load data error: \(error)")
            #endif
            // エラーが発生した場合はサンプルデータを読み込み
            await loadSampleData()
        }
        
        isLoading = false
    }
    
    private func refreshData() async {
        guard !isLoading else { return }
        
        isLoading = true
        errorMessage = nil
        
        do {
            // In a real app, this would fetch from your backend API
            try await fetchAnalyticsData()
            lastUpdated = Date()
        } catch {
            errorMessage = "データ更新エラー: \(error.localizedDescription)"
            #if DEBUG
            print("Refresh data error: \(error)")
            #endif
        }
        
        isLoading = false
    }
    
    func fetchAnalyticsData() async throws {
        // 実際のアプリでは、ここでAPIからデータを取得
        // 現在はサンプルデータを使用
        try await Task.sleep(nanoseconds: 1_000_000_000) // 1秒待機
        
        // サンプルデータを生成（重複を避ける）
        let timestamp = Date()
        let newPageView = PageViewData(
            url: "https://example.com/refresh-\(timestamp.timeIntervalSince1970)",
            timestamp: timestamp,
            sessionId: "refresh-session-\(UUID().uuidString.prefix(8))",
            userAgent: "Mozilla/5.0",
            referrer: nil,
            pageTitle: "Refreshed Page",
            loadTime: 1.2
        )
        
        pageViews.append(newPageView)
    }
    
    private func saveAllData() async {
        do {
            try await withThrowingTaskGroup(of: Void.self) { group in
                group.addTask {
                    await self.dataManager.savePageViews(self.pageViews)
                }
                group.addTask {
                    await self.dataManager.saveClickEvents(self.clickEvents)
                }
                group.addTask {
                    await self.dataManager.saveConversionEvents(self.conversionEvents)
                }
                group.addTask {
                    await self.dataManager.saveABTests(self.abTests)
                }
                group.addTask {
                    await self.dataManager.saveFunnels(self.funnels)
                }
                group.addTask {
                    await self.dataManager.saveRealtimeSessions(self.realtimeSessions)
                }
                group.addTask {
                    await self.dataManager.saveLastUpdated(self.lastUpdated)
                }
                
                try await group.waitForAll()
            }
        } catch {
            errorMessage = "データ保存エラー: \(error.localizedDescription)"
            #if DEBUG
            print("Save data error: \(error)")
            #endif
        }
    }
    
    // MARK: - Sample Data Generation
    
    private func loadSampleData() async {
        // Generate sample page views with more realistic data
        let samplePageViews = [
            PageViewData(
                url: "https://example.com/home",
                timestamp: Date().addingTimeInterval(-3600),
                sessionId: "sample_session_1",
                userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                referrer: nil,
                pageTitle: "ホームページ",
                loadTime: 1.2
            ),
            PageViewData(
                url: "https://example.com/products",
                timestamp: Date().addingTimeInterval(-1800),
                sessionId: "sample_session_1",
                userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                referrer: "https://example.com/home",
                pageTitle: "商品一覧",
                loadTime: 0.8
            ),
            PageViewData(
                url: "https://example.com/products/detail",
                timestamp: Date().addingTimeInterval(-1200),
                sessionId: "sample_session_2",
                userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)",
                referrer: "https://google.com",
                pageTitle: "商品詳細",
                loadTime: 1.5
            ),
            PageViewData(
                url: "https://example.com/checkout",
                timestamp: Date().addingTimeInterval(-900),
                sessionId: "sample_session_1",
                userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                referrer: "https://example.com/products",
                pageTitle: "購入ページ",
                loadTime: 0.9
            ),
            PageViewData(
                url: "https://example.com/about",
                timestamp: Date().addingTimeInterval(-600),
                sessionId: "sample_session_3",
                userAgent: "Mozilla/5.0 (iPad; CPU OS 15_0)",
                referrer: "https://twitter.com",
                pageTitle: "会社概要",
                loadTime: 1.1
            ),
            PageViewData(
                url: "https://example.com/contact",
                timestamp: Date().addingTimeInterval(-300),
                sessionId: "sample_session_4",
                userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                referrer: "https://example.com/home",
                pageTitle: "お問い合わせ",
                loadTime: 0.7
            )
        ]
        
        // Generate sample click events
        let sampleClickEvents = [
            ClickEvent(
                url: "https://example.com/home",
                elementId: "buy-button",
                elementClass: "btn-primary",
                elementTag: "button",
                x: 150,
                y: 200,
                timestamp: Date().addingTimeInterval(-900),
                sessionId: "sample_session_1",
                elementText: "購入する",
                viewportWidth: 1920,
                viewportHeight: 1080
            ),
            ClickEvent(
                url: "https://example.com/products",
                elementId: "product-1",
                elementClass: "product-card",
                elementTag: "div",
                x: 300,
                y: 400,
                timestamp: Date().addingTimeInterval(-600),
                sessionId: "sample_session_1",
                elementText: "商品詳細を見る",
                viewportWidth: 1920,
                viewportHeight: 1080
            )
        ]
        
        // Generate sample conversion events
        let sampleConversionEvents = [
            ConversionEvent(
                url: "https://example.com/checkout",
                goal: "purchase",
                value: 15000.0,
                timestamp: Date().addingTimeInterval(-300),
                sessionId: "sample_session_1",
                abTestVariant: nil,
                metadata: ["product_id": "123", "category": "electronics"]
            ),
            ConversionEvent(
                url: "https://example.com/checkout",
                goal: "purchase",
                value: 8500.0,
                timestamp: Date().addingTimeInterval(-1800),
                sessionId: "sample_session_2",
                abTestVariant: nil,
                metadata: ["product_id": "456", "category": "clothing"]
            ),
            ConversionEvent(
                url: "https://example.com/contact",
                goal: "contact",
                value: 0.0,
                timestamp: Date().addingTimeInterval(-600),
                sessionId: "sample_session_3",
                abTestVariant: nil,
                metadata: ["form_type": "inquiry"]
            )
        ]
        
        // Generate sample AB tests
        let sampleABTests = [
            ABTest(
                name: "ボタンカラーテスト",
                description: "購入ボタンの色を変更してコンバージョン率を測定",
                startDate: Date().addingTimeInterval(-86400),
                endDate: nil,
                status: .running,
                variants: [
                    ABTestVariant(
                        name: "コントロール（青）",
                        description: "現在の青色ボタン",
                        visitors: 1000,
                        conversions: 50,
                        conversionRate: 5.0,
                        revenue: 25000.0,
                        changes: []
                    ),
                    ABTestVariant(
                        name: "バリアントA（赤）",
                        description: "新しい赤色ボタン",
                        visitors: 1000,
                        conversions: 65,
                        conversionRate: 6.5,
                        revenue: 32500.0,
                        changes: [
                            ElementChange(selector: ".btn-primary", property: "background-color", value: "#dc3545")
                        ]
                    )
                ],
                trafficSplit: 0.5,
                conversionGoal: "purchase"
            )
        ]
        
        // Generate sample funnels
        let sampleFunnels = [
            Funnel(
                name: "購入ファネル",
                description: "商品閲覧から購入までのユーザージャーニー",
                steps: [
                    FunnelStep(
                        name: "ホームページ",
                        url: "/",
                        visitors: 1000,
                        conversions: 800,
                        conversionRate: 80.0,
                        dropOffRate: 20.0
                    ),
                    FunnelStep(
                        name: "商品一覧",
                        url: "/products",
                        visitors: 800,
                        conversions: 400,
                        conversionRate: 50.0,
                        dropOffRate: 50.0
                    ),
                    FunnelStep(
                        name: "商品詳細",
                        url: "/products/123",
                        visitors: 400,
                        conversions: 200,
                        conversionRate: 50.0,
                        dropOffRate: 50.0
                    ),
                    FunnelStep(
                        name: "購入完了",
                        url: "/checkout/complete",
                        visitors: 200,
                        conversions: 200,
                        conversionRate: 100.0,
                        dropOffRate: 0.0
                    )
                ],
                totalConversions: 200,
                conversionRate: 20.0,
                createdAt: Date().addingTimeInterval(-86400)
            )
        ]
        
        pageViews = samplePageViews
        clickEvents = sampleClickEvents
        conversionEvents = sampleConversionEvents
        abTests = sampleABTests
        funnels = sampleFunnels
    }
    
    // MARK: - Analytics Methods
    
    struct PageViewStats {
        let totalViews: Int
        let todayViews: Int
        let uniqueVisitors: Int
        let averageLoadTime: Double
    }
    
    struct ConversionStats {
        let totalConversions: Int
        let todayConversions: Int
        let totalValue: Double
        let conversionRate: Double
    }
    
    func getPageViewStats() -> PageViewStats {
        let today = Calendar.current.startOfDay(for: Date())
        let todayViews = pageViews.filter { Calendar.current.isDate($0.timestamp, inSameDayAs: today) }.count
        let uniqueVisitors = Set(pageViews.map { $0.sessionId }).count
        let averageLoadTime = pageViews.compactMap { $0.loadTime }.reduce(0, +) / Double(max(pageViews.count, 1))
        
        return PageViewStats(
            totalViews: pageViews.count,
            todayViews: todayViews,
            uniqueVisitors: uniqueVisitors,
            averageLoadTime: averageLoadTime
        )
    }
    
    func getConversionStats() -> ConversionStats {
        let today = Calendar.current.startOfDay(for: Date())
        let todayConversions = conversionEvents.filter { Calendar.current.isDate($0.timestamp, inSameDayAs: today) }.count
        let totalValue = conversionEvents.reduce(0) { $0 + $1.value }
        let conversionRate = pageViews.count > 0 ? Double(conversionEvents.count) / Double(pageViews.count) * 100 : 0
        
        return ConversionStats(
            totalConversions: conversionEvents.count,
            todayConversions: todayConversions,
            totalValue: totalValue,
            conversionRate: conversionRate
        )
    }
    
    func getABTests() -> [ABTest] {
        return abTests
    }
    
    // MARK: - Error Types
    
    enum AnalyticsError: LocalizedError {
        case invalidEventData
        case invalidTimestamp
        case unknownEventType
        case dataLoadFailed
        case dataSaveFailed
        
        var errorDescription: String? {
            switch self {
            case .invalidEventData:
                return "無効なイベントデータ"
            case .invalidTimestamp:
                return "無効なタイムスタンプ"
            case .unknownEventType:
                return "不明なイベントタイプ"
            case .dataLoadFailed:
                return "データ読み込みに失敗"
            case .dataSaveFailed:
                return "データ保存に失敗"
            }
        }
    }
} 