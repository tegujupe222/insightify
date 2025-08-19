import Foundation
import SwiftUI

// MARK: - Report Models

struct Report: Identifiable, Codable {
    let id: UUID
    let title: String
    let description: String
    let type: ReportType
    let dateRange: DateRange
    let createdAt: Date
    let data: ReportData
    let status: ReportStatus
    
    init(id: UUID = UUID(), title: String, description: String, type: ReportType, dateRange: DateRange, createdAt: Date = Date(), data: ReportData, status: ReportStatus = .generated) {
        self.id = id
        self.title = title
        self.description = description
        self.type = type
        self.dateRange = dateRange
        self.createdAt = createdAt
        self.data = data
        self.status = status
    }
}

enum ReportType: String, CaseIterable, Codable {
    case daily = "日次レポート"
    case weekly = "週次レポート"
    case monthly = "月次レポート"
    case custom = "カスタムレポート"
    
    var icon: String {
        switch self {
        case .daily: return "calendar.day.timeline.left"
        case .weekly: return "calendar.badge.clock"
        case .monthly: return "calendar"
        case .custom: return "doc.text.chart"
        }
    }
}

struct DateRange: Codable {
    let startDate: Date
    let endDate: Date
    
    var duration: TimeInterval {
        endDate.timeIntervalSince(startDate)
    }
    
    var days: Int {
        Calendar.current.dateComponents([.day], from: startDate, to: endDate).day ?? 0
    }
}

struct ReportData: Codable {
    let pageViews: Int
    let uniqueVisitors: Int
    let conversions: Int
    let revenue: Double
    let topPages: [PageData]
    let deviceBreakdown: [DeviceData]
    let conversionFunnel: [FunnelStepData]
    let abTestResults: [ABTestResult]
    
    init(pageViews: Int = 0, uniqueVisitors: Int = 0, conversions: Int = 0, revenue: Double = 0, topPages: [PageData] = [], deviceBreakdown: [DeviceData] = [], conversionFunnel: [FunnelStepData] = [], abTestResults: [ABTestResult] = []) {
        self.pageViews = pageViews
        self.uniqueVisitors = uniqueVisitors
        self.conversions = conversions
        self.revenue = revenue
        self.topPages = topPages
        self.deviceBreakdown = deviceBreakdown
        self.conversionFunnel = conversionFunnel
        self.abTestResults = abTestResults
    }
}

struct PageData: Codable {
    let url: String
    let title: String
    let views: Int
    let uniqueVisitors: Int
    let averageTimeOnPage: Double
}

struct DeviceData: Codable {
    let device: String
    let sessions: Int
    let percentage: Double
}

struct FunnelStepData: Codable {
    let name: String
    let visitors: Int
    let conversions: Int
    let conversionRate: Double
    let dropOffRate: Double
}

struct ABTestResult: Codable {
    let testName: String
    let variant: String
    let visitors: Int
    let conversions: Int
    let conversionRate: Double
    let improvement: Double
}

enum ReportStatus: String, CaseIterable, Codable {
    case generating = "生成中"
    case generated = "生成完了"
    case failed = "生成失敗"
    case scheduled = "スケジュール済み"
}

// MARK: - Report Manager

@MainActor
class ReportManager: ObservableObject {
    @Published var reports: [Report] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var scheduledReports: [Report] = []
    
    private let analyticsManager: AnalyticsManager
    private let websiteManager: WebsiteManager
    private let userDefaults = UserDefaults.standard
    private let reportsKey = "saved_reports"
    private let scheduledReportsKey = "scheduled_reports"
    
    init(analyticsManager: AnalyticsManager, websiteManager: WebsiteManager) {
        self.analyticsManager = analyticsManager
        self.websiteManager = websiteManager
        loadReports()
    }
    
    // MARK: - Report Generation
    
    func generateReport(title: String, description: String, type: ReportType, dateRange: DateRange) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let reportData = try await generateReportData(for: dateRange)
            let report = Report(
                title: title,
                description: description,
                type: type,
                dateRange: dateRange,
                data: reportData
            )
            
            reports.append(report)
            saveReports()
            
            #if DEBUG
            print("📊 Report generated: \(title)")
            #endif
            
        } catch {
            errorMessage = "レポート生成エラー: \(error.localizedDescription)"
            #if DEBUG
            print("Report generation error: \(error)")
            #endif
        }
        
        isLoading = false
    }
    
    private func generateReportData(for dateRange: DateRange) async throws -> ReportData {
        // フィルタリングされたデータを取得
        let filteredPageViews = analyticsManager.pageViews.filter { pageView in
            pageView.timestamp >= dateRange.startDate && pageView.timestamp <= dateRange.endDate
        }
        
        let filteredConversions = analyticsManager.conversionEvents.filter { conversion in
            conversion.timestamp >= dateRange.startDate && conversion.timestamp <= dateRange.endDate
        }
        
        // 基本統計
        let pageViews = filteredPageViews.count
        let uniqueVisitors = Set(filteredPageViews.map { $0.sessionId }).count
        let conversions = filteredConversions.count
        let revenue = filteredConversions.reduce(0) { $0 + $1.value }
        
        // トップページ
        let topPages = generateTopPages(from: filteredPageViews)
        
        // デバイス別内訳
        let deviceBreakdown = generateDeviceBreakdown(from: filteredPageViews)
        
        // コンバージョンファネル
        let conversionFunnel = generateConversionFunnel(from: filteredPageViews, conversions: filteredConversions)
        
        // A/Bテスト結果
        let abTestResults = generateABTestResults()
        
        return ReportData(
            pageViews: pageViews,
            uniqueVisitors: uniqueVisitors,
            conversions: conversions,
            revenue: revenue,
            topPages: topPages,
            deviceBreakdown: deviceBreakdown,
            conversionFunnel: conversionFunnel,
            abTestResults: abTestResults
        )
    }
    
    private func generateTopPages(from pageViews: [PageViewData]) -> [PageData] {
        let pageGroups = Dictionary(grouping: pageViews) { $0.url }
        
        return pageGroups.map { url, views in
            let uniqueVisitors = Set(views.map { $0.sessionId }).count
            let averageTimeOnPage = views.compactMap { $0.loadTime }.reduce(0, +) / Double(max(views.count, 1))
            
            return PageData(
                url: url,
                title: views.first?.pageTitle ?? "Unknown",
                views: views.count,
                uniqueVisitors: uniqueVisitors,
                averageTimeOnPage: averageTimeOnPage
            )
        }
        .sorted { $0.views > $1.views }
        .prefix(10)
        .map { $0 }
    }
    
    private func generateDeviceBreakdown(from pageViews: [PageViewData]) -> [DeviceData] {
        let deviceGroups = Dictionary(grouping: pageViews) { pageView in
            let userAgent = pageView.userAgent.lowercased()
            if userAgent.contains("mobile") || userAgent.contains("iphone") || userAgent.contains("android") {
                return "モバイル"
            } else if userAgent.contains("ipad") || userAgent.contains("tablet") {
                return "タブレット"
            } else {
                return "デスクトップ"
            }
        }
        
        let totalSessions = pageViews.count
        
        return deviceGroups.map { device, views in
            let sessions = views.count
            let percentage = totalSessions > 0 ? Double(sessions) / Double(totalSessions) * 100 : 0
            
            return DeviceData(
                device: device,
                sessions: sessions,
                percentage: percentage
            )
        }
        .sorted { $0.sessions > $1.sessions }
    }
    
    private func generateConversionFunnel(from pageViews: [PageViewData], conversions: [ConversionEvent]) -> [FunnelStepData] {
        // 簡易的なファネル生成
        let totalVisitors = Set(pageViews.map { $0.sessionId }).count
        let productPageVisitors = Set(pageViews.filter { $0.url.contains("product") }.map { $0.sessionId }).count
        let checkoutVisitors = Set(pageViews.filter { $0.url.contains("checkout") }.map { $0.sessionId }).count
        let completedConversions = conversions.count
        
        return [
            FunnelStepData(
                name: "訪問",
                visitors: totalVisitors,
                conversions: totalVisitors,
                conversionRate: 100.0,
                dropOffRate: 0.0
            ),
            FunnelStepData(
                name: "商品ページ",
                visitors: productPageVisitors,
                conversions: productPageVisitors,
                conversionRate: totalVisitors > 0 ? Double(productPageVisitors) / Double(totalVisitors) * 100 : 0,
                dropOffRate: totalVisitors > 0 ? Double(totalVisitors - productPageVisitors) / Double(totalVisitors) * 100 : 0
            ),
            FunnelStepData(
                name: "購入ページ",
                visitors: checkoutVisitors,
                conversions: checkoutVisitors,
                conversionRate: totalVisitors > 0 ? Double(checkoutVisitors) / Double(totalVisitors) * 100 : 0,
                dropOffRate: totalVisitors > 0 ? Double(totalVisitors - checkoutVisitors) / Double(totalVisitors) * 100 : 0
            ),
            FunnelStepData(
                name: "購入完了",
                visitors: completedConversions,
                conversions: completedConversions,
                conversionRate: totalVisitors > 0 ? Double(completedConversions) / Double(totalVisitors) * 100 : 0,
                dropOffRate: totalVisitors > 0 ? Double(totalVisitors - completedConversions) / Double(totalVisitors) * 100 : 0
            )
        ]
    }
    
    private func generateABTestResults() -> [ABTestResult] {
        return analyticsManager.abTests.flatMap { test in
            test.variants.map { variant in
                ABTestResult(
                    testName: test.name,
                    variant: variant.name,
                    visitors: variant.visitors,
                    conversions: variant.conversions,
                    conversionRate: variant.conversionRate,
                    improvement: 0.0 // 計算が必要
                )
            }
        }
    }
    
    // MARK: - Report Management
    
    func deleteReport(_ report: Report) {
        reports.removeAll { $0.id == report.id }
        saveReports()
    }
    
    func exportReport(_ report: Report) -> String {
        // CSV形式でエクスポート
        var csv = "Report: \(report.title)\n"
        csv += "Generated: \(report.createdAt.formatted())\n"
        csv += "Date Range: \(report.dateRange.startDate.formatted()) - \(report.dateRange.endDate.formatted())\n\n"
        
        csv += "Summary\n"
        csv += "Page Views,\(report.data.pageViews)\n"
        csv += "Unique Visitors,\(report.data.uniqueVisitors)\n"
        csv += "Conversions,\(report.data.conversions)\n"
        csv += "Revenue,\(report.data.revenue)\n\n"
        
        csv += "Top Pages\n"
        csv += "URL,Title,Views,Unique Visitors,Avg Time\n"
        for page in report.data.topPages {
            csv += "\(page.url),\(page.title),\(page.views),\(page.uniqueVisitors),\(page.averageTimeOnPage)\n"
        }
        
        return csv
    }
    
    // MARK: - Scheduled Reports
    
    func scheduleReport(title: String, description: String, type: ReportType, schedule: ReportSchedule) {
        let report = Report(
            title: title,
            description: description,
            type: type,
            dateRange: schedule.dateRange,
            data: ReportData(),
            status: .scheduled
        )
        
        scheduledReports.append(report)
        saveScheduledReports()
    }
    
    // MARK: - Data Persistence
    
    private func saveReports() {
        if let encoded = try? JSONEncoder().encode(reports) {
            userDefaults.set(encoded, forKey: reportsKey)
        }
    }
    
    private func loadReports() {
        if let data = userDefaults.data(forKey: reportsKey),
           let decoded = try? JSONDecoder().decode([Report].self, from: data) {
            reports = decoded
        }
    }
    
    private func saveScheduledReports() {
        if let encoded = try? JSONEncoder().encode(scheduledReports) {
            userDefaults.set(encoded, forKey: scheduledReportsKey)
        }
    }
    
    private func loadScheduledReports() {
        if let data = userDefaults.data(forKey: scheduledReportsKey),
           let decoded = try? JSONDecoder().decode([Report].self, from: data) {
            scheduledReports = decoded
        }
    }
}

// MARK: - Supporting Types

struct ReportSchedule {
    let dateRange: DateRange
    let frequency: ReportFrequency
    let nextRun: Date
}

enum ReportFrequency: String, CaseIterable {
    case daily = "毎日"
    case weekly = "毎週"
    case monthly = "毎月"
} 