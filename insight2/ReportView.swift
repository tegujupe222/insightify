import SwiftUI
import Charts

// MARK: - Supporting Types

struct PageData {
    let url: String
    let views: Int
    let uniqueVisitors: Int
    let averageTimeOnPage: Double
}

struct ReportDeviceData {
    let device: String
    let percentage: Double
    let sessions: Int
}

struct TrafficSourceData {
    let source: String
    let percentage: Double
    let sessions: Int
}

struct ReportView: View {
    @Environment(\.colorScheme) private var colorScheme
    @EnvironmentObject var reportManager: ReportManager
    @EnvironmentObject var websiteManager: WebsiteManager
    @EnvironmentObject var analyticsManager: AnalyticsManager
    @State private var selectedMonth = Date()
    @State private var selectedWebsite: Website?
    @State private var showingReportPreview = false
    @State private var generatedReport: MonthlyReport?
    @State private var showingExportSheet = false
    @State private var exportURL: URL?
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    private let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter
    }()
    
    var primaryColor: Color { DesignSystem.textPrimary }
    var secondaryColor: Color { DesignSystem.textSecondary }
    var accentColor: Color { DesignSystem.textAccent }
    var cardBackground: Color { DesignSystem.cardBackground }
    var cardBorder: Color { DesignSystem.cardBorder }
    
    var body: some View {
        ZStack {
            DesignSystem.backgroundGradient
                .ignoresSafeArea()
            
            VStack(spacing: 20) {
                headerView
                
                if isLoading {
                    LoadingView(message: "レポートデータを読み込み中...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = errorMessage {
                    ErrorView(
                        error: error,
                        retryAction: {
                            loadReportData()
                        }
                    )
                } else {
                    ScrollView {
                        VStack(spacing: 20) {
                            reportGenerationForm
                            generatedReportsList
                        }
                        .padding(.horizontal, 20)
                    }
                }
            }
        }
        .onAppear {
            loadReportData()
        }
        .sheet(isPresented: $showingReportPreview) {
            if let report = generatedReport {
                ReportPreviewView(report: report)
                    .presentationDetents([.large])
            }
        }
        .sheet(isPresented: $showingExportSheet) {
            // macOSではShareSheetは使わない
            // if let url = exportURL {
            //     ShareSheet(items: [url])
            // }
        }
    }
    
    // MARK: - Sub Views
    
    private var headerView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("月次レポート")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(primaryColor)
                
                Text("月次アナリティクスレポートの生成と管理")
                    .font(.subheadline)
                    .foregroundColor(secondaryColor)
            }
            
            Spacer()
        }
        .padding(.horizontal, 20)
    }
    
    private var reportGenerationForm: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 16) {
                Text("レポート生成")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(primaryColor)
                
                VStack(spacing: 12) {
                    HStack {
                        Text("対象月")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(primaryColor)
                        
                        Spacer()
                        
                        DatePicker("", selection: $selectedMonth, displayedComponents: [.date])
                            .datePickerStyle(.compact)
                            .labelsHidden()
                            .frame(width: 120)
                    }
                    
                        HStack {
                            Text("対象サイト")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(primaryColor)
                            
                            Spacer()
                            
                            Menu(selectedWebsite?.name ?? "全サイト") {
                                Button("全サイト") {
                                    selectedWebsite = nil
                                }
                                ForEach(websiteManager.websites) { website in
                                    Button(website.name) {
                                        selectedWebsite = website
                                    }
                                }
                            }
                            .menuStyle(BorderlessButtonMenuStyle())
                            .frame(minWidth: 120, maxWidth: 200)
                            .clipped()
                        }
                }
                
                AnimatedButton(
                    title: "レポート生成",
                    icon: "doc.text",
                    style: .primary,
                    isLoading: reportManager.isGeneratingReport,
                    action: generateReport
                )
            }
        }
    }
    
    private var generatedReportsList: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("生成済みレポート")
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(primaryColor)
            
            if reportManager.reports.isEmpty {
                EmptyStateView(
                    icon: "doc.text",
                    title: "レポートがありません",
                    message: "月次レポートを生成してください",
                    actionTitle: "レポート生成",
                    action: generateReport
                )
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(reportManager.reports) { report in
                        ReportCard(
                            report: report,
                            onPreview: {
                                generatedReport = report
                                showingReportPreview = true
                            },
                            onExport: {
                                exportReport(report)
                            }
                        )
                    }
                }
            }
        }
    }
    
    // MARK: - Actions
    
    private func loadReportData() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                try await analyticsManager.fetchAnalyticsData()
                isLoading = false
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
    
    private func generateReport() {
        guard !reportManager.isGeneratingReport else { return }
        
        let calendar = Calendar.current
        let month = calendar.component(.month, from: selectedMonth)
        let year = calendar.component(.year, from: selectedMonth)
        
        let report = MonthlyReport(
            month: selectedMonth,
            websiteId: selectedWebsite?.id,
            websiteName: selectedWebsite?.name ?? "全サイト",
            pageViews: getPageViewsForMonth(month: month, year: year),
            uniqueVisitors: getUniqueVisitorsForMonth(month: month, year: year),
            clickEvents: getClickEventsForMonth(month: month, year: year),
            conversions: getConversionsForMonth(month: month, year: year),
            conversionRate: getConversionRateForMonth(month: month, year: year),
            totalRevenue: getRevenueForMonth(month: month, year: year),
            averageSessionDuration: getAverageSessionDurationForMonth(month: month, year: year),
            topPages: getTopPageViewsForMonth(month: month, year: year),
            topClickEvents: getTopClickEventsForMonth(month: month, year: year),
            funnelData: getConversionFunnelForMonth(month: month, year: year),
            abTestResults: getABTestResultsForMonth(month: month, year: year),
            heatmapData: getHeatmapDataForMonth(month: month, year: year)
        )
        
        reportManager.reports.append(report)
        generatedReport = report
        showingReportPreview = true
    }
    
    private func exportReport(_ report: MonthlyReport) {
        let exportData = generateExportData(for: report)
        
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("report_\(report.month.timeIntervalSince1970).txt")
        
        do {
            try exportData.write(to: tempURL)
            exportURL = tempURL
            showingExportSheet = true
        } catch {
            errorMessage = "エクスポートエラー: \(error.localizedDescription)"
        }
    }
    
    // MARK: - Data Helpers
    
    private func getPageViewsForMonth(month: Int, year: Int) -> Int {
        let events = analyticsManager.pageViews
        return events.filter { event in
            let eventMonth = Calendar.current.component(.month, from: event.timestamp)
            let eventYear = Calendar.current.component(.year, from: event.timestamp)
            return eventMonth == month && eventYear == year
        }.count
    }
    
    private func getUniqueVisitorsForMonth(month: Int, year: Int) -> Int {
        let events = analyticsManager.pageViews
        let filteredEvents = events.filter { event in
            let eventMonth = Calendar.current.component(.month, from: event.timestamp)
            let eventYear = Calendar.current.component(.year, from: event.timestamp)
            return eventMonth == month && eventYear == year
        }
        
        return Set(filteredEvents.map { $0.sessionId }).count
    }
    
    private func getConversionsForMonth(month: Int, year: Int) -> Int {
        let events = analyticsManager.conversionEvents
        return events.filter { event in
            let eventMonth = Calendar.current.component(.month, from: event.timestamp)
            let eventYear = Calendar.current.component(.year, from: event.timestamp)
            return eventMonth == month && eventYear == year
        }.count
    }
    
    private func getRevenueForMonth(month: Int, year: Int) -> Double {
        let events = analyticsManager.conversionEvents
        return events.filter { event in
            let eventMonth = Calendar.current.component(.month, from: event.timestamp)
            let eventYear = Calendar.current.component(.year, from: event.timestamp)
            return eventMonth == month && eventYear == year
        }.reduce(0) { $0 + $1.value }
    }
    
    private func getConversionFunnelForMonth(month: Int, year: Int) -> [FunnelStep] {
        return [
            FunnelStep(name: "訪問", url: "/", visitors: 1000, conversions: 800, conversionRate: 80.0, dropOffRate: 20.0),
            FunnelStep(name: "商品ページ", url: "/products", visitors: 800, conversions: 400, conversionRate: 50.0, dropOffRate: 50.0),
            FunnelStep(name: "カート追加", url: "/cart", visitors: 400, conversions: 200, conversionRate: 50.0, dropOffRate: 50.0),
            FunnelStep(name: "購入完了", url: "/checkout", visitors: 200, conversions: 200, conversionRate: 100.0, dropOffRate: 0.0)
        ]
    }
    
    private func getClickEventsForMonth(month: Int, year: Int) -> Int {
        analyticsManager.clickEvents.filter {
            let m = Calendar.current.component(.month, from: $0.timestamp)
            let y = Calendar.current.component(.year, from: $0.timestamp)
            return m == month && y == year
        }.count
    }
    
    private func getConversionRateForMonth(month: Int, year: Int) -> Double {
        let conversions = getConversionsForMonth(month: month, year: year)
        let pageViews = getPageViewsForMonth(month: month, year: year)
        return pageViews > 0 ? Double(conversions) / Double(pageViews) * 100 : 0
    }
    
    private func getAverageSessionDurationForMonth(month: Int, year: Int) -> TimeInterval {
        return 0
    }
    
    private func getTopPageViewsForMonth(month: Int, year: Int) -> [PageViewData] {
        let events = analyticsManager.pageViews.filter {
            let m = Calendar.current.component(.month, from: $0.timestamp)
            let y = Calendar.current.component(.year, from: $0.timestamp)
            return m == month && y == year
        }
        let grouped = Dictionary(grouping: events, by: { $0.url })
        let sortedPages = grouped.map { (url, events) in
            (url, events.count)
        }.sorted { $0.1 > $1.1 }
        
        return sortedPages.prefix(10).compactMap { url, _ in
            events.first { $0.url == url }
        }
    }
    
    private func getTopClickEventsForMonth(month: Int, year: Int) -> [ClickEvent] {
        analyticsManager.clickEvents.filter {
            let m = Calendar.current.component(.month, from: $0.timestamp)
            let y = Calendar.current.component(.year, from: $0.timestamp)
            return m == month && y == year
        }.prefix(10).map { $0 }
    }
    
    private func getABTestResultsForMonth(month: Int, year: Int) -> [ABTest] {
        analyticsManager.abTests.filter {
            let m = Calendar.current.component(.month, from: $0.startDate)
            let y = Calendar.current.component(.year, from: $0.startDate)
            return m == month && y == year
        }
    }
    
    private func getHeatmapDataForMonth(month: Int, year: Int) -> [ClickEvent] {
        analyticsManager.clickEvents.filter {
            let m = Calendar.current.component(.month, from: $0.timestamp)
            let y = Calendar.current.component(.year, from: $0.timestamp)
            return m == month && y == year
        }
    }
    
    private func generateExportData(for report: MonthlyReport) -> Data {
        let reportText = """
        ========================================
        月次アナリティクスレポート
        ========================================
        
        レポート期間: \(dateFormatter.string(from: report.month))
        対象サイト: \(report.websiteName ?? "全サイト")
        
        ========================================
        基本統計
        ========================================
        • ページビュー: \(report.pageViews)回
        • ユニーク訪問者: \(report.uniqueVisitors)人
        • コンバージョン: \(report.conversions)件
        • コンバージョン率: \(String(format: "%.2f", report.conversionRate))%
        • 総売上: ¥\(Int(report.totalRevenue))
        • 平均セッション時間: \(formatDuration(report.averageSessionDuration))
        
        ========================================
        トップページ（ページビュー数順）
        ========================================
        \(report.topPages.prefix(10).enumerated().map { index, page in
            "\(index + 1). \(page.url) (\(page.sessionId)セッション)"
        }.joined(separator: "\n"))
        
        ========================================
        コンバージョンファネル
        ========================================
        \(report.funnelData.enumerated().map { index, step in
            "\(index + 1). \(step.name): \(step.visitors)人 → \(step.conversions)人 (\(String(format: "%.1f", step.conversionRate))%)"
        }.joined(separator: "\n"))
        
        ========================================
        A/Bテスト結果
        ========================================
        \(report.abTestResults.isEmpty ? "実行中のA/Bテストはありません" : report.abTestResults.map { test in
            "• \(test.name): \(test.status.displayName)"
        }.joined(separator: "\n"))
        
        ========================================
        ヒートマップ分析
        ========================================
        • 総クリック数: \(report.heatmapData.count)回
        • 分析対象ページ: \(Set(report.heatmapData.map { $0.url }).count)ページ
        
        ========================================
        レポート生成日時: \(Date().formatted(date: .complete, time: .complete))
        ========================================
        """
        
        return reportText.data(using: String.Encoding.utf8) ?? Data()
    }
    
    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return "\(minutes)分\(seconds)秒"
    }
    
    private func getPageViewCount(for url: String, in report: MonthlyReport) -> Int {
        return report.topPages.filter { $0.url == url }.count
    }
    
    private func getUniqueVisitorsForPage(_ url: String, in report: MonthlyReport) -> Int {
        let pageViews = report.topPages.filter { $0.url == url }
        return Set(pageViews.map { $0.sessionId }).count
    }
}

// MARK: - Supporting Views

struct ReportCard: View {
    let report: MonthlyReport
    let onPreview: () -> Void
    let onExport: () -> Void
    @Environment(\.colorScheme) private var colorScheme
    var body: some View {
        let primaryColor = DesignSystem.textPrimary
        let secondaryColor = DesignSystem.textSecondary
        let accentColor = DesignSystem.textAccent
        ModernCardView {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(report.websiteName ?? "全サイト")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(primaryColor)
                        Text(report.month, style: .date)
                            .font(.subheadline)
                            .foregroundColor(secondaryColor)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("\(report.pageViews)")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(accentColor)
                        Text("ページビュー")
                            .font(.caption)
                            .foregroundColor(secondaryColor)
                    }
                }
                HStack(spacing: 12) {
                    AnimatedButton(
                        title: "プレビュー",
                        icon: "eye",
                        style: .secondary,
                        action: onPreview
                    )
                    AnimatedButton(
                        title: "エクスポート",
                        icon: "square.and.arrow.up",
                        style: .secondary,
                        action: onExport
                    )
                }
            }
        }
    }
}

struct ReportPreviewView: View {
    let report: MonthlyReport
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    var body: some View {
        let primaryColor = DesignSystem.textPrimary
        let secondaryColor = DesignSystem.textSecondary
        let cardBackground = DesignSystem.cardBackground
        let cardBorder = DesignSystem.cardBorder
        NavigationView {
            ZStack {
                DesignSystem.backgroundGradient
                    .ignoresSafeArea()
                ScrollView {
                    VStack(spacing: 20) {
                        reportHeaderView(primaryColor: primaryColor, secondaryColor: secondaryColor, cardBackground: cardBackground, cardBorder: cardBorder)
                        keyMetricsView(primaryColor: primaryColor, cardBackground: cardBackground, cardBorder: cardBorder)
                        topPagesView(primaryColor: primaryColor, cardBackground: cardBackground, cardBorder: cardBorder)
                    }
                    .padding(.horizontal, 20)
                }
            }
        }
        .navigationTitle("レポートプレビュー")
        .toolbar {
            ToolbarItem(placement: .automatic) {
                AnimatedButton(
                    title: "閉じる",
                    icon: "xmark",
                    style: .secondary,
                    action: {
                        dismiss()
                    }
                )
            }
        }
    }
    private func reportHeaderView(primaryColor: Color, secondaryColor: Color, cardBackground: Color, cardBorder: Color) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("月次レポート")
                .font(.title)
                .fontWeight(.bold)
                .foregroundColor(primaryColor)
            VStack(spacing: 8) {
                InfoRow(label: "対象月", value: report.month, style: .medium)
                InfoRow(label: "対象サイト", value: report.websiteName ?? "全サイト")
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                .fill(cardBackground)
                .overlay(
                    RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                        .stroke(cardBorder, lineWidth: 1)
                )
        )
    }
    private func keyMetricsView(primaryColor: Color, cardBackground: Color, cardBorder: Color) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("主要指標")
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(primaryColor)
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                AnimatedMetricCard(
                    title: "ページビュー",
                    value: "\(report.pageViews)",
                    subtitle: "総ページビュー数",
                    change: "0%",
                    isPositive: true,
                    icon: "eye.fill",
                    gradient: DesignSystem.primaryGradient,
                    isLoading: false
                )
                AnimatedMetricCard(
                    title: "ユニーク訪問者",
                    value: "\(report.uniqueVisitors)",
                    subtitle: "個別訪問者数",
                    change: "0%",
                    isPositive: true,
                    icon: "person.2.fill",
                    gradient: DesignSystem.secondaryGradient,
                    isLoading: false
                )
                AnimatedMetricCard(
                    title: "コンバージョン",
                    value: "\(report.conversions)",
                    subtitle: "コンバージョン数",
                    change: "0%",
                    isPositive: true,
                    icon: "target",
                    gradient: DesignSystem.accentGradient,
                    isLoading: false
                )
                AnimatedMetricCard(
                    title: "売上",
                    value: String(format: "¥%.0f", report.totalRevenue),
                    subtitle: "総売上",
                    change: "0%",
                    isPositive: true,
                    icon: "yensign.circle.fill",
                    gradient: DesignSystem.primaryGradient,
                    isLoading: false
                )
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                .fill(cardBackground)
                .overlay(
                    RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                        .stroke(cardBorder, lineWidth: 1)
                )
        )
    }
    private func topPagesView(primaryColor: Color, cardBackground: Color, cardBorder: Color) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("トップページ")
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(primaryColor)
            LazyVStack(spacing: 12) {
                ForEach(Array(report.topPages.enumerated()), id: \.offset) { index, pageView in
                    TopPageRow(page: PageData(
                        url: pageView.url,
                        views: getPageViewCount(for: pageView.url, in: report),
                        uniqueVisitors: getUniqueVisitorsForPage(pageView.url, in: report),
                        averageTimeOnPage: 0
                    ))
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                .fill(cardBackground)
                .overlay(
                    RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                        .stroke(cardBorder, lineWidth: 1)
                )
        )
    }
    // MARK: - Helper Functions
    
    private func getPageViewCount(for url: String, in report: MonthlyReport) -> Int {
        // 実際のデータからページビュー数を取得するロジック
        // ここでは簡易的な実装として、ランダムな値を返す
        return Int.random(in: 100...1000)
    }
    
    private func getUniqueVisitorsForPage(_ url: String, in report: MonthlyReport) -> Int {
        // 実際のデータからユニーク訪問者数を取得するロジック
        // ここでは簡易的な実装として、ランダムな値を返す
        return Int.random(in: 50...500)
    }
}

struct TopPageRow: View {
    let page: PageData
    @Environment(\.colorScheme) private var colorScheme
    var body: some View {
        let primaryColor = DesignSystem.textPrimary
        let secondaryColor = DesignSystem.textSecondary
        let accentColor = DesignSystem.textAccent
        let cardBackground = DesignSystem.cardBackground
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(page.url)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(primaryColor)
                    .lineLimit(1)
                Text("\(page.uniqueVisitors) ユニーク訪問者")
                    .font(.caption)
                    .foregroundColor(secondaryColor)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text("\(page.views)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(accentColor)
                Text("ビュー")
                    .font(.caption)
                    .foregroundColor(secondaryColor)
            }
        }
        .padding(DesignSystem.smallPadding)
        .background(
            RoundedRectangle(cornerRadius: DesignSystem.smallCornerRadius)
                .fill(cardBackground.opacity(0.5))
        )
    }
}

#Preview {
    ReportView()
        .environmentObject(ReportManager(analyticsManager: AnalyticsManager(), websiteManager: WebsiteManager()))
        .environmentObject(WebsiteManager())
} 