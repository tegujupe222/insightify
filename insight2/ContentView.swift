import SwiftUI
import Charts

struct ContentView: View {
    @EnvironmentObject var analyticsManager: AnalyticsManager
    @State private var selectedTab: AnalyticsTab = .dashboard
    @State private var animateSidebar = false
    
    enum AnalyticsTab: String, CaseIterable {
        case dashboard = "ダッシュボード"
        case heatmap = "ヒートマップ"
        case abTest = "A/Bテスト"
        case funnel = "ファネル分析"
        case tracking = "トラッキング"
        case webview = "ウェブサイト"
        case websites = "Webサイト管理"
        case apiServer = "APIサーバー"
        case reports = "レポート"
        
        var icon: String {
            switch self {
            case .dashboard: return "chart.bar.fill"
            case .heatmap: return "flame.fill"
            case .abTest: return "arrow.left.arrow.right"
            case .funnel: return "chart.bar.fill"
            case .tracking: return "antenna.radiowaves.left.and.right"
            case .webview: return "globe"
            case .websites: return "globe"
            case .apiServer: return "server.rack"
            case .reports: return "doc.text.fill"
            }
        }
        
        var color: Color {
            switch self {
            case .dashboard: return .blue
            case .heatmap: return .orange
            case .abTest: return .purple
            case .funnel: return .green
            case .tracking: return .cyan
            case .webview: return .indigo
            case .websites: return .teal
            case .apiServer: return .red
            case .reports: return .mint
            }
        }
        
        var description: String {
            switch self {
            case .dashboard: return "アナリティクス概要とリアルタイムデータ"
            case .heatmap: return "ユーザーのクリックとスクロール行動"
            case .abTest: return "A/Bテストの管理と分析"
            case .funnel: return "コンバージョンファネルの分析"
            case .tracking: return "トラッキングスクリプトの管理"
            case .webview: return "ウェブサイトのプレビュー"
            case .websites: return "ウェブサイトの管理"
            case .apiServer: return "APIサーバーの設定"
            case .reports: return "レポートの生成と管理"
            }
        }
    }
    
    var body: some View {
        ZStack {
            DesignSystem.backgroundGradient
                .ignoresSafeArea()
            
            NavigationSplitView {
                SidebarView(selectedTab: $selectedTab, animateSidebar: $animateSidebar)
            } detail: {
                DetailView(selectedTab: selectedTab)
            }
            .navigationSplitViewStyle(.balanced)
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.8)) {
                animateSidebar = true
            }
        }
    }
}

struct SidebarView: View {
    @Binding var selectedTab: ContentView.AnalyticsTab
    @Binding var animateSidebar: Bool
    @Environment(\.colorScheme) private var colorScheme
    
    private var headerBackground: some View {
        RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
            .fill(Color.blue.opacity(0.1))
            .overlay(
                RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                    .stroke(Color.blue.opacity(0.3), lineWidth: 1)
            )
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 16) {
                HStack {
                    Image(systemName: "chart.bar.xaxis")
                        .font(.title)
                        .foregroundColor(DesignSystem.textAccent(for: colorScheme))
                        .scaleEffect(animateSidebar ? 1.0 : 0.8)
                        .animation(.easeOut(duration: 0.6).delay(0.1), value: animateSidebar)
                    
                    Text("insight")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(DesignSystem.textPrimary(for: colorScheme))
                        .opacity(animateSidebar ? 1 : 0)
                        .animation(.easeOut(duration: 0.6).delay(0.2), value: animateSidebar)
                    
                    Spacer()
                }
                
                Text("Web Analytics Platform")
                    .font(.subheadline)
                    .foregroundColor(DesignSystem.textSecondary(for: colorScheme))
                    .opacity(animateSidebar ? 1 : 0)
                    .animation(.easeOut(duration: 0.6).delay(0.3), value: animateSidebar)
            }
            .padding(DesignSystem.padding)
            .background(headerBackground)
            .padding(.horizontal, DesignSystem.padding)
            .padding(.top)
            
            // Navigation List
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(Array(ContentView.AnalyticsTab.allCases.enumerated()), id: \.element) { index, tab in
                        Button(action: {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                selectedTab = tab
                            }
                        }) {
                            SidebarItemView(
                                tab: tab,
                                isSelected: selectedTab == tab,
                                delay: Double(index) * 0.1
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                        .opacity(animateSidebar ? 1 : 0)
                        .offset(x: animateSidebar ? 0 : -50)
                        .animation(.easeOut(duration: 0.6).delay(0.4 + Double(index) * 0.1), value: animateSidebar)
                    }
                }
                .padding(.horizontal, DesignSystem.padding)
                .padding(.top, 24)
            }
            .scrollContentBackground(.hidden)
        }
        .background(Color.white)
    }
}

struct SidebarItemView: View {
    let tab: ContentView.AnalyticsTab
    let isSelected: Bool
    let delay: Double
    @Environment(\.colorScheme) private var colorScheme
    
    @State private var isHovered = false
    
    private var itemBackground: some View {
        RoundedRectangle(cornerRadius: DesignSystem.smallCornerRadius)
            .fill(isSelected ? tab.color.opacity(0.15) : (isHovered ? Color.gray.opacity(0.1) : Color.clear))
            .overlay(
                RoundedRectangle(cornerRadius: DesignSystem.smallCornerRadius)
                    .stroke(isSelected ? tab.color.opacity(0.6) : Color.clear, lineWidth: 2)
            )
    }
    
    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: tab.icon)
                .font(.title2)
                .foregroundColor(isSelected ? tab.color : DesignSystem.textSecondary(for: colorScheme))
                .frame(width: 24)
                .scaleEffect(isHovered ? 1.2 : 1.0)
                .animation(.easeInOut(duration: 0.2), value: isHovered)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(tab.rawValue)
                    .font(.subheadline)
                    .foregroundColor(isSelected ? DesignSystem.textPrimary(for: colorScheme) : DesignSystem.textSecondary(for: colorScheme))
                    .fontWeight(isSelected ? .semibold : .medium)
                
                Text(tab.description)
                    .font(.caption)
                    .foregroundColor(DesignSystem.textSecondary(for: colorScheme))
                    .lineLimit(1)
            }
            
            Spacer()
            
            if isSelected {
                Circle()
                    .fill(tab.color)
                    .frame(width: 8, height: 8)
                    .scaleEffect(isHovered ? 1.3 : 1.0)
                    .animation(.easeInOut(duration: 0.2), value: isHovered)
            }
        }
        .padding(.vertical, 16)
        .padding(.horizontal, 20)
        .background(itemBackground)
        .scaleEffect(isHovered ? 1.03 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: isHovered)
        .onHover { hovering in
            isHovered = hovering
        }
    }
}

struct DetailView: View {
    let selectedTab: ContentView.AnalyticsTab
    @State private var animateContent = false
    
    var body: some View {
        Group {
            switch selectedTab {
            case .dashboard:
                DashboardView()
            case .heatmap:
                HeatmapView()
            case .abTest:
                ABTestView()
            case .funnel:
                FunnelView()
            case .tracking:
                TrackingScriptView()
            case .webview:
                WebViewWrapper()
            case .websites:
                WebsiteManagementView()
            case .apiServer:
                APIServerView()
            case .reports:
                ReportView()
            }
        }
        .navigationTitle(selectedTab.rawValue)
        .opacity(animateContent ? 1 : 0)
        .scaleEffect(animateContent ? 1 : 0.95)
        .animation(.easeOut(duration: 0.4), value: selectedTab)
        .onAppear {
            withAnimation(.easeOut(duration: 0.4)) {
                animateContent = true
            }
        }
        .onChange(of: selectedTab) { oldValue, newValue in
            animateContent = false
            withAnimation(.easeOut(duration: 0.4)) {
                animateContent = true
            }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AnalyticsManager())
} 
