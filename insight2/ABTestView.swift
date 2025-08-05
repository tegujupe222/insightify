import SwiftUI
import Charts

struct ABTestView: View {
    @EnvironmentObject var analyticsManager: AnalyticsManager
    @Environment(\.colorScheme) private var colorScheme
    @State private var showingCreateTest = false
    @State private var selectedTest: ABTest?
    @State private var showingTestDetails = false
    @State private var testToDelete: ABTest?
    @State private var showingDeleteAlert = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        ZStack {
            DesignSystem.backgroundGradient
                .ignoresSafeArea()
            
            VStack(spacing: 24) {
                headerView
                
                if isLoading {
                    LoadingView(message: "A/Bテストデータを読み込み中...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = errorMessage {
                    ErrorView(
                        error: error,
                        retryAction: {
                            loadABTestData()
                        }
                    )
                } else {
                    ScrollView {
                        VStack(spacing: 20) {
                            statsOverview
                            testsListView
                        }
                        .padding(.horizontal, 20)
                    }
                }
            }
        }
        .onAppear {
            loadABTestData()
        }
        .sheet(isPresented: $showingCreateTest) {
            CreateABTestView()
        }
        .sheet(isPresented: $showingTestDetails) {
            if let test = selectedTest {
                ABTestDetailsView(test: test)
            }
        }
        .alert("テストを削除", isPresented: $showingDeleteAlert) {
            Button("削除", role: .destructive) {
                if let test = testToDelete {
                    deleteTest(test)
                }
            }
            Button("キャンセル", role: .cancel) { }
        } message: {
            Text("このテストを削除しますか？この操作は元に戻せません。")
        }
    }
    
    // MARK: - Sub Views
    
    private var headerView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 6) {
                Text("A/Bテスト管理")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(DesignSystem.textPrimary)
                
                Text("テストの作成、管理、分析")
                    .font(.subheadline)
                    .foregroundColor(DesignSystem.textSecondary)
            }
            
            Spacer()
            
            AnimatedButton(
                title: "新しいテスト",
                icon: "plus",
                style: .primary,
                action: {
                    showingCreateTest = true
                }
            )
        }
        .padding(.horizontal, 20)
    }
    
    private var statsOverview: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 16) {
            let stats = getTestStats()
            
            AnimatedMetricCard(
                title: "アクティブテスト",
                value: "\(stats.activeTests)",
                subtitle: "実行中のテスト",
                change: "\(stats.activeChange)%",
                isPositive: stats.activeChange >= 0,
                icon: "play.circle.fill",
                gradient: DesignSystem.primaryGradient,
                isLoading: false
            )
            
            AnimatedMetricCard(
                title: "総テスト数",
                value: "\(stats.totalTests)",
                subtitle: "作成されたテスト",
                change: "\(stats.totalChange)%",
                isPositive: stats.totalChange >= 0,
                icon: "chart.bar.fill",
                gradient: DesignSystem.secondaryGradient,
                isLoading: false
            )
            
            AnimatedMetricCard(
                title: "平均改善率",
                value: "\(String(format: "%.1f", stats.averageImprovement))%",
                subtitle: "コンバージョン向上",
                change: "\(stats.improvementChange)%",
                isPositive: stats.improvementChange >= 0,
                icon: "arrow.up.circle.fill",
                gradient: DesignSystem.accentGradient,
                isLoading: false
            )
        }
    }
    
    private var testsListView: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("A/Bテスト一覧")
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(DesignSystem.textPrimary)
            
            let tests = analyticsManager.abTests
            
            if tests.isEmpty {
                EmptyStateView(
                    icon: "arrow.left.arrow.right",
                    title: "A/Bテストがありません",
                    message: "「新しいテスト」ボタンをタップして、最初のA/Bテストを作成してください。",
                    actionTitle: "新しいテストを作成",
                    action: {
                        showingCreateTest = true
                    }
                )
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(tests.sorted(by: { $0.startDate > $1.startDate })) { test in
                        ABTestCard(
                            test: test,
                            onTap: {
                                selectedTest = test
                                showingTestDetails = true
                            },
                            onDelete: {
                                testToDelete = test
                                showingDeleteAlert = true
                            }
                        )
                    }
                }
            }
        }
    }
    
    // MARK: - Data Processing
    
    private func loadABTestData() {
        isLoading = true
        errorMessage = nil
        
        // 実際のアプリでは、ここでAPIからデータを取得
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            isLoading = false
        }
    }
    
    private func getTestStats() -> ABTestStats {
        let tests = analyticsManager.abTests
        let activeTests = tests.filter { $0.status == .running }.count
        let totalTests = tests.count
        
        let completedTests = tests.filter { $0.status == .completed }
        let averageImprovement = completedTests.isEmpty ? 0.0 : 
            completedTests.reduce(0.0) { $0 + calculateTestImprovement($1) } / Double(completedTests.count)
        
        // 前回期間との比較（簡易版）
        let previousTests = getPreviousPeriodTests()
        let activeChange = previousTests.isEmpty ? 0 : Int((Double(activeTests - previousTests.filter { $0.status == .running }.count) / Double(max(previousTests.count, 1))) * 100)
        let totalChange = previousTests.isEmpty ? 0 : Int((Double(totalTests - previousTests.count) / Double(max(previousTests.count, 1))) * 100)
        let improvementChange = 0 // 簡易版
        
        return ABTestStats(
            activeTests: activeTests,
            totalTests: totalTests,
            averageImprovement: averageImprovement,
            activeChange: activeChange,
            totalChange: totalChange,
            improvementChange: improvementChange
        )
    }
    
    private func getPreviousPeriodTests() -> [ABTest] {
        let allTests = analyticsManager.abTests
        let cutoffDate = Date().addingTimeInterval(-30 * 24 * 60 * 60) // 30日前
        
        return allTests.filter { $0.startDate < cutoffDate }
    }
    
    private func calculateTestImprovement(_ test: ABTest) -> Double {
        let variants = test.variants
        guard variants.count >= 2 else { return 0.0 }
        
        // コントロールバリアントを特定
        let controlVariant = variants.first { $0.name.contains("コントロール") || $0.name.contains("Control") || $0.name.contains("Original") }
        let testVariants = variants.filter { !$0.name.contains("コントロール") && !$0.name.contains("Control") && !$0.name.contains("Original") }
        
        guard let control = controlVariant, !testVariants.isEmpty else { return 0.0 }
        
        let controlRate = control.conversionRate
        let controlVisitors = control.visitors
        
        // 統計的有意性を計算
        let improvements = testVariants.map { variant in
            let testRate = variant.conversionRate
            let testVisitors = variant.visitors
            
            if controlRate == 0 || controlVisitors == 0 || testVisitors == 0 { return 0.0 }
            
            // 改善率を計算
            let improvement = ((testRate - controlRate) / controlRate) * 100
            
            // 統計的有意性を考慮（簡易版）
            let significance = calculateStatisticalSignificance(
                controlRate: controlRate,
                controlVisitors: controlVisitors,
                testRate: testRate,
                testVisitors: testVisitors
            )
            
            return significance > 0.95 ? improvement : 0.0
        }
        
        return improvements.isEmpty ? 0.0 : improvements.reduce(0, +) / Double(improvements.count)
    }
    
    private func calculateStatisticalSignificance(controlRate: Double, controlVisitors: Int, testRate: Double, testVisitors: Int) -> Double {
        // 簡易的な統計的有意性計算（Z-test）
        let controlConversions = Int(controlRate * Double(controlVisitors) / 100)
        let testConversions = Int(testRate * Double(testVisitors) / 100)
        
        let pooledRate = Double(controlConversions + testConversions) / Double(controlVisitors + testVisitors)
        let standardError = sqrt(pooledRate * (1 - pooledRate) * (1.0/Double(controlVisitors) + 1.0/Double(testVisitors)))
        
        let zScore = (testRate - controlRate) / (standardError * 100)
        
        // 正規分布の累積分布関数（簡易版）
        return 1.0 - (1.0 / (1.0 + exp(-zScore)))
    }
    
    private func deleteTest(_ test: ABTest) {
        analyticsManager.abTests.removeAll { $0.id == test.id }
        // 実際のアプリでは、ここでAPIに削除リクエストを送信
    }
}

// MARK: - Supporting Types

struct ABTestStats {
    let activeTests: Int
    let totalTests: Int
    let averageImprovement: Double
    let activeChange: Int
    let totalChange: Int
    let improvementChange: Int
}

// MARK: - Supporting Views

struct ABTestCard: View {
    let test: ABTest
    let onTap: () -> Void
    let onDelete: () -> Void
    
    var body: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(test.name)
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(DesignSystem.textPrimary)
                        
                        Text(test.description)
                            .font(.subheadline)
                            .foregroundColor(DesignSystem.textSecondary)
                            .lineLimit(2)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        StatusBadge(status: test.status)
                        
                        Text(test.startDate, style: .date)
                            .font(.caption)
                            .foregroundColor(DesignSystem.textSecondary)
                    }
                }
                
                // Test progress
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("進捗")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(DesignSystem.textSecondary)
                        
                        Spacer()
                        
                        Text("\(test.variants.count) バリアント")
                            .font(.caption)
                            .foregroundColor(DesignSystem.textSecondary)
                    }
                    
                    HStack(spacing: 4) {
                        Rectangle()
                            .fill(DesignSystem.textAccent)
                            .frame(width: max(0, CGFloat(getTestProgress(test)) * 200), height: 8)
                            .animation(.easeInOut(duration: 0.5), value: getTestProgress(test))
                        
                        Spacer()
                    }
                    .frame(height: 8)
                    .background(Color.gray.opacity(0.2))
                    .cornerRadius(4)
                }
                
                // Action buttons
                HStack {
                    AnimatedButton(
                        title: "詳細",
                        icon: "eye",
                        style: .secondary,
                        action: onTap
                    )
                    
                    Spacer()
                    
                    if test.status == .running {
                        AnimatedButton(
                            title: "停止",
                            icon: "stop",
                            style: .danger,
                            action: {
                                // テストを停止する処理
                            }
                        )
                    } else {
                        AnimatedButton(
                            title: "削除",
                            icon: "trash",
                            style: .danger,
                            action: onDelete
                        )
                    }
                }
            }
            .padding(DesignSystem.smallPadding)
        }
        .onTapGesture {
            onTap()
        }
    }
    
    private func getTestProgress(_ test: ABTest) -> Double {
        let totalDuration = test.endDate?.timeIntervalSince(test.startDate) ?? 30 * 24 * 60 * 60
        let elapsed = Date().timeIntervalSince(test.startDate)
        return min(max(elapsed / totalDuration, 0), 1)
    }
}

struct StatusBadge: View {
    let status: ABTestStatus
    
    var body: some View {
        Text(status.displayName)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                RoundedRectangle(cornerRadius: 4)
                    .fill(status.color.opacity(0.2))
            )
            .foregroundColor(status.color)
    }
}

extension ABTestStatus {
    var displayName: String {
        return self.rawValue
    }
    
    var color: Color {
        switch self {
        case .draft: return .gray
        case .running: return .green
        case .paused: return .orange
        case .completed: return .blue
        }
    }
}

struct CreateABTestView: View {
    @EnvironmentObject var analyticsManager: AnalyticsManager
    @Environment(\.dismiss) private var dismiss
    @State private var testName = ""
    @State private var testDescription = ""
    @State private var conversionGoal = ""
    @State private var trafficSplit = 50.0
    @State private var variants: [ABTestVariant] = []
    @State private var showingAddVariant = false
    @State private var isLoading = false
    
    var body: some View {
        NavigationView {
            ZStack {
                DesignSystem.backgroundGradient
                    .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 20) {
                        // Basic info
                        VStack(alignment: .leading, spacing: 16) {
                            Text("テスト基本情報")
                                .font(.headline)
                                .fontWeight(.semibold)
                                .foregroundColor(DesignSystem.textPrimary)
                            
                            VStack(spacing: 12) {
                                TextField("テスト名", text: $testName)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                
                                TextField("説明", text: $testDescription, axis: .vertical)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .lineLimit(3...6)
                                
                                TextField("コンバージョン目標", text: $conversionGoal)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                            }
                        }
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                                .fill(DesignSystem.cardBackground)
                                .overlay(
                                    RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                                        .stroke(DesignSystem.cardBorder, lineWidth: 1)
                                )
                        )
                        
                        // Traffic split
                        VStack(alignment: .leading, spacing: 16) {
                            Text("トラフィック分割")
                                .font(.headline)
                                .fontWeight(.semibold)
                                .foregroundColor(DesignSystem.textPrimary)
                            
                            VStack(spacing: 12) {
                                HStack {
                                    Text("テストグループ: \(Int(trafficSplit))%")
                                        .font(.subheadline)
                                        .foregroundColor(DesignSystem.textSecondary)
                                    
                                    Spacer()
                                    
                                    Text("コントロール: \(Int(100 - trafficSplit))%")
                                        .font(.subheadline)
                                        .foregroundColor(DesignSystem.textSecondary)
                                }
                                
                                Slider(value: $trafficSplit, in: 10...90, step: 5)
                                    .accentColor(DesignSystem.textAccent)
                            }
                        }
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                                .fill(DesignSystem.cardBackground)
                                .overlay(
                                    RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                                        .stroke(DesignSystem.cardBorder, lineWidth: 1)
                                )
                        )
                        
                        // Variants
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Text("バリアント")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(DesignSystem.textPrimary)
                                
                                Spacer()
                                
                                AnimatedButton(
                                    title: "追加",
                                    icon: "plus",
                                    style: .primary,
                                    action: {
                                        showingAddVariant = true
                                    }
                                )
                            }
                            
                            if variants.isEmpty {
                                EmptyStateView(
                                    icon: "rectangle.stack",
                                    title: "バリアントがありません",
                                    message: "「追加」ボタンをタップしてバリアントを追加してください。",
                                    actionTitle: "バリアントを追加",
                                    action: {
                                        showingAddVariant = true
                                    }
                                )
                            } else {
                                LazyVStack(spacing: 12) {
                                    ForEach(variants.indices, id: \.self) { index in
                                        VariantCard(variant: variants[index])
                                    }
                                }
                            }
                        }
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                                .fill(DesignSystem.cardBackground)
                                .overlay(
                                    RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                                        .stroke(DesignSystem.cardBorder, lineWidth: 1)
                                )
                        )
                    }
                    .padding()
                }
            }
            .navigationTitle("新しいA/Bテスト")
            .toolbar {
                ToolbarItem(placement: .automatic) {
                    AnimatedButton(
                        title: "キャンセル",
                        icon: "xmark",
                        style: .secondary,
                        action: {
                            dismiss()
                        }
                    )
                }
                
                ToolbarItem(placement: .automatic) {
                    AnimatedButton(
                        title: "作成",
                        icon: "checkmark",
                        style: .primary,
                        isLoading: isLoading,
                        action: createTest
                    )
                }
            }
        }
        .sheet(isPresented: $showingAddVariant) {
            AddVariantView { variant in
                variants.append(variant)
            }
        }
    }
    
    private func createTest() {
        guard !testName.isEmpty && !variants.isEmpty else { return }
        
        isLoading = true
        
        let newTest = ABTest(
            name: testName,
            description: testDescription,
            startDate: Date(),
            endDate: Calendar.current.date(byAdding: .day, value: 30, to: Date()),
            status: .draft,
            variants: variants,
            trafficSplit: trafficSplit / 100,
            conversionGoal: conversionGoal
        )
        
        analyticsManager.abTests.append(newTest)
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            isLoading = false
            dismiss()
        }
    }
}

struct VariantCard: View {
    let variant: ABTestVariant
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(variant.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(DesignSystem.textPrimary)
                
                Text(variant.description)
                    .font(.caption)
                    .foregroundColor(DesignSystem.textSecondary)
                    .lineLimit(2)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text("\(Int(variant.conversionRate))%")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(DesignSystem.textPrimary)
                
                Text("コンバージョン率")
                    .font(.caption)
                    .foregroundColor(DesignSystem.textSecondary)
            }
        }
        .padding(DesignSystem.smallPadding)
        .background(
            RoundedRectangle(cornerRadius: DesignSystem.smallCornerRadius)
                .fill(DesignSystem.cardBackground.opacity(0.5))
        )
    }
}

struct AddVariantView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var description = ""
    @State private var conversionRate = 0.0
    let onAdd: (ABTestVariant) -> Void
    
    var body: some View {
        NavigationView {
            ZStack {
                DesignSystem.backgroundGradient
                    .ignoresSafeArea()
                
                VStack(spacing: 20) {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("バリアント情報")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(DesignSystem.textPrimary)
                        
                        VStack(spacing: 12) {
                            TextField("バリアント名", text: $name)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                            
                            TextField("説明", text: $description, axis: .vertical)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .lineLimit(3...6)
                            
                            HStack {
                                Text("コンバージョン率: \(Int(conversionRate))%")
                                    .font(.subheadline)
                                    .foregroundColor(DesignSystem.textSecondary)
                                
                                Spacer()
                            }
                            
                            Slider(value: $conversionRate, in: 0...100, step: 1)
                                .accentColor(DesignSystem.textAccent)
                        }
                    }
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                            .fill(DesignSystem.cardBackground)
                            .overlay(
                                RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                                    .stroke(DesignSystem.cardBorder, lineWidth: 1)
                            )
                    )
                    
                    Spacer()
                }
                .padding()
            }
            .navigationTitle("バリアント追加")
            .toolbar {
                ToolbarItem(placement: .automatic) {
                    AnimatedButton(
                        title: "キャンセル",
                        icon: "xmark",
                        style: .secondary,
                        action: {
                            dismiss()
                        }
                    )
                }
                
                ToolbarItem(placement: .automatic) {
                    AnimatedButton(
                        title: "追加",
                        icon: "checkmark",
                        style: .primary,
                        action: {
                            let variant = ABTestVariant(
                                name: name,
                                description: description,
                                visitors: 0,
                                conversions: 0,
                                conversionRate: conversionRate,
                                revenue: nil,
                                changes: nil
                            )
                            onAdd(variant)
                            dismiss()
                        }
                    )
                }
            }
        }
    }
}

struct ABTestDetailsView: View {
    let test: ABTest
    @Environment(\.dismiss) private var dismiss
    
    private var testInfoCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("テスト情報")
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(DesignSystem.textPrimary)
            
            VStack(spacing: 12) {
                InfoRow(label: "テスト名", value: test.name)
                InfoRow(label: "説明", value: test.description)
                InfoRow(label: "ステータス", value: test.status.displayName)
                                                InfoRow(label: "開始日", value: test.startDate, style: .medium)
                                if let endDate = test.endDate {
                                    InfoRow(label: "終了日", value: endDate, style: .medium)
                                }
                InfoRow(label: "コンバージョン目標", value: test.conversionGoal)
                InfoRow(label: "トラフィック分割", value: "\(Int(test.trafficSplit * 100))%")
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                .fill(DesignSystem.cardBackground)
                .overlay(
                    RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                        .stroke(DesignSystem.cardBorder, lineWidth: 1)
                )
        )
    }
    
    private var variantsPerformanceCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("バリアント性能")
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(DesignSystem.textPrimary)
            
            LazyVStack(spacing: 12) {
                ForEach(test.variants, id: \.name) { variant in
                    VariantPerformanceCard(variant: variant)
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                .fill(DesignSystem.cardBackground)
                .overlay(
                    RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                        .stroke(DesignSystem.cardBorder, lineWidth: 1)
                )
        )
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                DesignSystem.backgroundGradient
                    .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 20) {
                        testInfoCard
                        variantsPerformanceCard
                    }
                    .padding()
                }
            }
            .navigationTitle("テスト詳細")
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

struct VariantPerformanceCard: View {
    let variant: ABTestVariant
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(variant.name)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(DesignSystem.textPrimary)
                
                Spacer()
                
                Text("\(Int(variant.conversionRate))%")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(DesignSystem.textAccent)
            }
            
            VStack(spacing: 8) {
                HStack {
                    Text("訪問者: \(variant.visitors)")
                        .font(.caption)
                        .foregroundColor(DesignSystem.textSecondary)
                    
                    Spacer()
                    
                    Text("コンバージョン: \(variant.conversions)")
                        .font(.caption)
                        .foregroundColor(DesignSystem.textSecondary)
                }
                
                HStack(spacing: 4) {
                    Rectangle()
                        .fill(DesignSystem.textAccent)
                        .frame(width: max(0, CGFloat(variant.conversionRate / 100) * 200), height: 8)
                        .animation(.easeInOut(duration: 0.5), value: variant.conversionRate)
                    
                    Spacer()
                }
                .frame(height: 8)
                .background(Color.gray.opacity(0.2))
                .cornerRadius(4)
            }
        }
        .padding(DesignSystem.smallPadding)
        .background(
            RoundedRectangle(cornerRadius: DesignSystem.smallCornerRadius)
                .fill(DesignSystem.cardBackground.opacity(0.5))
        )
    }
}