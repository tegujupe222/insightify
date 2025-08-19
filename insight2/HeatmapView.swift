import SwiftUI
import Charts

struct HeatmapView: View {
    @EnvironmentObject var analyticsManager: AnalyticsManager
    @State private var selectedPage = "all"
    @State private var showingPageSelector = false
    @State private var heatmapType: HeatmapType = .clicks
    @State private var timeRange: TimeRange = .last7Days
    
    enum HeatmapType: String, CaseIterable {
        case clicks = "クリック"
        case scrolls = "スクロール"
        case hovers = "ホバー"
        
        var icon: String {
            switch self {
            case .clicks: return "hand.tap.fill"
            case .scrolls: return "scroll"
            case .hovers: return "cursorarrow"
            }
        }
    }
    
    enum TimeRange: String, CaseIterable {
        case last24Hours = "過去24時間"
        case last7Days = "過去7日間"
        case last30Days = "過去30日間"
        case last90Days = "過去90日間"
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 16) {
                    HStack {
                        Text("ヒートマップ")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(DesignSystem.textPrimary)
                        
                        Spacer()
                        
                        Menu {
                            ForEach(HeatmapType.allCases, id: \.self) { type in
                                Button(action: {
                                    heatmapType = type
                                }) {
                                    Label(type.rawValue, systemImage: type.icon)
                                }
                            }
                        } label: {
                            HStack {
                                Image(systemName: heatmapType.icon)
                                Text(heatmapType.rawValue)
                                Image(systemName: "chevron.down")
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(DesignSystem.cardBackground)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(DesignSystem.cardBorder, lineWidth: 1)
                                    )
                            )
                        }
                    }
                    
                    Text("ユーザーの行動パターンを視覚化して、最適なUI設計に活用しましょう")
                        .font(.subheadline)
                        .foregroundColor(DesignSystem.textSecondary)
                        .multilineTextAlignment(.leading)
                }
                .padding(DesignSystem.padding)
                
                // Filters
                VStack(spacing: 12) {
                    HStack {
                        Text("ページ選択")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(DesignSystem.textPrimary)
                        
                        Spacer()
                        
                        Button(action: {
                            showingPageSelector = true
                        }) {
                            HStack {
                                Text(selectedPage == "all" ? "全ページ" : selectedPage)
                                    .foregroundColor(DesignSystem.textPrimary)
                                Image(systemName: "chevron.down")
                                    .foregroundColor(DesignSystem.textSecondary)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(
                                RoundedRectangle(cornerRadius: 6)
                                    .fill(DesignSystem.cardBackground)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 6)
                                            .stroke(DesignSystem.cardBorder, lineWidth: 1)
                                    )
                            )
                        }
                    }
                    
                    HStack {
                        Text("期間")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(DesignSystem.textPrimary)
                        
                        Spacer()
                        
                        Picker("期間", selection: $timeRange) {
                            ForEach(TimeRange.allCases, id: \.self) { range in
                                Text(range.rawValue).tag(range)
                            }
                        }
                        .pickerStyle(.menu)
                    }
                }
                .padding(.horizontal, DesignSystem.padding)
                
                // Content
                if analyticsManager.clickEvents.isEmpty {
                    EmptyStateView(
                        icon: "flame.fill",
                        title: "ヒートマップデータがありません",
                        message: "ウェブサイトにトラッキングスクリプトを埋め込んで、ユーザーの行動データを収集しましょう",
                        actionTitle: "トラッキング設定",
                        action: {
                            // トラッキング設定画面に遷移
                        }
                    )
                } else {
                    ScrollView {
                        VStack(spacing: 24) {
                            // Heatmap Visualization
                            HeatmapVisualization(
                                clickEvents: getFilteredClickEvents(),
                                heatmapType: heatmapType
                            )
                            
                            // Statistics
                            HeatmapStats(clickEvents: getFilteredClickEvents())
                            
                            // Top Clicked Elements
                            TopClickedElements(clickEvents: getFilteredClickEvents())
                        }
                        .padding(DesignSystem.padding)
                    }
                }
            }
            .background(DesignSystem.backgroundGradient)
            .sheet(isPresented: $showingPageSelector) {
                PageSelectorSheet(selectedPage: $selectedPage)
            }
        }
    }
    
    private func getFilteredClickEvents() -> [ClickEvent] {
        let filteredEvents = analyticsManager.clickEvents.filter { event in
            let isInTimeRange = isEventInTimeRange(event.timestamp)
            let isOnSelectedPage = selectedPage == "all" || event.url.contains(selectedPage)
            return isInTimeRange && isOnSelectedPage
        }
        return filteredEvents
    }
    
    private func isEventInTimeRange(_ timestamp: Date) -> Bool {
        let now = Date()
        let calendar = Calendar.current
        
        switch timeRange {
        case .last24Hours:
            return calendar.isDate(timestamp, inSameDayAs: now) || 
                   timestamp > calendar.date(byAdding: .day, value: -1, to: now) ?? now
        case .last7Days:
            return timestamp > calendar.date(byAdding: .day, value: -7, to: now) ?? now
        case .last30Days:
            return timestamp > calendar.date(byAdding: .day, value: -30, to: now) ?? now
        case .last90Days:
            return timestamp > calendar.date(byAdding: .day, value: -90, to: now) ?? now
        }
    }
}

struct HeatmapVisualization: View {
    let clickEvents: [ClickEvent]
    let heatmapType: HeatmapView.HeatmapType
    
    var body: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("ヒートマップ")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(DesignSystem.textPrimary)
                    
                    Spacer()
                    
                    Text("\(clickEvents.count) イベント")
                        .font(.caption)
                        .foregroundColor(DesignSystem.textSecondary)
                }
                
                // Simplified heatmap representation
                ZStack {
                    // Background grid
                    VStack(spacing: 2) {
                        ForEach(0..<20, id: \.self) { row in
                            HStack(spacing: 2) {
                                ForEach(0..<30, id: \.self) { col in
                                    Rectangle()
                                        .fill(Color.gray.opacity(0.1))
                                        .frame(height: 8)
                                }
                            }
                        }
                    }
                    
                    // Heatmap points
                    ForEach(clickEvents.prefix(50), id: \.id) { event in
                        Circle()
                            .fill(heatmapColor(for: event))
                            .frame(width: 6, height: 6)
                            .position(
                                x: CGFloat(event.x % 30) * 10 + 5,
                                y: CGFloat(event.y % 20) * 10 + 5
                            )
                    }
                }
                .frame(height: 200)
                .background(Color.gray.opacity(0.05))
                .cornerRadius(8)
                
                // Legend
                HStack {
                    Text("低")
                        .font(.caption)
                        .foregroundColor(DesignSystem.textSecondary)
                    
                    HStack(spacing: 2) {
                        ForEach(0..<5, id: \.self) { index in
                            Circle()
                                .fill(heatmapColorIntensity(Double(index) / 4.0))
                                .frame(width: 8, height: 8)
                        }
                    }
                    
                    Text("高")
                        .font(.caption)
                        .foregroundColor(DesignSystem.textSecondary)
                    
                    Spacer()
                }
            }
        }
    }
    
    private func heatmapColor(for event: ClickEvent) -> Color {
        // 簡易的な色の計算
        let intensity = min(Double(clickEvents.filter { 
            abs($0.x - event.x) < 50 && abs($0.y - event.y) < 50 
        }.count) / 10.0, 1.0)
        
        return heatmapColorIntensity(intensity)
    }
    
    private func heatmapColorIntensity(_ intensity: Double) -> Color {
        return Color.red.opacity(0.3 + intensity * 0.7)
    }
}

struct HeatmapStats: View {
    let clickEvents: [ClickEvent]
    
    var body: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 16) {
            StatCard(
                title: "総クリック数",
                value: "\(clickEvents.count)",
                icon: "hand.tap.fill",
                color: .blue
            )
            
            StatCard(
                title: "ユニーク要素",
                value: "\(uniqueElements)",
                icon: "rectangle.stack.fill",
                color: .green
            )
            
            StatCard(
                title: "平均クリック位置",
                value: "\(averageX, specifier: "%.0f"), \(averageY, specifier: "%.0f")",
                icon: "location.fill",
                color: .orange
            )
            
            StatCard(
                title: "最も人気の要素",
                value: mostPopularElement,
                icon: "star.fill",
                color: .purple
            )
        }
    }
    
    private var uniqueElements: Int {
        let elements = clickEvents.map { "\($0.elementTag)_\($0.elementClass ?? "")" }
        return Set(elements).count
    }
    
    private var averageX: Double {
        guard !clickEvents.isEmpty else { return 0 }
        return Double(clickEvents.reduce(0) { $0 + $1.x }) / Double(clickEvents.count)
    }
    
    private var averageY: Double {
        guard !clickEvents.isEmpty else { return 0 }
        return Double(clickEvents.reduce(0) { $0 + $1.y }) / Double(clickEvents.count)
    }
    
    private var mostPopularElement: String {
        let elementCounts = Dictionary(grouping: clickEvents) { event in
            event.elementTag
        }.mapValues { $0.count }
        
        return elementCounts.max(by: { $0.value < $1.value })?.key ?? "なし"
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: icon)
                        .font(.title2)
                        .foregroundColor(color)
                    
                    Spacer()
                }
                
                Text(value)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(DesignSystem.textPrimary)
                
                Text(title)
                    .font(.caption)
                    .foregroundColor(DesignSystem.textSecondary)
            }
        }
    }
}

struct TopClickedElements: View {
    let clickEvents: [ClickEvent]
    
    var body: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 16) {
                Text("最もクリックされた要素")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(DesignSystem.textPrimary)
                
                if topElements.isEmpty {
                    Text("データがありません")
                        .font(.subheadline)
                        .foregroundColor(DesignSystem.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding()
                } else {
                    VStack(spacing: 12) {
                        ForEach(Array(topElements.prefix(5).enumerated()), id: \.offset) { index, element in
                            HStack {
                                Text("\(index + 1)")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(DesignSystem.textSecondary)
                                    .frame(width: 20)
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(element.tag)
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .foregroundColor(DesignSystem.textPrimary)
                                    
                                    if let className = element.className {
                                        Text(className)
                                            .font(.caption)
                                            .foregroundColor(DesignSystem.textSecondary)
                                    }
                                }
                                
                                Spacer()
                                
                                Text("\(element.count)")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(DesignSystem.textPrimary)
                            }
                            
                            if index < min(4, topElements.count - 1) {
                                Divider()
                            }
                        }
                    }
                }
            }
        }
    }
    
    private var topElements: [ElementStats] {
        let elementCounts = Dictionary(grouping: clickEvents) { event in
            ElementKey(tag: event.elementTag, className: event.elementClass)
        }.mapValues { $0.count }
        
        return elementCounts.map { key, count in
            ElementStats(tag: key.tag, className: key.className, count: count)
        }.sorted { $0.count > $1.count }
    }
}

struct ElementStats {
    let tag: String
    let className: String?
    let count: Int
}

struct ElementKey: Hashable {
    let tag: String
    let className: String?
}

struct PageSelectorSheet: View {
    @Binding var selectedPage: String
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var analyticsManager: AnalyticsManager
    
    var body: some View {
        NavigationView {
            List {
                Section("ページ選択") {
                    Button("全ページ") {
                        selectedPage = "all"
                        dismiss()
                    }
                    .foregroundColor(selectedPage == "all" ? DesignSystem.textAccent : DesignSystem.textPrimary)
                    
                    ForEach(uniquePages, id: \.self) { page in
                        Button(page) {
                            selectedPage = page
                            dismiss()
                        }
                        .foregroundColor(selectedPage == page ? DesignSystem.textAccent : DesignSystem.textPrimary)
                    }
                }
            }
            .navigationTitle("ページ選択")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("キャンセル") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private var uniquePages: [String] {
        let pages = analyticsManager.clickEvents.map { event in
            URL(string: event.url)?.host ?? event.url
        }
        return Array(Set(pages)).sorted()
    }
}

#Preview {
    HeatmapView()
        .environmentObject(AnalyticsManager())
}

 