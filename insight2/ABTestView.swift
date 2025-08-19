import SwiftUI
import Charts

struct ABTestView: View {
    @EnvironmentObject var analyticsManager: AnalyticsManager
    @State private var showingNewTestSheet = false
    @State private var selectedTest: ABTest?
    @State private var showingTestDetail = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 16) {
                    HStack {
                        Text("A/Bテスト")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(DesignSystem.textPrimary)
                        
                        Spacer()
                        
                        AnimatedButton(
                            title: "新規テスト",
                            icon: "plus",
                            style: .primary,
                            action: { showingNewTestSheet = true }
                        )
                    }
                    
                    Text("異なるバリアントをテストして、最適なユーザー体験を見つけましょう")
                        .font(.subheadline)
                        .foregroundColor(DesignSystem.textSecondary)
                        .multilineTextAlignment(.leading)
                }
                .padding(DesignSystem.padding)
                
                // Content
                if analyticsManager.abTests.isEmpty {
                    EmptyStateView(
                        icon: "arrow.left.arrow.right",
                        title: "A/Bテストがありません",
                        message: "最初のA/Bテストを作成して、ユーザー体験を最適化しましょう",
                        actionTitle: "テストを作成",
                        action: { showingNewTestSheet = true }
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(analyticsManager.abTests) { test in
                                ABTestCard(test: test) {
                                    selectedTest = test
                                    showingTestDetail = true
                                }
                            }
                        }
                        .padding(DesignSystem.padding)
                    }
                }
            }
            .background(DesignSystem.backgroundGradient)
            .sheet(isPresented: $showingNewTestSheet) {
                NewABTestSheet()
            }
            .sheet(isPresented: $showingTestDetail) {
                if let test = selectedTest {
                    ABTestDetailView(test: test)
                }
            }
        }
    }
}

struct ABTestCard: View {
    let test: ABTest
    let onTap: () -> Void
    @EnvironmentObject var analyticsManager: AnalyticsManager
    
    var body: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 16) {
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
                    
                    StatusBadge(status: test.status)
                }
                
                // Test Stats
                HStack(spacing: 20) {
                    StatItem(
                        title: "バリアント",
                        value: "\(test.variants.count)",
                        icon: "rectangle.stack.fill"
                    )
                    
                    StatItem(
                        title: "トラフィック",
                        value: "\(Int(test.trafficSplit * 100))%",
                        icon: "chart.pie.fill"
                    )
                    
                    StatItem(
                        title: "目標",
                        value: test.conversionGoal,
                        icon: "target"
                    )
                    
                    StatItem(
                        title: "期間",
                        value: "\(Calendar.current.dateComponents([.day], from: test.startDate, to: test.endDate ?? Date()).day ?? 0)日",
                        icon: "calendar"
                    )
                }
                
                // Variants Summary
                VStack(spacing: 8) {
                    ForEach(test.variants.prefix(2)) { variant in
                        HStack {
                            Text(variant.name)
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(DesignSystem.textPrimary)
                            
                            Spacer()
                            
                            Text("\(variant.visitors)訪問者")
                                .font(.caption)
                                .foregroundColor(DesignSystem.textSecondary)
                            
                            Text("\(String(format: "%.1f", variant.conversionRate))%")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(DesignSystem.textPrimary)
                        }
                    }
                    
                    if test.variants.count > 2 {
                        Text("他 \(test.variants.count - 2) バリアント")
                            .font(.caption)
                            .foregroundColor(DesignSystem.textSecondary)
                    }
                }
                
                // Actions
                HStack {
                    AnimatedButton(
                        title: "詳細",
                        icon: "chart.bar.fill",
                        style: .secondary,
                        action: onTap
                    )
                    
                    Spacer()
                    
                    if test.status == .running {
                        AnimatedButton(
                            title: "停止",
                            icon: "pause.fill",
                            style: .danger,
                            action: {
                                // テストを停止する処理
                            }
                        )
                    } else if test.status == .paused {
                        AnimatedButton(
                            title: "再開",
                            icon: "play.fill",
                            style: .success,
                            action: {
                                // テストを再開する処理
                            }
                        )
                    }
                }
            }
        }
    }
}

struct NewABTestSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var analyticsManager: AnalyticsManager
    
    @State private var name = ""
    @State private var description = ""
    @State private var conversionGoal = ""
    @State private var trafficSplit: Double = 0.5
    @State private var startDate = Date()
    @State private var endDate = Calendar.current.date(byAdding: .day, value: 30, to: Date()) ?? Date()
    @State private var variants: [ABTestVariantInput] = [
        ABTestVariantInput(name: "コントロール", description: "現在のバージョン", changes: []),
        ABTestVariantInput(name: "バリアントA", description: "新しいバージョン", changes: [])
    ]
    @State private var showingAddVariant = false
    
    var body: some View {
        NavigationView {
            Form {
                Section("テスト情報") {
                    TextField("テスト名", text: $name)
                    TextField("説明", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                    TextField("コンバージョン目標", text: $conversionGoal)
                }
                
                Section("設定") {
                    HStack {
                        Text("トラフィック分割")
                        Spacer()
                        Text("\(Int(trafficSplit * 100))%")
                            .foregroundColor(DesignSystem.textSecondary)
                    }
                    
                    Slider(value: $trafficSplit, in: 0.1...0.9, step: 0.1)
                    
                    DatePicker("開始日", selection: $startDate, displayedComponents: .date)
                    DatePicker("終了日", selection: $endDate, displayedComponents: .date)
                }
                
                Section("バリアント") {
                    ForEach(Array(variants.enumerated()), id: \.offset) { index, variant in
                        VariantRow(variant: $variants[index])
                    }
                    
                    Button("バリアントを追加") {
                        variants.append(ABTestVariantInput(name: "バリアント\(variants.count + 1)", description: "", changes: []))
                    }
                    .foregroundColor(DesignSystem.textAccent)
                }
            }
            .navigationTitle("新規A/Bテスト")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("キャンセル") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("作成") {
                        createTest()
                    }
                    .disabled(name.isEmpty || conversionGoal.isEmpty || variants.count < 2)
                }
            }
        }
    }
    
    private func createTest() {
        let abTestVariants = variants.map { input in
            ABTestVariant(
                name: input.name,
                description: input.description,
                visitors: 0,
                conversions: 0,
                conversionRate: 0.0,
                revenue: nil,
                changes: input.changes
            )
        }
        
        let newTest = ABTest(
            name: name,
            description: description,
            startDate: startDate,
            endDate: endDate,
            status: .draft,
            variants: abTestVariants,
            trafficSplit: trafficSplit,
            conversionGoal: conversionGoal
        )
        
        // AnalyticsManagerにテストを追加
        analyticsManager.abTests.append(newTest)
        
        dismiss()
    }
}

struct VariantRow: View {
    @Binding var variant: ABTestVariantInput
    @State private var showingChanges = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                TextField("バリアント名", text: $variant.name)
                Spacer()
                Button("変更") {
                    showingChanges = true
                }
                .foregroundColor(DesignSystem.textAccent)
            }
            
            TextField("説明", text: $variant.description, axis: .vertical)
                .lineLimit(2...4)
            
            if !variant.changes.isEmpty {
                Text("\(variant.changes.count)個の変更")
                    .font(.caption)
                    .foregroundColor(DesignSystem.textSecondary)
            }
        }
        .sheet(isPresented: $showingChanges) {
            ChangesSheet(changes: $variant.changes)
        }
    }
}

struct ChangesSheet: View {
    @Binding var changes: [ElementChange]
    @Environment(\.dismiss) private var dismiss
    
    @State private var selector = ""
    @State private var property = ""
    @State private var value = ""
    
    var body: some View {
        NavigationView {
            Form {
                Section("変更を追加") {
                    TextField("CSSセレクター", text: $selector)
                    TextField("プロパティ", text: $property)
                    TextField("値", text: $value)
                    
                    Button("追加") {
                        if !selector.isEmpty && !property.isEmpty && !value.isEmpty {
                            changes.append(ElementChange(selector: selector, property: property, value: value))
                            selector = ""
                            property = ""
                            value = ""
                        }
                    }
                    .disabled(selector.isEmpty || property.isEmpty || value.isEmpty)
                }
                
                Section("現在の変更") {
                    ForEach(Array(changes.enumerated()), id: \.offset) { index, change in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(change.selector)
                                .font(.subheadline)
                                .fontWeight(.medium)
                            
                            Text("\(change.property): \(change.value)")
                                .font(.caption)
                                .foregroundColor(DesignSystem.textSecondary)
                        }
                        .swipeActions {
                            Button("削除", role: .destructive) {
                                changes.remove(at: index)
                            }
                        }
                    }
                }
            }
            .navigationTitle("要素変更")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("完了") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct ABTestDetailView: View {
    let test: ABTest
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var analyticsManager: AnalyticsManager
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(alignment: .leading, spacing: 16) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(test.name)
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(DesignSystem.textPrimary)
                                
                                Text(test.description)
                                    .font(.subheadline)
                                    .foregroundColor(DesignSystem.textSecondary)
                            }
                            
                            Spacer()
                            
                            StatusBadge(status: test.status)
                        }
                        
                        HStack {
                            InfoRow(label: "開始日", value: test.startDate.formatted(date: .abbreviated, time: .omitted))
                            Spacer()
                            if let endDate = test.endDate {
                                InfoRow(label: "終了日", value: endDate.formatted(date: .abbreviated, time: .omitted))
                            }
                        }
                        
                        HStack {
                            InfoRow(label: "トラフィック分割", value: "\(Int(test.trafficSplit * 100))%")
                            Spacer()
                            InfoRow(label: "コンバージョン目標", value: test.conversionGoal)
                        }
                    }
                    .padding(DesignSystem.padding)
                    .background(
                        RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                            .fill(DesignSystem.cardBackground)
                    )
                    
                    // Results Chart
                    ModernCardView {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("コンバージョン率比較")
                                .font(.headline)
                                .fontWeight(.semibold)
                                .foregroundColor(DesignSystem.textPrimary)
                            
                            Chart {
                                ForEach(test.variants, id: \.id) { variant in
                                    BarMark(
                                        x: .value("バリアント", variant.name),
                                        y: .value("コンバージョン率", variant.conversionRate)
                                    )
                                    .foregroundStyle(by: .value("バリアント", variant.name))
                                }
                            }
                            .frame(height: 200)
                            .chartYAxis {
                                AxisMarks { value in
                                    AxisValueLabel {
                                        Text("\(value.as(Double.self)?.formatted(.number.precision(.fractionLength(1))) ?? "")%")
                                    }
                                }
                            }
                        }
                    }
                    
                    // Variants Detail
                    ForEach(test.variants) { variant in
                        VariantDetailCard(variant: variant)
                    }
                }
                .padding(DesignSystem.padding)
            }
            .background(DesignSystem.backgroundGradient)
            .navigationTitle("テスト詳細")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        if test.status == .running {
                            Button("一時停止") {
                                // テストを一時停止
                            }
                        } else if test.status == .paused {
                            Button("再開") {
                                // テストを再開
                            }
                        }
                        
                        Button("結果をエクスポート") {
                            // 結果をエクスポート
                        }
                        
                        Button("削除", role: .destructive) {
                            // テストを削除
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
}

struct VariantDetailCard: View {
    let variant: ABTestVariant
    
    var body: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text(variant.name)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(DesignSystem.textPrimary)
                    
                    Spacer()
                    
                    if variant.conversionRate > 0 {
                        Text("\(String(format: "%.1f", variant.conversionRate))%")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(.green)
                    }
                }
                
                Text(variant.description)
                    .font(.subheadline)
                    .foregroundColor(DesignSystem.textSecondary)
                
                // Stats
                HStack(spacing: 20) {
                    StatItem(
                        title: "訪問者",
                        value: "\(variant.visitors)",
                        icon: "person.2.fill"
                    )
                    
                    StatItem(
                        title: "コンバージョン",
                        value: "\(variant.conversions)",
                        icon: "target"
                    )
                    
                    if let revenue = variant.revenue {
                        StatItem(
                            title: "売上",
                            value: "¥\(Int(revenue))",
                            icon: "yensign.circle.fill"
                        )
                    }
                }
                
                // Changes
                if let changes = variant.changes, !changes.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("変更内容")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(DesignSystem.textPrimary)
                        
                        ForEach(Array(changes.enumerated()), id: \.offset) { index, change in
                            HStack {
                                Text("•")
                                    .foregroundColor(DesignSystem.textSecondary)
                                
                                Text("\(change.selector)")
                                    .font(.caption)
                                    .foregroundColor(DesignSystem.textPrimary)
                                
                                Spacer()
                                
                                Text("\(change.property): \(change.value)")
                                    .font(.caption)
                                    .foregroundColor(DesignSystem.textSecondary)
                            }
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Supporting Types

struct ABTestVariantInput {
    var name: String
    var description: String
    var changes: [ElementChange]
}

#Preview {
    ABTestView()
        .environmentObject(AnalyticsManager())
}