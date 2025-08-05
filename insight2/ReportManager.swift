import Foundation
import SwiftUI
import PDFKit

// MARK: - Report Models

struct MonthlyReport: Identifiable, Codable {
    let id: UUID
    let month: Date
    let websiteId: UUID?
    let websiteName: String?
    let pageViews: Int
    let uniqueVisitors: Int
    let clickEvents: Int
    let conversions: Int
    let conversionRate: Double
    let totalRevenue: Double
    let averageSessionDuration: TimeInterval
    let topPages: [PageViewData]
    let topClickEvents: [ClickEvent]
    let funnelData: [FunnelStep]
    let abTestResults: [ABTest]
    let heatmapData: [ClickEvent]
    let createdAt: Date
    
    init(id: UUID = UUID(), month: Date, websiteId: UUID? = nil, websiteName: String? = nil, pageViews: Int, uniqueVisitors: Int, clickEvents: Int, conversions: Int, conversionRate: Double, totalRevenue: Double, averageSessionDuration: TimeInterval, topPages: [PageViewData], topClickEvents: [ClickEvent], funnelData: [FunnelStep], abTestResults: [ABTest], heatmapData: [ClickEvent], createdAt: Date = Date()) {
        self.id = id
        self.month = month
        self.websiteId = websiteId
        self.websiteName = websiteName
        self.pageViews = pageViews
        self.uniqueVisitors = uniqueVisitors
        self.clickEvents = clickEvents
        self.conversions = conversions
        self.conversionRate = conversionRate
        self.totalRevenue = totalRevenue
        self.averageSessionDuration = averageSessionDuration
        self.topPages = topPages
        self.topClickEvents = topClickEvents
        self.funnelData = funnelData
        self.abTestResults = abTestResults
        self.heatmapData = heatmapData
        self.createdAt = createdAt
    }
}

struct ReportTemplate {
    let title: String
    let subtitle: String
    let sections: [ReportSection]
}

struct ReportSection {
    let title: String
    let content: String
    let chartData: [String: Any]?
}

// MARK: - Report Manager

@MainActor
class ReportManager: ObservableObject {
    @Published var reports: [MonthlyReport] = []
    @Published var isGeneratingReport = false
    @Published var errorMessage: String?
    
    private let analyticsManager: AnalyticsManager
    private let websiteManager: WebsiteManager
    
    init(analyticsManager: AnalyticsManager, websiteManager: WebsiteManager) {
        self.analyticsManager = analyticsManager
        self.websiteManager = websiteManager
    }
    
    // MARK: - Report Generation
    
    func generateMonthlyReport(for month: Date, websiteId: UUID? = nil) async -> MonthlyReport? {
        isGeneratingReport = true
        errorMessage = nil
        
        defer {
            isGeneratingReport = false
        }
        
        let calendar = Calendar.current
        let startOfMonth = calendar.dateInterval(of: .month, for: month)?.start ?? month
        let endOfMonth = calendar.dateInterval(of: .month, for: month)?.end ?? month
        
        // データ収集（エラーハンドリング付き）
        let pageViews = await getPageViewsForPeriod(start: startOfMonth, end: endOfMonth, websiteId: websiteId)
        let clickEvents = await getClickEventsForPeriod(start: startOfMonth, end: endOfMonth, websiteId: websiteId)
        let conversionEvents = await getConversionEventsForPeriod(start: startOfMonth, end: endOfMonth, websiteId: websiteId)
        
        // データが存在しない場合のデフォルト値
        let uniqueVisitors = Set(pageViews.map { $0.sessionId }).count
        let conversions = conversionEvents.count
        let conversionRate = pageViews.count > 0 ? Double(conversions) / Double(pageViews.count) * 100 : 0
        let totalRevenue = conversionEvents.reduce(0) { $0 + $1.value }
        let averageSessionDuration = calculateAverageSessionDuration(pageViews: pageViews)
        
        // トップページとクリックイベント
        let topPages = getTopPages(pageViews: pageViews, limit: 10)
        let topClickEvents = getTopClickEvents(clickEvents: clickEvents, limit: 10)
        
        // ファネルデータ
        let funnelData = await getFunnelDataForPeriod(start: startOfMonth, end: endOfMonth, websiteId: websiteId)
        
        // A/Bテスト結果
        let abTestResults = await getABTestResultsForPeriod(start: startOfMonth, end: endOfMonth, websiteId: websiteId)
        
        // ヒートマップデータ
        let heatmapData = clickEvents
        
        let report = MonthlyReport(
            month: startOfMonth,
            websiteId: websiteId,
            websiteName: websiteId != nil ? websiteManager.websites.first { $0.id == websiteId }?.name : nil,
            pageViews: pageViews.count,
            uniqueVisitors: uniqueVisitors,
            clickEvents: clickEvents.count,
            conversions: conversions,
            conversionRate: conversionRate,
            totalRevenue: totalRevenue,
            averageSessionDuration: averageSessionDuration,
            topPages: topPages,
            topClickEvents: topClickEvents,
            funnelData: funnelData,
            abTestResults: abTestResults,
            heatmapData: heatmapData
        )
        
        reports.append(report)
        return report
    }
    
    // MARK: - Data Collection
    
    private func getPageViewsForPeriod(start: Date, end: Date, websiteId: UUID?) async -> [PageViewData] {
        // AnalyticsManagerのデータが存在することを確認
        guard !analyticsManager.pageViews.isEmpty else {
            #if DEBUG
            print("Warning: No page views data available")
            #endif
            return []
        }
        
        let filteredPageViews = analyticsManager.pageViews.filter { pageView in
            let isInPeriod = pageView.timestamp >= start && pageView.timestamp < end
            let isForWebsite = websiteId == nil || pageView.url.contains(websiteManager.websites.first { $0.id == websiteId }?.url ?? "")
            return isInPeriod && isForWebsite
        }
        return filteredPageViews
    }
    
    private func getClickEventsForPeriod(start: Date, end: Date, websiteId: UUID?) async -> [ClickEvent] {
        // AnalyticsManagerのデータが存在することを確認
        guard !analyticsManager.clickEvents.isEmpty else {
            #if DEBUG
            print("Warning: No click events data available")
            #endif
            return []
        }
        
        let filteredClickEvents = analyticsManager.clickEvents.filter { clickEvent in
            let isInPeriod = clickEvent.timestamp >= start && clickEvent.timestamp < end
            let isForWebsite = websiteId == nil || clickEvent.url.contains(websiteManager.websites.first { $0.id == websiteId }?.url ?? "")
            return isInPeriod && isForWebsite
        }
        return filteredClickEvents
    }
    
    private func getConversionEventsForPeriod(start: Date, end: Date, websiteId: UUID?) async -> [ConversionEvent] {
        // AnalyticsManagerのデータが存在することを確認
        guard !analyticsManager.conversionEvents.isEmpty else {
            #if DEBUG
            print("Warning: No conversion events data available")
            #endif
            return []
        }
        
        let filteredConversionEvents = analyticsManager.conversionEvents.filter { conversionEvent in
            let isInPeriod = conversionEvent.timestamp >= start && conversionEvent.timestamp < end
            let isForWebsite = websiteId == nil || conversionEvent.url.contains(websiteManager.websites.first { $0.id == websiteId }?.url ?? "")
            return isInPeriod && isForWebsite
        }
        return filteredConversionEvents
    }
    
    private func getFunnelDataForPeriod(start: Date, end: Date, websiteId: UUID?) async -> [FunnelStep] {
        // 期間内のファネルデータを取得
        return analyticsManager.funnels.flatMap { $0.steps }
    }
    
    private func getABTestResultsForPeriod(start: Date, end: Date, websiteId: UUID?) async -> [ABTest] {
        // 期間内のA/Bテスト結果を取得
        return analyticsManager.abTests.filter { test in
            test.startDate >= start && test.startDate < end
        }
    }
    
    // MARK: - Analytics Calculations
    
    private func calculateAverageSessionDuration(pageViews: [PageViewData]) -> TimeInterval {
        let sessions = Dictionary(grouping: pageViews) { $0.sessionId }
        let sessionDurations = sessions.compactMap { (sessionId: String, views: [PageViewData]) -> TimeInterval? in
            guard let firstView = views.min(by: { $0.timestamp < $1.timestamp }),
                  let lastView = views.max(by: { $0.timestamp < $1.timestamp }) else { return nil }
            return lastView.timestamp.timeIntervalSince(firstView.timestamp)
        }
        
        return sessionDurations.isEmpty ? 0 : sessionDurations.reduce(0, +) / Double(sessionDurations.count)
    }
    
    private func getTopPages(pageViews: [PageViewData], limit: Int) -> [PageViewData] {
        let pageCounts = Dictionary(grouping: pageViews) { $0.url }
            .mapValues { $0.count }
            .sorted { $0.value > $1.value }
            .prefix(limit)
        
        return pageCounts.compactMap { url, count in
            pageViews.first { $0.url == url }
        }
    }
    
    private func getTopClickEvents(clickEvents: [ClickEvent], limit: Int) -> [ClickEvent] {
        let elementCounts = Dictionary(grouping: clickEvents) { "\($0.elementTag)_\($0.elementClass ?? "")" }
            .mapValues { $0.count }
            .sorted { $0.value > $1.value }
            .prefix(limit)
        
        return elementCounts.compactMap { elementKey, count in
            clickEvents.first { "\($0.elementTag)_\($0.elementClass ?? "")" == elementKey }
        }
    }
    
    // MARK: - PDF Generation
    
    func generatePDFReport(_ report: MonthlyReport) -> Data? {
        let pdfRenderer = PDFRenderer()
        return pdfRenderer.generateReport(report)
    }
    
    func saveReportToFile(_ report: MonthlyReport, filename: String) -> URL? {
        guard let pdfData = generatePDFReport(report) else { return nil }
        
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let reportURL = documentsPath.appendingPathComponent("\(filename).pdf")
        
        do {
            try pdfData.write(to: reportURL)
            return reportURL
        } catch {
            errorMessage = "ファイル保存に失敗しました: \(error.localizedDescription)"
            return nil
        }
    }
}

// MARK: - PDF Renderer

class PDFRenderer {
    func generateReport(_ report: MonthlyReport) -> Data? {
        let pageWidth: CGFloat = 612 // US Letter width
        let pageHeight: CGFloat = 792 // US Letter height
        let margin: CGFloat = 50
        
        let pdfData = NSMutableData()
        guard let consumer = CGDataConsumer(data: pdfData as CFMutableData) else { return nil }
        
        var mediaBox = CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight)
        
        // PDFメタデータを設定
        let pdfInfo = [
            kCGPDFContextCreator: "Insight Analytics",
            kCGPDFContextAuthor: "Report Generator",
            kCGPDFContextTitle: "Monthly Analytics Report"
        ] as CFDictionary
        
        guard let context = CGContext(consumer: consumer, mediaBox: &mediaBox, pdfInfo) else { return nil }
        
        // ページを開始
        context.beginPage(mediaBox: &mediaBox)
        
        let titleFont = NSFont.boldSystemFont(ofSize: 24)
        let subtitleFont = NSFont.systemFont(ofSize: 16)
        let bodyFont = NSFont.systemFont(ofSize: 12)
        
        var yPosition: CGFloat = pageHeight - margin
        
        // タイトル
        let title = "月次アナリティクスレポート"
        let titleAttributes = [NSAttributedString.Key.font: titleFont]
        let titleSize = title.size(withAttributes: titleAttributes)
        title.draw(at: CGPoint(x: margin, y: yPosition - titleSize.height), withAttributes: titleAttributes)
        yPosition -= titleSize.height + 10
        
        // サブタイトル
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy年M月"
        let subtitle = dateFormatter.string(from: report.month)
        let subtitleAttributes = [NSAttributedString.Key.font: subtitleFont]
        subtitle.draw(at: CGPoint(x: margin, y: yPosition - subtitleFont.pointSize), withAttributes: subtitleAttributes)
        yPosition -= 30
        
        // 基本統計
        yPosition = drawBasicStats(report: report, yPosition: yPosition, margin: margin, bodyFont: bodyFont)
        yPosition -= 20
        
        // 詳細データ
        yPosition = drawDetailedStats(report: report, yPosition: yPosition, margin: margin, bodyFont: bodyFont)
        
        // ページを終了
        context.endPage()
        context.closePDF()
        
        return pdfData as Data
    }
    
    private func drawBasicStats(report: MonthlyReport, yPosition: CGFloat, margin: CGFloat, bodyFont: NSFont) -> CGFloat {
        var currentY = yPosition
        
        let stats = [
            ("ページビュー", "\(report.pageViews)"),
            ("ユニーク訪問者", "\(report.uniqueVisitors)"),
            ("クリックイベント", "\(report.clickEvents)"),
            ("コンバージョン", "\(report.conversions)"),
            ("コンバージョン率", String(format: "%.2f%%", report.conversionRate)),
            ("売上", String(format: "¥%.0f", report.totalRevenue)),
            ("平均セッション時間", String(format: "%.1f分", report.averageSessionDuration / 60))
        ]
        
        let title = "基本統計"
        let titleAttributes = [NSAttributedString.Key.font: NSFont.boldSystemFont(ofSize: 16)]
        title.draw(at: CGPoint(x: margin, y: currentY - NSFont.boldSystemFont(ofSize: 16).pointSize), withAttributes: titleAttributes)
        currentY -= 25
        
        for (label, value) in stats {
            let text = "\(label): \(value)"
            let attributes = [NSAttributedString.Key.font: bodyFont]
            text.draw(at: CGPoint(x: margin, y: currentY - bodyFont.pointSize), withAttributes: attributes)
            currentY -= 18
        }
        
        return currentY
    }
    
    private func drawDetailedStats(report: MonthlyReport, yPosition: CGFloat, margin: CGFloat, bodyFont: NSFont) -> CGFloat {
        var currentY = yPosition
        
        // トップページ
        if !report.topPages.isEmpty {
            let title = "トップページ"
            let titleAttributes = [NSAttributedString.Key.font: NSFont.boldSystemFont(ofSize: 16)]
            title.draw(at: CGPoint(x: margin, y: currentY - NSFont.boldSystemFont(ofSize: 16).pointSize), withAttributes: titleAttributes)
            currentY -= 25
            
            for (index, page) in report.topPages.prefix(5).enumerated() {
                let text = "\(index + 1). \(page.url)"
                let attributes = [NSAttributedString.Key.font: bodyFont]
                text.draw(at: CGPoint(x: margin, y: currentY - bodyFont.pointSize), withAttributes: attributes)
                currentY -= 16
            }
            currentY -= 10
        }
        
        // A/Bテスト結果
        if !report.abTestResults.isEmpty {
            let title = "A/Bテスト結果"
            let titleAttributes = [NSAttributedString.Key.font: NSFont.boldSystemFont(ofSize: 16)]
            title.draw(at: CGPoint(x: margin, y: currentY - NSFont.boldSystemFont(ofSize: 16).pointSize), withAttributes: titleAttributes)
            currentY -= 25
            
            for test in report.abTestResults.prefix(3) {
                let text = "• \(test.name): \(test.status.displayName)"
                let attributes = [NSAttributedString.Key.font: bodyFont]
                text.draw(at: CGPoint(x: margin, y: currentY - bodyFont.pointSize), withAttributes: attributes)
                currentY -= 16
            }
        }
        
        return currentY
    }
} 