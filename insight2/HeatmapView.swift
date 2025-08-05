import SwiftUI
import Charts

struct HeatmapView: View {
    @Environment(\.colorScheme) private var colorScheme
    @EnvironmentObject var analyticsManager: AnalyticsManager
    @State private var selectedURL = "https://example.com"
    @State private var showingURLSelector = false
    @State private var selectedTimeRange: TimeRange = .last7Days
    @State private var showingClickDetails = false
    @State private var selectedClickEvent: ClickEvent?
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    enum TimeRange: String, CaseIterable {
        case last24Hours = "過去24時間"
        case last7Days = "過去7日間"
        case last30Days = "過去30日間"
        case allTime = "全期間"
        
        var dateInterval: TimeInterval {
            switch self {
            case .last24Hours: return 24 * 60 * 60
            case .last7Days: return 7 * 24 * 60 * 60
            case .last30Days: return 30 * 24 * 60 * 60
            case .allTime: return 0
            }
        }
    }
    
    var body: some View {
        let primaryColor = DesignSystem.textPrimary
        let secondaryColor = DesignSystem.textSecondary
        let cardBackground = DesignSystem.cardBackground
        let cardBorder = DesignSystem.cardBorder
        ZStack {
            DesignSystem.backgroundGradient
                .ignoresSafeArea()
            VStack(spacing: 24) {
                headerView(primaryColor: primaryColor, secondaryColor: secondaryColor)
                if isLoading {
                    LoadingView(message: "ヒートマップを生成中...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = errorMessage {
                    ErrorView(
                        error: error,
                        retryAction: {
                            loadHeatmapData()
                        }
                    )
                } else {
                    ScrollView {
                        VStack(spacing: 20) {
                            statsOverview(primaryColor: primaryColor)
                            heatmapVisualization(primaryColor: primaryColor, cardBackground: cardBackground, cardBorder: cardBorder)
                            clickDetailsSection(primaryColor: primaryColor, secondaryColor: secondaryColor)
                        }
                        .padding(.horizontal, 20)
                    }
                }
            }
        }
        .onAppear {
            loadHeatmapData()
        }
        .sheet(isPresented: $showingClickDetails) {
            if let event = selectedClickEvent {
                ClickEventDetailView(event: event)
            }
        }
    }
    
    // MARK: - Sub Views
    
    private func headerView(primaryColor: Color, secondaryColor: Color) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 6) {
                Text("ヒートマップ分析")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(primaryColor)
                Text("ユーザーのクリック行動を可視化")
                    .font(.subheadline)
                    .foregroundColor(secondaryColor)
            }
            Spacer()
            VStack(spacing: 12) {
                Menu {
                    ForEach(TimeRange.allCases, id: \.self) { range in
                        Button(range.rawValue) {
                            selectedTimeRange = range
                        }
                    }
                } label: {
                    HStack {
                        Text(selectedTimeRange.rawValue)
                            .foregroundColor(primaryColor)
                        Image(systemName: "chevron.down")
                            .font(.caption)
                            .foregroundColor(secondaryColor)
                    }
                }
                .menuStyle(BorderlessButtonMenuStyle())
            }
        }
        .padding(.horizontal, 20)
    }
    
    private func statsOverview(primaryColor: Color) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("クリックヒートマップ")
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(primaryColor)
            let clickEvents = getFilteredClickEvents()
            let stats = calculateStats(from: clickEvents)
            HStack(spacing: 32) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("総クリック数")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(primaryColor)
                    Text("\(stats.totalClicks)回")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(primaryColor)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("ユニーク要素数")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(primaryColor)
                    Text("\(stats.uniqueElements)個")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(primaryColor)
                }
            }
        }
        .padding()
        .background(DesignSystem.cardBackground)
    }
    
    private func heatmapVisualization(primaryColor: Color, cardBackground: Color, cardBorder: Color) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("クリックヒートマップ")
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(primaryColor)
            let clickEvents = getFilteredClickEvents()
            let stats = calculateStats(from: clickEvents)
            HStack(spacing: 32) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("総クリック数")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(primaryColor)
                    Text("\(stats.totalClicks)回")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(primaryColor)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("ユニーク要素数")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(primaryColor)
                    Text("\(stats.uniqueElements)個")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(primaryColor)
                }
            }
        }
        .padding()
        .background(cardBackground)
    }
    
    private func clickDetailsSection(primaryColor: Color, secondaryColor: Color) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("クリック詳細")
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(primaryColor)
            let clickEvents = getFilteredClickEvents()
            if clickEvents.isEmpty {
                Text("クリックデータがありません")
                    .font(.subheadline)
                    .foregroundColor(secondaryColor)
            } else {
                ForEach(getTopClickedElements(from: clickEvents)) { element in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(element.element)
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(primaryColor)
                            Text("\(element.count)回クリック (\(String(format: "%.1f", element.percentage))%)")
                                .font(.caption)
                                .foregroundColor(secondaryColor)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 4) {
                            Text("最終クリック")
                                .font(.caption)
                                .foregroundColor(secondaryColor)
                            Text(element.lastClicked, style: .relative)
                                .font(.caption)
                                .foregroundColor(primaryColor)
                        }
                    }
                }
            }
        }
        .padding()
        .background(DesignSystem.cardBackground)
    }
    
    // MARK: - Data Processing
    
    private func loadHeatmapData() {
        isLoading = true
        errorMessage = nil
        
        // 実際のアプリでは、ここでAPIからデータを取得
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            isLoading = false
        }
    }
    
    private func getFilteredClickEvents() -> [ClickEvent] {
        let allEvents = analyticsManager.clickEvents
        let cutoffDate = Date().addingTimeInterval(-selectedTimeRange.dateInterval)
        
        return allEvents.filter { event in
            if selectedTimeRange == .allTime {
                return event.url.contains(selectedURL)
            } else {
                return event.url.contains(selectedURL) && event.timestamp > cutoffDate
            }
        }
    }
    
    private func calculateStats(from events: [ClickEvent]) -> HeatmapStats {
        let totalClicks = events.count
        let uniqueElements = Set(events.compactMap { $0.elementTag }).count
        
        let avgX = events.isEmpty ? 0 : events.reduce(0) { $0 + $1.x } / events.count
        let avgY = events.isEmpty ? 0 : events.reduce(0) { $0 + $1.y } / events.count
        
        // 前回期間との比較（簡易版）
        let previousEvents = getPreviousPeriodEvents()
        let clickChange = previousEvents.isEmpty ? 0 : Int((Double(totalClicks - previousEvents.count) / Double(previousEvents.count)) * 100)
        let elementChange = previousEvents.isEmpty ? 0 : Int((Double(uniqueElements - Set(previousEvents.compactMap { $0.elementTag }).count) / Double(max(Set(previousEvents.compactMap { $0.elementTag }).count, 1))) * 100)
        let positionChange = 0 // 簡易版
        
        return HeatmapStats(
            totalClicks: totalClicks,
            uniqueElements: uniqueElements,
            avgX: Int(avgX),
            avgY: Int(avgY),
            clickChange: clickChange,
            elementChange: elementChange,
            positionChange: positionChange
        )
    }
    
    private func getPreviousPeriodEvents() -> [ClickEvent] {
        let allEvents = analyticsManager.clickEvents
        let currentCutoff = Date().addingTimeInterval(-selectedTimeRange.dateInterval)
        let previousCutoff = currentCutoff.addingTimeInterval(-selectedTimeRange.dateInterval)
        
        return allEvents.filter { event in
            event.url.contains(selectedURL) && 
            event.timestamp > previousCutoff && 
            event.timestamp <= currentCutoff
        }
    }
    
    private func getTopClickedElements(from events: [ClickEvent]) -> [ClickElementData] {
        let grouped = Dictionary(grouping: events, by: { $0.elementTag })
        
        return grouped.map { element, clicks in
            ClickElementData(
                element: element,
                count: clicks.count,
                percentage: Double(clicks.count) / Double(events.count) * 100,
                lastClicked: clicks.max(by: { $0.timestamp < $1.timestamp })?.timestamp ?? Date()
            )
        }.sorted { $0.count > $1.count }
    }
}

// MARK: - Supporting Types

struct HeatmapStats {
    let totalClicks: Int
    let uniqueElements: Int
    let avgX: Int
    let avgY: Int
    let clickChange: Int
    let elementChange: Int
    let positionChange: Int
}

struct ClickElementData: Identifiable {
    let id = UUID()
    let element: String
    let count: Int
    let percentage: Double
    let lastClicked: Date
}

// MARK: - Supporting Views

struct HeatmapVisualization: View {
    let clickEvents: [ClickEvent]
    let onClickEvent: (ClickEvent) -> Void
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Web page mockup background
                WebPageMockup()
                
                // Heatmap overlay
                HeatmapOverlay(
                    clickEvents: clickEvents,
                    size: geometry.size,
                    onClickEvent: onClickEvent
                )
            }
        }
    }
}

struct WebPageMockup: View {
    @Environment(\.colorScheme) private var colorScheme
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Insight Analytics")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Spacer()
                
                Text("分析ダッシュボード")
                    .font(.subheadline)
                    .foregroundColor(DesignSystem.textSecondary)
            }
            .padding()
            .background(DesignSystem.cardBackground(for: colorScheme))
            
            // Content area
            VStack(spacing: 20) {
                // Navigation
                HStack {
                    ForEach(["ホーム", "分析", "レポート", "設定"], id: \.self) { item in
                        Text(item)
                            .font(.subheadline)
                            .foregroundColor(DesignSystem.textSecondary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                RoundedRectangle(cornerRadius: 6)
                                    .fill(Color.clear)
                            )
                    }
                    Spacer()
                }
                
                // Content blocks
                VStack(spacing: 16) {
                    ForEach(0..<5, id: \.self) { index in
                        let cardBackground = DesignSystem.cardBackground
                        RoundedRectangle(cornerRadius: 8)
                            .fill(cardBackground)
                            .frame(height: 60)
                            .overlay(
                                Text("コンテンツブロック \(index + 1)")
                                    .font(.subheadline)
                                    .foregroundColor(DesignSystem.textSecondary)
                            )
                    }
                }
            }
            .padding()
            
            Spacer()
        }
        .background(DesignSystem.backgroundGradient)
    }
}

struct HeatmapOverlay: View {
    let clickEvents: [ClickEvent]
    let size: CGSize
    let onClickEvent: (ClickEvent) -> Void
    
    var body: some View {
        ZStack {
            // ヒートマップの背景レイヤー
            HeatmapBackground(clickEvents: clickEvents, size: size)
            
            // クリックポイント
            ForEach(clickEvents, id: \.id) { event in
                ClickPoint(event: event, size: size, onClick: onClickEvent)
            }
        }
    }
}

struct HeatmapBackground: View {
    let clickEvents: [ClickEvent]
    let size: CGSize
    
    var body: some View {
        Canvas { context, size in
            // ヒートマップの密度を計算
            let heatmapData = calculateHeatmapDensity(clickEvents: clickEvents, size: size)
            
            // ヒートマップを描画
            for (x, y, intensity) in heatmapData {
                let rect = CGRect(x: x, y: y, width: 10, height: 10)
                let color = Color.red.opacity(intensity)
                context.fill(Path(rect), with: .color(color))
            }
        }
    }
    
    private func calculateHeatmapDensity(clickEvents: [ClickEvent], size: CGSize) -> [(CGFloat, CGFloat, Double)] {
        var densityMap: [String: Int] = [:]
        let gridSize: CGFloat = 10
        
        for event in clickEvents {
            let gridX = Int(CGFloat(event.x) * size.width / 1000 / gridSize)
            let gridY = Int(CGFloat(event.y) * size.height / 800 / gridSize)
            let key = "\(gridX),\(gridY)"
            densityMap[key, default: 0] += 1
        }
        
        let maxDensity = densityMap.values.max() ?? 1
        
        return densityMap.map { key, count in
            let components = key.split(separator: ",")
            let x = CGFloat(Int(components[0]) ?? 0) * gridSize
            let y = CGFloat(Int(components[1]) ?? 0) * gridSize
            let intensity = Double(count) / Double(maxDensity) * 0.8
            return (x, y, intensity)
        }
    }
}

struct ClickPoint: View {
    let event: ClickEvent
    let size: CGSize
    let onClick: (ClickEvent) -> Void
    
    var body: some View {
        Circle()
            .fill(Color.blue.opacity(0.8))
            .frame(width: 12, height: 12)
            .overlay(
                Circle()
                    .stroke(Color.white, lineWidth: 2)
            )
            .position(
                x: CGFloat(event.x) * size.width / 1000,
                y: CGFloat(event.y) * size.height / 800
            )
            .onTapGesture {
                onClick(event)
            }
            .scaleEffect(1.0)
            .animation(.easeInOut(duration: 0.2), value: event.timestamp)
    }
}

struct ClickElementRow: View {
    let element: ClickElementData
    @Environment(\.colorScheme) private var colorScheme
    
    var body: some View {
        ModernCardView {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(element.element)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(DesignSystem.textPrimary)
                    
                    Text("\(element.count)回クリック (\(String(format: "%.1f", element.percentage))%)")
                        .font(.caption)
                        .foregroundColor(DesignSystem.textSecondary(for: colorScheme))
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("最終クリック")
                        .font(.caption)
                        .foregroundColor(DesignSystem.textSecondary(for: colorScheme))
                    
                    Text(element.lastClicked, style: .relative)
                        .font(.caption)
                        .foregroundColor(DesignSystem.textPrimary)
                }
            }
            .padding(DesignSystem.smallPadding)
        }
    }
}

struct ClickEventDetailView: View {
    let event: ClickEvent
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    
    private var eventDetailsBackground: some View {
        RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
            .fill(DesignSystem.cardBackground)
            .overlay(
                RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                    .stroke(DesignSystem.cardBorder, lineWidth: 1)
            )
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                DesignSystem.backgroundGradient
                    .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 20) {
                        // Event details
                        VStack(alignment: .leading, spacing: 16) {
                            Text("クリックイベント詳細")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(DesignSystem.textPrimary)
                            
                            VStack(spacing: 12) {
                                InfoRow(label: "要素", value: event.elementTag)
                                InfoRow(label: "座標", value: "(\(event.x), \(event.y))")
                                InfoRow(label: "URL", value: event.url)
                                InfoRow(label: "セッションID", value: event.sessionId)
                                InfoRow(label: "タイムスタンプ", value: event.timestamp, style: .medium)
                                
                                if let elementId = event.elementId {
                                    InfoRow(label: "要素ID", value: elementId)
                                }
                                
                                if let elementClass = event.elementClass {
                                    InfoRow(label: "要素クラス", value: elementClass)
                                }
                                
                                if let elementText = event.elementText {
                                    InfoRow(label: "要素テキスト", value: elementText)
                                }
                            }
                        }
                        .padding()
                        .background(eventDetailsBackground)
                    }
                    .padding()
                }
            }
            .navigationTitle("イベント詳細")
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
    }
}

 