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
    @EnvironmentObject var reportManager: ReportManager
    @State private var showingNewReportSheet = false
    @State private var selectedReport: Report?
    @State private var showingReportDetail = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 16) {
                    HStack {
                        Text("レポート")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(DesignSystem.textPrimary)
                        
                        Spacer()
                        
                        AnimatedButton(
                            title: "新規レポート",
                            icon: "plus",
                            style: .primary,
                            action: { showingNewReportSheet = true }
                        )
                    }
                    
                    if let errorMessage = reportManager.errorMessage {
                        ErrorView(
                            error: errorMessage,
                            retryAction: {
                                // エラーをクリア
                                reportManager.errorMessage = nil
                            }
                        )
                    }
                }
                .padding(DesignSystem.padding)
                
                // Content
                if reportManager.reports.isEmpty {
                    EmptyStateView(
                        icon: "doc.text.chart",
                        title: "レポートがありません",
                        message: "新しいレポートを作成して、アナリティクスデータを分析しましょう",
                        actionTitle: "レポートを作成",
                        action: { showingNewReportSheet = true }
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(reportManager.reports) { report in
                                ReportCardView(report: report) {
                                    selectedReport = report
                                    showingReportDetail = true
                                }
                            }
                        }
                        .padding(DesignSystem.padding)
                    }
                }
            }
            .background(DesignSystem.backgroundGradient)
            .sheet(isPresented: $showingNewReportSheet) {
                NewReportSheet()
            }
            .sheet(isPresented: $showingReportDetail) {
                if let report = selectedReport {
                    ReportDetailView(report: report)
                }
            }
        }
    }
}

struct ReportCardView: View {
    let report: Report
    let onTap: () -> Void
    @Environment(\.colorScheme) private var colorScheme
    
    var body: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Image(systemName: report.type.icon)
                        .font(.title2)
                        .foregroundColor(DesignSystem.textAccent)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(report.title)
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(DesignSystem.textPrimary)
                        
                        Text(report.description)
                            .font(.subheadline)
                            .foregroundColor(DesignSystem.textSecondary)
                            .lineLimit(2)
                    }
                    
                    Spacer()
                    
                    StatusBadge(status: report.status)
                }
                
                // Quick Stats
                HStack(spacing: 20) {
                    StatItem(
                        title: "ページビュー",
                        value: "\(report.data.pageViews)",
                        icon: "eye.fill"
                    )
                    
                    StatItem(
                        title: "訪問者",
                        value: "\(report.data.uniqueVisitors)",
                        icon: "person.2.fill"
                    )
                    
                    StatItem(
                        title: "コンバージョン",
                        value: "\(report.data.conversions)",
                        icon: "target"
                    )
                    
                    StatItem(
                        title: "売上",
                        value: "¥\(Int(report.data.revenue))",
                        icon: "yensign.circle.fill"
                    )
                }
                
                // Date Range
                HStack {
                    Image(systemName: "calendar")
                        .font(.caption)
                        .foregroundColor(DesignSystem.textSecondary)
                    
                    Text("\(report.dateRange.startDate.formatted(date: .abbreviated, time: .omitted)) - \(report.dateRange.endDate.formatted(date: .abbreviated, time: .omitted))")
                        .font(.caption)
                        .foregroundColor(DesignSystem.textSecondary)
                    
                    Spacer()
                    
                    Text(report.createdAt.formatted(date: .abbreviated, time: .shortened))
                        .font(.caption)
                        .foregroundColor(DesignSystem.textSecondary)
                }
            }
        }
        .onTapGesture {
            onTap()
        }
    }
}

struct StatItem: View {
    let title: String
    let value: String
    let icon: String
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundColor(DesignSystem.textSecondary)
            
            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(DesignSystem.textPrimary)
            
            Text(title)
                .font(.caption)
                .foregroundColor(DesignSystem.textSecondary)
        }
    }
}

struct StatusBadge: View {
    let status: ReportStatus
    
    var body: some View {
        Text(status.rawValue)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                Capsule()
                    .fill(statusColor.opacity(0.2))
            )
            .foregroundColor(statusColor)
    }
    
    private var statusColor: Color {
        switch status {
        case .generating:
            return .orange
        case .generated:
            return .green
        case .failed:
            return .red
        case .scheduled:
            return .blue
        }
    }
}

struct NewReportSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var reportManager: ReportManager
    
    @State private var title = ""
    @State private var description = ""
    @State private var selectedType: ReportType = .weekly
    @State private var startDate = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
    @State private var endDate = Date()
    @State private var isGenerating = false
    
    var body: some View {
        NavigationView {
            Form {
                Section("レポート情報") {
                    TextField("タイトル", text: $title)
                    TextField("説明", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }
                
                Section("レポートタイプ") {
                    Picker("タイプ", selection: $selectedType) {
                        ForEach(ReportType.allCases, id: \.self) { type in
                            HStack {
                                Image(systemName: type.icon)
                                Text(type.rawValue)
                            }
                            .tag(type)
                        }
                    }
                    .pickerStyle(.menu)
                }
                
                Section("期間") {
                    DatePicker("開始日", selection: $startDate, displayedComponents: .date)
                    DatePicker("終了日", selection: $endDate, displayedComponents: .date)
                }
                
                Section {
                    HStack {
                        Text("期間")
                        Spacer()
                        Text("\(Calendar.current.dateComponents([.day], from: startDate, to: endDate).day ?? 0)日間")
                            .foregroundColor(DesignSystem.textSecondary)
                    }
                }
            }
            .navigationTitle("新規レポート")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("キャンセル") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("生成") {
                        generateReport()
                    }
                    .disabled(title.isEmpty || isGenerating)
                }
            }
        }
        .onChange(of: selectedType) { oldValue, newValue in
            updateDateRange(for: newValue)
        }
    }
    
    private func updateDateRange(for type: ReportType) {
        let calendar = Calendar.current
        let now = Date()
        
        switch type {
        case .daily:
            startDate = calendar.startOfDay(for: now)
            endDate = now
        case .weekly:
            startDate = calendar.date(byAdding: .day, value: -7, to: now) ?? now
            endDate = now
        case .monthly:
            startDate = calendar.date(byAdding: .month, value: -1, to: now) ?? now
            endDate = now
        case .custom:
            // カスタムの場合は変更しない
            break
        }
    }
    
    private func generateReport() {
        guard !title.isEmpty else { return }
        
        isGenerating = true
        
        let dateRange = DateRange(startDate: startDate, endDate: endDate)
        
        Task {
            await reportManager.generateReport(
                title: title,
                description: description,
                type: selectedType,
                dateRange: dateRange
            )
            
            await MainActor.run {
                isGenerating = false
                dismiss()
            }
        }
    }
}

struct ReportDetailView: View {
    let report: Report
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var reportManager: ReportManager
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(alignment: .leading, spacing: 16) {
                        HStack {
                            Image(systemName: report.type.icon)
                                .font(.title)
                                .foregroundColor(DesignSystem.textAccent)
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text(report.title)
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(DesignSystem.textPrimary)
                                
                                Text(report.description)
                                    .font(.subheadline)
                                    .foregroundColor(DesignSystem.textSecondary)
                            }
                            
                            Spacer()
                        }
                        
                        HStack {
                            StatusBadge(status: report.status)
                            Spacer()
                            Text("生成日: \(report.createdAt.formatted())")
                                .font(.caption)
                                .foregroundColor(DesignSystem.textSecondary)
                        }
                    }
                    .padding(DesignSystem.padding)
                    .background(
                        RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                            .fill(DesignSystem.cardBackground)
                    )
                    
                    // Summary Cards
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 16) {
                        SummaryCard(
                            title: "ページビュー",
                            value: "\(report.data.pageViews)",
                            icon: "eye.fill",
                            color: .blue
                        )
                        
                        SummaryCard(
                            title: "ユニーク訪問者",
                            value: "\(report.data.uniqueVisitors)",
                            icon: "person.2.fill",
                            color: .green
                        )
                        
                        SummaryCard(
                            title: "コンバージョン",
                            value: "\(report.data.conversions)",
                            icon: "target",
                            color: .purple
                        )
                        
                        SummaryCard(
                            title: "売上",
                            value: "¥\(Int(report.data.revenue))",
                            icon: "yensign.circle.fill",
                            color: .orange
                        )
                    }
                    
                    // Top Pages
                    if !report.data.topPages.isEmpty {
                        ModernCardView {
                            VStack(alignment: .leading, spacing: 16) {
                                Text("トップページ")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(DesignSystem.textPrimary)
                                
                                ForEach(Array(report.data.topPages.prefix(5).enumerated()), id: \.element.url) { index, page in
                                    HStack {
                                        Text("\(index + 1)")
                                            .font(.caption)
                                            .fontWeight(.semibold)
                                            .foregroundColor(DesignSystem.textSecondary)
                                            .frame(width: 20)
                                        
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(page.title)
                                                .font(.subheadline)
                                                .fontWeight(.medium)
                                                .foregroundColor(DesignSystem.textPrimary)
                                            
                                            Text(page.url)
                                                .font(.caption)
                                                .foregroundColor(DesignSystem.textSecondary)
                                                .lineLimit(1)
                                        }
                                        
                                        Spacer()
                                        
                                        VStack(alignment: .trailing, spacing: 2) {
                                            Text("\(page.views)")
                                                .font(.subheadline)
                                                .fontWeight(.semibold)
                                                .foregroundColor(DesignSystem.textPrimary)
                                            
                                            Text("ビュー")
                                                .font(.caption)
                                                .foregroundColor(DesignSystem.textSecondary)
                                        }
                                    }
                                    
                                    if index < min(4, report.data.topPages.count - 1) {
                                        Divider()
                                    }
                                }
                            }
                        }
                    }
                    
                    // Device Breakdown
                    if !report.data.deviceBreakdown.isEmpty {
                        ModernCardView {
                            VStack(alignment: .leading, spacing: 16) {
                                Text("デバイス別内訳")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(DesignSystem.textPrimary)
                                
                                Chart {
                                    ForEach(report.data.deviceBreakdown, id: \.device) { device in
                                        SectorMark(
                                            angle: .value("セッション", device.sessions),
                                            innerRadius: .ratio(0.6),
                                            angularInset: 2
                                        )
                                        .foregroundStyle(by: .value("デバイス", device.device))
                                    }
                                }
                                .frame(height: 200)
                                .chartLegend(position: .bottom, alignment: .center)
                            }
                        }
                    }
                }
                .padding(DesignSystem.padding)
            }
            .background(DesignSystem.backgroundGradient)
            .navigationTitle("レポート詳細")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button("CSVエクスポート") {
                            exportReport()
                        }
                        
                        Button("削除", role: .destructive) {
                            deleteReport()
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
                
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("閉じる") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private func exportReport() {
        let csv = reportManager.exportReport(report)
        // ここでCSVファイルを保存または共有する処理を実装
        print("CSV Export:\n\(csv)")
    }
    
    private func deleteReport() {
        reportManager.deleteReport(report)
        dismiss()
    }
}

struct SummaryCard: View {
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

#Preview {
    ReportView()
        .environmentObject(ReportManager(analyticsManager: AnalyticsManager(), websiteManager: WebsiteManager()))
} 