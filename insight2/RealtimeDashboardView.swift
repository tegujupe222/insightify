import SwiftUI
import Charts

struct RealtimeDashboardView: View {
    @EnvironmentObject var analyticsManager: AnalyticsManager
    @State private var selectedTimeRange: TimeRange = .lastHour
    @State private var autoRefresh = true
    
    enum TimeRange: String, CaseIterable {
        case lastHour = "過去1時間"
        case last6Hours = "過去6時間"
        case last24Hours = "過去24時間"
        
        var minutes: Int {
            switch self {
            case .lastHour: return 60
            case .last6Hours: return 360
            case .last24Hours: return 1440
            }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 16) {
                    HStack {
                        Text("リアルタイムダッシュボード")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(DesignSystem.textPrimary)
                        
                        Spacer()
                        
                        HStack(spacing: 12) {
                            Toggle("自動更新", isOn: $autoRefresh)
                                .toggleStyle(.switch)
                                .scaleEffect(0.8)
                            
                            Picker("期間", selection: $selectedTimeRange) {
                                ForEach(TimeRange.allCases, id: \.self) { range in
                                    Text(range.rawValue).tag(range)
                                }
                            }
                            .pickerStyle(.menu)
                        }
                    }
                    
                    Text("現在のユーザー活動をリアルタイムで監視します")
                        .font(.subheadline)
                        .foregroundColor(DesignSystem.textSecondary)
                        .multilineTextAlignment(.leading)
                }
                .padding(DesignSystem.padding)
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Real-time Stats
                        RealtimeStatsCard()
                        
                        // Active Sessions
                        ActiveSessionsCard()
                        
                        // Real-time Chart
                        RealtimeChartCard()
                        
                        // Recent Events
                        RecentEventsCard()
                    }
                    .padding(DesignSystem.padding)
                }
            }
            .background(DesignSystem.backgroundGradient)
            .onAppear {
                startAutoRefresh()
            }
            .onDisappear {
                stopAutoRefresh()
            }
        }
    }
    
    private func startAutoRefresh() {
        guard autoRefresh else { return }
        // 実際のアプリでは、ここでタイマーを開始
    }
    
    private func stopAutoRefresh() {
        // タイマーを停止
    }
}

struct RealtimeStatsCard: View {
    @EnvironmentObject var analyticsManager: AnalyticsManager
    
    var body: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 16) {
            let stats = analyticsManager.getSessionStats()
            
            AnimatedMetricCard(
                title: "アクティブセッション",
                value: "\(stats.activeSessions)",
                subtitle: "現在オンライン",
                change: "+\(Int.random(in: 1...5))",
                isPositive: true,
                icon: "person.2.fill",
                gradient: DesignSystem.primaryGradient,
                isLoading: false
            )
            
            AnimatedMetricCard(
                title: "ページビュー/分",
                value: "\(Int.random(in: 10...50))",
                subtitle: "過去1分間",
                change: "+\(Int.random(in: 5...15))%",
                isPositive: true,
                icon: "eye.fill",
                gradient: DesignSystem.secondaryGradient,
                isLoading: false
            )
            
            AnimatedMetricCard(
                title: "平均セッション時間",
                value: "\(String(format: "%.1f", stats.averageSessionDuration / 60))分",
                subtitle: "現在のセッション",
                change: "+\(Int.random(in: 1...10))%",
                isPositive: true,
                icon: "clock.fill",
                gradient: LinearGradient(colors: [Color.purple, Color.pink], startPoint: .topLeading, endPoint: .bottomTrailing),
                isLoading: false
            )
            
            AnimatedMetricCard(
                title: "コンバージョン/時",
                value: "\(Int.random(in: 1...10))",
                subtitle: "過去1時間",
                change: "+\(Int.random(in: 10...30))%",
                isPositive: true,
                icon: "target",
                gradient: DesignSystem.accentGradient,
                isLoading: false
            )
        }
    }
}

struct ActiveSessionsCard: View {
    @EnvironmentObject var analyticsManager: AnalyticsManager
    
    var body: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("アクティブセッション")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(DesignSystem.textPrimary)
                    
                    Spacer()
                    
                    Text("\(analyticsManager.getActiveSessions().count) セッション")
                        .font(.caption)
                        .foregroundColor(DesignSystem.textSecondary)
                }
                
                if analyticsManager.getActiveSessions().isEmpty {
                    EmptyStateView(
                        icon: "person.2",
                        title: "アクティブセッションがありません",
                        message: "現在オンラインのユーザーはいません",
                        actionTitle: nil,
                        action: nil
                    )
                } else {
                    LazyVStack(spacing: 12) {
                        ForEach(analyticsManager.getActiveSessions().prefix(5), id: \.id) { session in
                            SessionRow(session: session)
                        }
                    }
                }
            }
        }
    }
}

struct SessionRow: View {
    let session: SessionData
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("セッション \(session.id.prefix(8))")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(DesignSystem.textPrimary)
                
                Text("\(session.pageViews.count) ページビュー • \(session.clicks.count) クリック")
                    .font(.caption)
                    .foregroundColor(DesignSystem.textSecondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text(sessionDuration)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(DesignSystem.textPrimary)
                
                Text("\(timeAgo)")
                    .font(.caption)
                    .foregroundColor(DesignSystem.textSecondary)
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.gray.opacity(0.1))
        )
    }
    
    private var sessionDuration: String {
        let duration = session.duration
        let minutes = Int(duration / 60)
        let seconds = Int(duration.truncatingRemainder(dividingBy: 60))
        return "\(minutes):\(String(format: "%02d", seconds))"
    }
    
    private var timeAgo: String {
        let timeInterval = Date().timeIntervalSince(session.lastActivity)
        if timeInterval < 60 {
            return "今"
        } else if timeInterval < 3600 {
            return "\(Int(timeInterval / 60))分前"
        } else {
            return "\(Int(timeInterval / 3600))時間前"
        }
    }
}

struct RealtimeChartCard: View {
    @EnvironmentObject var analyticsManager: AnalyticsManager
    
    var body: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 16) {
                Text("リアルタイムアクティビティ")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(DesignSystem.textPrimary)
                
                Chart {
                    ForEach(getRealtimeData(), id: \.time) { data in
                        LineMark(
                            x: .value("時間", data.time),
                            y: .value("アクティビティ", data.activity)
                        )
                        .foregroundStyle(DesignSystem.primaryGradient)
                        
                        AreaMark(
                            x: .value("時間", data.time),
                            y: .value("アクティビティ", data.activity)
                        )
                        .foregroundStyle(DesignSystem.primaryGradient.opacity(0.3))
                    }
                }
                .frame(height: 200)
                .chartXAxis {
                    AxisMarks(values: .automatic) { value in
                        AxisGridLine()
                            .foregroundStyle(DesignSystem.cardBorder.opacity(0.5))
                        AxisValueLabel(format: .dateTime.hour().minute())
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
    
    private func getRealtimeData() -> [RealtimeDataPoint] {
        let now = Date()
        var data: [RealtimeDataPoint] = []
        
        for i in 0..<60 {
            let time = Calendar.current.date(byAdding: .minute, value: -i, to: now) ?? now
            let activity = Int.random(in: 5...25) // 実際のアプリでは、この時点での実際のアクティビティ数を使用
            data.append(RealtimeDataPoint(time: time, activity: activity))
        }
        
        return data.reversed()
    }
}

struct RecentEventsCard: View {
    @EnvironmentObject var analyticsManager: AnalyticsManager
    
    var body: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("最近のイベント")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(DesignSystem.textPrimary)
                    
                    Spacer()
                    
                    Text("過去10分間")
                        .font(.caption)
                        .foregroundColor(DesignSystem.textSecondary)
                }
                
                if recentEvents.isEmpty {
                    EmptyStateView(
                        icon: "antenna.radiowaves.left.and.right",
                        title: "イベントがありません",
                        message: "最近のイベントはありません",
                        actionTitle: nil,
                        action: nil
                    )
                } else {
                    LazyVStack(spacing: 12) {
                        ForEach(recentEvents.prefix(10), id: \.id) { event in
                            EventRow(event: event)
                        }
                    }
                }
            }
        }
    }
    
    private var recentEvents: [AnalyticsEvent] {
        let now = Date()
        let tenMinutesAgo = Calendar.current.date(byAdding: .minute, value: -10, to: now) ?? now
        
        var events: [AnalyticsEvent] = []
        
        // ページビューイベント
        for pageView in analyticsManager.pageViews {
            if pageView.timestamp >= tenMinutesAgo {
                events.append(AnalyticsEvent(
                    id: pageView.id,
                    type: .pageView,
                    title: pageView.pageTitle,
                    url: pageView.url,
                    timestamp: pageView.timestamp,
                    sessionId: pageView.sessionId
                ))
            }
        }
        
        // クリックイベント
        for click in analyticsManager.clickEvents {
            if click.timestamp >= tenMinutesAgo {
                events.append(AnalyticsEvent(
                    id: click.id,
                    type: .click,
                    title: "クリック: \(click.elementTag)",
                    url: click.url,
                    timestamp: click.timestamp,
                    sessionId: click.sessionId
                ))
            }
        }
        
        // コンバージョンイベント
        for conversion in analyticsManager.conversionEvents {
            if conversion.timestamp >= tenMinutesAgo {
                events.append(AnalyticsEvent(
                    id: conversion.id,
                    type: .conversion,
                    title: "コンバージョン: \(conversion.goal)",
                    url: conversion.url,
                    timestamp: conversion.timestamp,
                    sessionId: conversion.sessionId
                ))
            }
        }
        
        return events.sorted { $0.timestamp > $1.timestamp }
    }
}

struct EventRow: View {
    let event: AnalyticsEvent
    
    var body: some View {
        HStack {
            Image(systemName: event.type.icon)
                .font(.subheadline)
                .foregroundColor(event.type.color)
                .frame(width: 20)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(event.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(DesignSystem.textPrimary)
                
                Text(event.url)
                    .font(.caption)
                    .foregroundColor(DesignSystem.textSecondary)
                    .lineLimit(1)
            }
            
            Spacer()
            
            Text(timeAgo)
                .font(.caption)
                .foregroundColor(DesignSystem.textSecondary)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.gray.opacity(0.1))
        )
    }
    
    private var timeAgo: String {
        let timeInterval = Date().timeIntervalSince(event.timestamp)
        if timeInterval < 60 {
            return "今"
        } else if timeInterval < 3600 {
            return "\(Int(timeInterval / 60))分前"
        } else {
            return "\(Int(timeInterval / 3600))時間前"
        }
    }
}

// MARK: - Supporting Types

struct RealtimeDataPoint {
    let time: Date
    let activity: Int
}

struct AnalyticsEvent {
    let id: UUID
    let type: EventType
    let title: String
    let url: String
    let timestamp: Date
    let sessionId: String
}

enum EventType {
    case pageView
    case click
    case conversion
    
    var icon: String {
        switch self {
        case .pageView: return "eye.fill"
        case .click: return "hand.tap.fill"
        case .conversion: return "target"
        }
    }
    
    var color: Color {
        switch self {
        case .pageView: return .blue
        case .click: return .green
        case .conversion: return .purple
        }
    }
}

#Preview {
    RealtimeDashboardView()
        .environmentObject(AnalyticsManager())
} 