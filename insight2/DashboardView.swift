import SwiftUI
import Charts

struct DashboardView: View {
    @Environment(\.colorScheme) private var colorScheme
    @EnvironmentObject var analyticsManager: AnalyticsManager
    @State private var selectedTimeRange: DashboardTimeRange = .last7Days
    @State private var showingRefreshIndicator = false
    @State private var isRefreshing = false
    
    enum DashboardTimeRange: String, CaseIterable {
        case today = "今日"
        case last7Days = "過去7日間"
        case last30Days = "過去30日間"
        case last90Days = "過去90日間"
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                errorSection
                timeRangePicker
                metricCardsSection
                    .padding(.horizontal, DesignSystem.padding)
                chartsSection
            }
            .padding(.vertical, 20)
        }
        .background(DesignSystem.backgroundGradient)
        .onAppear {
            Task {
                await refreshData()
            }
        }
        .refreshable {
            await refreshData()
        }
    }
    
    private var errorSection: some View {
        Group {
            if let errorMessage = analyticsManager.errorMessage {
                ErrorView(
                    error: errorMessage,
                    retryAction: {
                        Task {
                            await refreshData()
                        }
                    }
                )
                .padding(.horizontal, DesignSystem.padding)
            }
        }
    }
    
    private var timeRangePicker: some View {
        HStack {
            Text("期間選択")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(DesignSystem.textPrimary)
            
            Spacer()
            
            Picker("期間", selection: $selectedTimeRange) {
                ForEach(DashboardTimeRange.allCases, id: \.self) { range in
                    Text(range.rawValue).tag(range)
                }
            }
            .pickerStyle(.menu)
            .frame(minWidth: 120, maxWidth: 200)
            .clipped()
        }
        .padding(.horizontal, DesignSystem.padding)
    }
    
    private var metricCardsSection: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 20) {
            let pageStats = analyticsManager.getPageViewStats()
            let conversionStats = analyticsManager.getConversionStats()
            
            let pageViewChange = calculatePageViewChange()
            let visitorChange = calculateVisitorChange()
            let conversionChange = calculateConversionChange()
            let revenueChange = calculateRevenueChange()
            
            let averageOrderValue = conversionStats.totalConversions > 0 ? 
                Int(conversionStats.totalValue / Double(conversionStats.totalConversions)) : 0
            
            AnimatedMetricCard(
                title: "ページビュー",
                value: "\(pageStats.totalViews)",
                subtitle: "今日: \(pageStats.todayViews)",
                change: pageViewChange,
                isPositive: pageViewChange.hasPrefix("+"),
                icon: "eye.fill",
                gradient: DesignSystem.primaryGradient,
                isLoading: analyticsManager.isLoading
            )
            
            AnimatedMetricCard(
                title: "ユニーク訪問者",
                value: "\(pageStats.uniqueVisitors)",
                subtitle: "平均滞在時間: \(String(format: "%.1f", pageStats.averageLoadTime))秒",
                change: visitorChange,
                isPositive: visitorChange.hasPrefix("+"),
                icon: "person.2.fill",
                gradient: DesignSystem.secondaryGradient,
                isLoading: analyticsManager.isLoading
            )
            
            AnimatedMetricCard(
                title: "コンバージョン",
                value: "\(conversionStats.totalConversions)",
                subtitle: "今日: \(conversionStats.todayConversions)",
                change: conversionChange,
                isPositive: conversionChange.hasPrefix("+"),
                icon: "target",
                gradient: LinearGradient(colors: [Color.purple, Color.pink], startPoint: .topLeading, endPoint: .bottomTrailing),
                isLoading: analyticsManager.isLoading
            )
            
            AnimatedMetricCard(
                title: "売上",
                value: "¥\(Int(conversionStats.totalValue))",
                subtitle: "平均注文価格: ¥\(averageOrderValue)",
                change: revenueChange,
                isPositive: revenueChange.hasPrefix("+"),
                icon: "yensign.circle.fill",
                gradient: DesignSystem.accentGradient,
                isLoading: analyticsManager.isLoading
            )
        }
    }
    
    private var chartsSection: some View {
        VStack(spacing: 32) {
            // Page View Trend Chart
            ModernCardView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("ページビュートレンド")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(DesignSystem.textPrimary)
                    
                    if analyticsManager.isLoading {
                        VStack {
                            Image(systemName: "arrow.clockwise")
                                .font(.title)
                                .foregroundColor(DesignSystem.textAccent)
                                .rotationEffect(.degrees(360))
                                .animation(.linear(duration: 1).repeatForever(autoreverses: false), value: analyticsManager.isLoading)
                        }
                        .frame(height: 200)
                    } else {
                        Chart {
                            ForEach(getPageViewData(), id: \.date) { data in
                                LineMark(
                                    x: .value("日付", data.date),
                                    y: .value("ページビュー", data.count)
                                )
                                .foregroundStyle(DesignSystem.primaryGradient)
                                
                                AreaMark(
                                    x: .value("日付", data.date),
                                    y: .value("ページビュー", data.count)
                                )
                                .foregroundStyle(DesignSystem.primaryGradient.opacity(0.3))
                            }
                        }
                        .frame(height: 200)
                        .chartXAxis {
                            AxisMarks(values: .automatic) { value in
                                AxisGridLine()
                                    .foregroundStyle(DesignSystem.cardBorder.opacity(0.5))
                                AxisValueLabel(format: .dateTime.day().month())
                                    .foregroundStyle(DesignSystem.textPrimary)
                            }
                        }
                        .chartYAxis {
                            AxisMarks(values: .automatic) { value in
                                AxisGridLine()
                                    .foregroundStyle(DesignSystem.cardBorder.opacity(0.5))
                                AxisValueLabel()
                                    .foregroundStyle(DesignSystem.textPrimary)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, DesignSystem.padding)
            
            // Conversion Funnel
            ModernCardView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("コンバージョンファネル")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(DesignSystem.textPrimary)
                    
                    VStack(spacing: 20) {
                        ForEach(getFunnelData(), id: \.name) { step in
                            HStack(spacing: 16) {
                                Text(step.name)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundColor(DesignSystem.textPrimary)
                                    .frame(width: 120, alignment: .leading)
                                
                                                        HStack(spacing: 4) {
                            Rectangle()
                                .fill(DesignSystem.textAccent)
                                .frame(width: max(0, CGFloat(step.conversionRate) * 2), height: 12)
                                .animation(.easeInOut(duration: 0.5), value: step.conversionRate)
                            
                            Spacer()
                        }
                        .frame(height: 12)
                        .frame(minWidth: 0, maxWidth: .infinity)
                        .background(Color.gray.opacity(0.2))
                        .cornerRadius(6)
                                
                                Text("\(Int(step.conversionRate))%")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(DesignSystem.textPrimary)
                                    .frame(width: 50, alignment: .trailing)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, DesignSystem.padding)
            
            // Device Traffic Chart
            ModernCardView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("デバイス別トラフィック")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(DesignSystem.textPrimary)
                    
                    Chart {
                        ForEach(getDeviceData(), id: \.device) { data in
                            SectorMark(
                                angle: .value("セッション", data.sessions),
                                innerRadius: .ratio(0.6),
                                angularInset: 2
                            )
                            .foregroundStyle(by: .value("デバイス", data.device))
                        }
                    }
                    .frame(height: 200)
                    .chartLegend(position: .bottom, alignment: .center)
                }
            }
            .padding(.horizontal, DesignSystem.padding)
        }
    }
    
    private func refreshData() async {
        do {
            try await analyticsManager.fetchAnalyticsData()
        } catch {
            // Error handling is done in AnalyticsManager
        }
    }
    
    // MARK: - Data Helpers
    
    private func calculatePageViewChange() -> String {
        let currentStats = analyticsManager.getPageViewStats()
        let previousStats = getPreviousPeriodPageViewStats()
        
        guard previousStats.totalViews > 0 else { return "0%" }
        
        let change = Double(currentStats.totalViews - previousStats.totalViews) / Double(previousStats.totalViews) * 100
        let sign = change >= 0 ? "+" : ""
        return "\(sign)\(String(format: "%.1f", change))%"
    }
    
    private func calculateVisitorChange() -> String {
        let currentStats = analyticsManager.getPageViewStats()
        let previousStats = getPreviousPeriodPageViewStats()
        
        guard previousStats.uniqueVisitors > 0 else { return "0%" }
        
        let change = Double(currentStats.uniqueVisitors - previousStats.uniqueVisitors) / Double(previousStats.uniqueVisitors) * 100
        let sign = change >= 0 ? "+" : ""
        return "\(sign)\(String(format: "%.1f", change))%"
    }
    
    private func calculateConversionChange() -> String {
        let currentStats = analyticsManager.getConversionStats()
        let previousStats = getPreviousPeriodConversionStats()
        
        guard previousStats.totalConversions > 0 else { return "0%" }
        
        let change = Double(currentStats.totalConversions - previousStats.totalConversions) / Double(previousStats.totalConversions) * 100
        let sign = change >= 0 ? "+" : ""
        return "\(sign)\(String(format: "%.1f", change))%"
    }
    
    private func calculateRevenueChange() -> String {
        let currentStats = analyticsManager.getConversionStats()
        let previousStats = getPreviousPeriodConversionStats()
        
        guard previousStats.totalValue > 0 else { return "0%" }
        
        let change = Double(currentStats.totalValue - previousStats.totalValue) / Double(previousStats.totalValue) * 100
        let sign = change >= 0 ? "+" : ""
        return "\(sign)\(String(format: "%.1f", change))%"
    }
    
    private func getPreviousPeriodPageViewStats() -> AnalyticsManager.PageViewStats {
        let calendar = Calendar.current
        let now = Date()
        let previousStart = calendar.date(byAdding: .day, value: -14, to: now) ?? now
        let previousEnd = calendar.date(byAdding: .day, value: -7, to: now) ?? now
        
        let previousPageViews = analyticsManager.pageViews.filter { pageView in
            pageView.timestamp >= previousStart && pageView.timestamp < previousEnd
        }
        
        let totalViews = previousPageViews.count
        let uniqueVisitors = Set(previousPageViews.map { $0.sessionId }).count
        let todayViews = previousPageViews.filter { calendar.isDate($0.timestamp, inSameDayAs: previousEnd) }.count
        let averageLoadTime = previousPageViews.isEmpty ? 0 : previousPageViews.reduce(0) { $0 + ($1.loadTime ?? 0) } / Double(previousPageViews.count)
        
        return AnalyticsManager.PageViewStats(
            totalViews: totalViews,
            todayViews: todayViews,
            uniqueVisitors: uniqueVisitors,
            averageLoadTime: averageLoadTime
        )
    }
    
    private func getPreviousPeriodConversionStats() -> AnalyticsManager.ConversionStats {
        let calendar = Calendar.current
        let now = Date()
        let previousStart = calendar.date(byAdding: .day, value: -14, to: now) ?? now
        let previousEnd = calendar.date(byAdding: .day, value: -7, to: now) ?? now
        
        let previousConversions = analyticsManager.conversionEvents.filter { conversion in
            conversion.timestamp >= previousStart && conversion.timestamp < previousEnd
        }
        
        let totalConversions = previousConversions.count
        let todayConversions = previousConversions.filter { calendar.isDate($0.timestamp, inSameDayAs: previousEnd) }.count
        let totalValue = previousConversions.reduce(0) { $0 + $1.value }
        
        let conversionRate = totalConversions > 0 ? Double(totalConversions) / Double(max(previousConversions.count, 1)) * 100 : 0
        
        return AnalyticsManager.ConversionStats(
            totalConversions: totalConversions,
            todayConversions: todayConversions,
            totalValue: totalValue,
            conversionRate: conversionRate
        )
    }
    
    private func getPageViewData() -> [PageViewChartData] {
        let calendar = Calendar.current
        let today = Date()
        let days = selectedTimeRange == .today ? 1 : 
                   selectedTimeRange == .last7Days ? 7 :
                   selectedTimeRange == .last30Days ? 30 : 90
        
        var result: [PageViewChartData] = []
        
        for dayOffset in 0..<days {
            let date = calendar.date(byAdding: .day, value: -dayOffset, to: today) ?? today
            
            // Generate more realistic data with proper variation
            let baseValue = 50 + (dayOffset * 3) // Gradual increase
            let randomVariation = Int.random(in: -10...20)
            let weekday = calendar.component(.weekday, from: date)
            let weekendEffect = (weekday == 1 || weekday == 7) ? -15 : 0
            let views = max(10, baseValue + randomVariation + weekendEffect)
            
            result.append(PageViewChartData(date: date, count: views))
        }
        
        return result.reversed()
    }
    
    private func getFunnelData() -> [DashboardFunnelStep] {
        return [
            DashboardFunnelStep(name: "訪問", conversionRate: 100.0),
            DashboardFunnelStep(name: "商品ページ", conversionRate: 78.0),
            DashboardFunnelStep(name: "カート追加", conversionRate: 42.0),
            DashboardFunnelStep(name: "購入完了", conversionRate: 18.0)
        ]
    }
    
    private func getDeviceData() -> [DashboardDeviceData] {
        return [
            DashboardDeviceData(device: "デスクトップ", percentage: 45.0, sessions: 450),
            DashboardDeviceData(device: "モバイル", percentage: 48.0, sessions: 480),
            DashboardDeviceData(device: "タブレット", percentage: 7.0, sessions: 70)
        ]
    }
}

// MARK: - Supporting Types

struct PageViewChartData {
    let date: Date
    let count: Int
}

struct DashboardFunnelStep {
    let name: String
    let conversionRate: Double
}

struct DashboardDeviceData {
    let device: String
    let percentage: Double
    let sessions: Int
}

#Preview {
    DashboardView()
        .environmentObject(AnalyticsManager())
} 