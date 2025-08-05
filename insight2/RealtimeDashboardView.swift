import SwiftUI
import Charts

struct RealtimeDashboardView: View {
    @EnvironmentObject var analyticsManager: AnalyticsManager
    @Environment(\.colorScheme) private var colorScheme
    @State private var selectedTimeRange: TimeRange = .lastHour
    @State private var showingSessionDetails = false
    @State private var animateStats = false
    
    enum TimeRange: String, CaseIterable {
        case lastHour = "1時間"
        case lastDay = "24時間"
        case lastWeek = "1週間"
        case lastMonth = "1ヶ月"
        
        var timeInterval: TimeInterval {
            switch self {
            case .lastHour: return 3600
            case .lastDay: return 86400
            case .lastWeek: return 604800
            case .lastMonth: return 2592000
            }
        }
        
        var color: Color {
            switch self {
            case .lastHour: return .blue
            case .lastDay: return .green
            case .lastWeek: return .orange
            case .lastMonth: return .purple
            }
        }
    }
    
    var body: some View {
        ZStack {
            DesignSystem.backgroundGradient
                .ignoresSafeArea()
            
            RefreshableScrollView(onRefresh: {
                // リアルタイムデータの更新
                try? await Task.sleep(nanoseconds: 1_000_000_000) // 1秒待機
            }) {
                VStack(spacing: 24) {
                    headerView
                    statsOverview
                    sessionsList
                }
                .padding(.vertical, 20)
            }
        }
        .sheet(isPresented: $showingSessionDetails) {
            SessionDetailsView()
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.8)) {
                animateStats = true
            }
        }
    }
    
    // MARK: - Sub Views
    
    private var headerView: some View {
        VStack(spacing: 20) {
            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    Text("リアルタイムダッシュボード")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(DesignSystem.textPrimary(for: colorScheme))
                    
                    Text("現在のセッションとアクティビティ")
                        .font(.subheadline)
                        .foregroundColor(DesignSystem.textSecondary(for: colorScheme))
                }
                
                Spacer()
                
                VStack(spacing: 12) {
                    HStack {
                        ForEach(TimeRange.allCases, id: \.self) { range in
                            Button(action: {
                                withAnimation(.easeInOut(duration: 0.3)) {
                                    selectedTimeRange = range
                                }
                            }) {
                                Text(range.rawValue)
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(
                                        RoundedRectangle(cornerRadius: 8)
                                            .fill(selectedTimeRange == range ? range.color.opacity(0.2) : Color.clear)
                                    )
                                    .foregroundColor(selectedTimeRange == range ? range.color : DesignSystem.textSecondary(for: colorScheme))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(selectedTimeRange == range ? range.color : DesignSystem.cardBorder(for: colorScheme), lineWidth: 1)
                                    )
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                    
                    HStack(spacing: 12) {
                        AnimatedButton(
                            title: analyticsManager.isTrackingEnabled ? "トラッキング停止" : "トラッキング開始",
                            icon: analyticsManager.isTrackingEnabled ? "stop.circle" : "play.circle",
                            style: analyticsManager.isTrackingEnabled ? .danger : .success,
                            action: {
                                analyticsManager.toggleTracking()
                            }
                        )
                        
                        AnimatedButton(
                            title: "データクリア",
                            icon: "trash",
                            style: .secondary,
                            action: {
                                analyticsManager.clearSessionData()
                            }
                        )
                    }
                }
            }
            .padding(.horizontal, DesignSystem.padding)
        }
    }
    
    private var statsOverview: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible()),
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 16) {
            let stats = analyticsManager.getSessionStats()
            
            AnimatedMetricCard(
                title: "アクティブセッション",
                value: "\(stats.activeSessions)",
                subtitle: "平均時間: \(formatDuration(stats.averageSessionDuration))",
                change: "+2",
                isPositive: true,
                icon: "person.2.fill",
                gradient: DesignSystem.primaryGradient,
                isLoading: false
            )
            .offset(x: animateStats ? 0 : -50)
            .opacity(animateStats ? 1 : 0)
            
            AnimatedMetricCard(
                title: "ページビュー",
                value: "\(stats.totalPageViews)",
                subtitle: "リアルタイム更新中",
                change: "+15",
                isPositive: true,
                icon: "eye.fill",
                gradient: DesignSystem.secondaryGradient,
                isLoading: false
            )
            .offset(x: animateStats ? 0 : 50)
            .opacity(animateStats ? 1 : 0)
            
            AnimatedMetricCard(
                title: "クリック数",
                value: "\(stats.totalClicks)",
                subtitle: "インタラクション率: \(calculateInteractionRate(stats))%",
                change: "+8",
                isPositive: true,
                icon: "cursorarrow",
                gradient: LinearGradient(colors: [Color.orange, Color.yellow], startPoint: .topLeading, endPoint: .bottomTrailing),
                isLoading: false
            )
            .offset(x: animateStats ? 0 : -50)
            .opacity(animateStats ? 1 : 0)
            
            AnimatedMetricCard(
                title: "コンバージョン",
                value: "\(stats.totalConversions)",
                subtitle: "コンバージョン率: \(calculateConversionRate(stats))%",
                change: "+3",
                isPositive: true,
                icon: "chart.line.uptrend.xyaxis",
                gradient: LinearGradient(colors: [Color.purple, Color.pink], startPoint: .topLeading, endPoint: .bottomTrailing),
                isLoading: false
            )
            .offset(x: animateStats ? 0 : 50)
            .opacity(animateStats ? 1 : 0)
        }
        .padding(.horizontal, DesignSystem.padding)
        .animation(.easeOut(duration: 0.6).delay(0.1), value: animateStats)
    }
    
    private var sessionsList: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("アクティブセッション")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(DesignSystem.textPrimary)
                    
                    Spacer()
                    
                    Badge(text: "\(analyticsManager.getActiveSessions().count)", color: DesignSystem.textAccent)
                    
                    AnimatedButton(
                        title: "詳細",
                        icon: "chevron.right",
                        style: .secondary,
                        action: {
                            showingSessionDetails = true
                        }
                    )
                }
                
                if analyticsManager.realtimeSessions.isEmpty {
                    EmptyStateView(
                        icon: "person.slash",
                        title: "アクティブセッションがありません",
                        message: "ウェブサイトタブでサイトを開いて、トラッキングを開始してください",
                        actionTitle: nil,
                        action: nil
                    )
                } else {
                    LazyVStack(spacing: 12) {
                        ForEach(Array(analyticsManager.getActiveSessions()), id: \.id) { session in
                            SessionCard(session: session)
                                .transition(.opacity.combined(with: .scale))
                        }
                    }
                }
            }
        }
        .padding(.horizontal, DesignSystem.padding)
    }
    
    // MARK: - Helper Methods
    
    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return "\(minutes):\(String(format: "%02d", seconds))"
    }
    
    private func calculateInteractionRate(_ stats: SessionStats) -> Int {
        guard stats.totalPageViews > 0 else { return 0 }
        let rate = (Double(stats.totalClicks) / Double(stats.totalPageViews)) * 100
        return Int(rate)
    }
    
    private func calculateConversionRate(_ stats: SessionStats) -> Int {
        guard stats.totalPageViews > 0 else { return 0 }
        let rate = (Double(stats.totalConversions) / Double(stats.totalPageViews)) * 100
        return Int(rate)
    }
    
    private func getRealTimeStats() -> SessionStats {
        let activeSessions = analyticsManager.getActiveSessions()
        let allSessions = analyticsManager.realtimeSessions
        
        let totalPageViews = allSessions.values.reduce(0) { $0 + $1.pageViews.count }
        let totalClicks = allSessions.values.reduce(0) { $0 + $1.clicks.count }
        let totalConversions = allSessions.values.reduce(0) { $0 + $1.conversions.count }
        
        let averageSessionDuration = allSessions.isEmpty ? 0 : 
            allSessions.values.reduce(0) { $0 + $1.duration } / Double(allSessions.count)
        
        return SessionStats(
            activeSessions: activeSessions.count,
            totalPageViews: totalPageViews,
            totalClicks: totalClicks,
            totalConversions: totalConversions,
            averageSessionDuration: averageSessionDuration
        )
    }
}

// MARK: - Supporting Views

struct SessionCard: View {
    let session: SessionData
    @State private var isExpanded = false
    @Environment(\.colorScheme) private var colorScheme
    
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("セッション \(session.id.suffix(8))")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(DesignSystem.textPrimary)
                        
                        Spacer()
                        
                        Text(formatDuration(session.duration))
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(DesignSystem.textAccent)
                    }
                    
                    Text("\(session.pageViews.count) ページビュー • \(session.clicks.count) クリック • \(session.conversions.count) コンバージョン")
                        .font(.caption)
                        .foregroundColor(DesignSystem.textSecondary(for: colorScheme))
                }
                
                Spacer()
                
                Button(action: {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        isExpanded.toggle()
                    }
                }) {
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .foregroundColor(DesignSystem.textSecondary(for: colorScheme))
                        .font(.caption)
                }
                .buttonStyle(PlainButtonStyle())
            }
            
            if isExpanded {
                VStack(spacing: 8) {
                    ModernDivider()
                    
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("開始時間")
                                .font(.caption2)
                                .foregroundColor(DesignSystem.textSecondary(for: colorScheme))
                            Text(session.startTime, style: .time)
                                .font(.caption)
                                .foregroundColor(DesignSystem.textPrimary(for: colorScheme))
                        }
                        
                        Spacer()
                        
                        VStack(alignment: .trailing, spacing: 4) {
                            Text("最終アクティビティ")
                                .font(.caption2)
                                .foregroundColor(DesignSystem.textSecondary(for: colorScheme))
                            Text(session.lastActivity, style: .time)
                                .font(.caption)
                                .foregroundColor(DesignSystem.textPrimary(for: colorScheme))
                        }
                    }
                    
                    if let scrollDepth = session.scrollDepth {
                        HStack {
                            Text("スクロール深度")
                                .font(.caption2)
                                .foregroundColor(DesignSystem.textSecondary(for: colorScheme))
                            
                            Spacer()
                            
                            Text("\(scrollDepth)%")
                                .font(.caption)
                                .foregroundColor(DesignSystem.textPrimary(for: colorScheme))
                        }
                    }
                    
                    if !session.pageViews.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("最近のページビュー")
                                .font(.caption2)
                                .foregroundColor(DesignSystem.textSecondary(for: colorScheme))
                            
                            ForEach(session.pageViews.suffix(3), id: \.id) { pageView in
                                HStack {
                                    Image(systemName: "doc.text")
                                        .foregroundColor(.blue)
                                        .font(.caption2)
                                    
                                    Text(pageView.pageTitle)
                                        .font(.caption)
                                        .foregroundColor(DesignSystem.textPrimary(for: colorScheme))
                                        .lineLimit(1)
                                    
                                    Spacer()
                                    
                                    Text(pageView.timestamp, style: .time)
                                        .font(.caption2)
                                        .foregroundColor(DesignSystem.textSecondary(for: colorScheme))
                                }
                            }
                        }
                    }
                }
            }
        }
        .padding(DesignSystem.smallPadding)
        .background(
            RoundedRectangle(cornerRadius: DesignSystem.smallCornerRadius)
                .fill(DesignSystem.cardBackground(for: colorScheme))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignSystem.smallCornerRadius)
                        .stroke(DesignSystem.cardBorder(for: colorScheme), lineWidth: 1)
                )
        )
    }
    
    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return "\(minutes):\(String(format: "%02d", seconds))"
    }
}

// MARK: - Session Details View

struct SessionDetailsView: View {
    @EnvironmentObject var analyticsManager: AnalyticsManager
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    
    private var sessionList: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(Array(analyticsManager.getActiveSessions().enumerated()), id: \.element.id) { _, session in
                    ModernCardView {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("セッション \(session.id.suffix(8))")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(DesignSystem.textPrimary(for: colorScheme))
                                
                                Spacer()
                                
                                Badge(text: "アクティブ", color: .green)
                            }
                            
                            ModernDivider()
                            
                            VStack(spacing: 8) {
                                InfoRow(label: "開始時間", value: session.startTime, style: .medium)
                                InfoRow(label: "最終アクティビティ", value: session.lastActivity, style: .medium)
                                InfoRow(label: "ページビュー", value: "\(session.pageViews.count)")
                                InfoRow(label: "クリック", value: "\(session.clicks.count)")
                                InfoRow(label: "コンバージョン", value: "\(session.conversions.count)")
                                if let scrollDepth = session.scrollDepth {
                                    InfoRow(label: "スクロール深度", value: "\(scrollDepth)%")
                                }
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, DesignSystem.padding)
        }
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                DesignSystem.backgroundGradient
                    .ignoresSafeArea()
                
                VStack(spacing: 20) {
                    if analyticsManager.getActiveSessions().isEmpty {
                        EmptyStateView(
                            icon: "person.slash",
                            title: "アクティブセッションがありません",
                            message: "現在アクティブなセッションはありません",
                            actionTitle: nil,
                            action: nil
                        )
                    } else {
                        sessionList
                    }
                }
            }
            .navigationTitle("セッション詳細")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
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
    }
}



#Preview {
    RealtimeDashboardView()
        .environmentObject(AnalyticsManager())
} 