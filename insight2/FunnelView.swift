import SwiftUI
import Charts

struct FunnelView: View {
    @EnvironmentObject var analyticsManager: AnalyticsManager
    @State private var showingNewFunnelSheet = false
    @State private var selectedFunnel: Funnel?
    @State private var showingFunnelDetail = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 16) {
                    HStack {
                        Text("ファネル分析")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(DesignSystem.textPrimary)
                        
                        Spacer()
                        
                        AnimatedButton(
                            title: "新規ファネル",
                            icon: "plus",
                            style: .primary,
                            action: { showingNewFunnelSheet = true }
                        )
                    }
                    
                    Text("ユーザージャーニーを分析して、コンバージョン率を向上させましょう")
                        .font(.subheadline)
                        .foregroundColor(DesignSystem.textSecondary)
                        .multilineTextAlignment(.leading)
                }
                .padding(DesignSystem.padding)
                
                // Content
                if analyticsManager.funnels.isEmpty {
                    EmptyStateView(
                        icon: "chart.bar.fill",
                        title: "ファネルがありません",
                        message: "最初のファネルを作成して、ユーザージャーニーを分析しましょう",
                        actionTitle: "ファネルを作成",
                        action: { showingNewFunnelSheet = true }
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(analyticsManager.funnels) { funnel in
                                FunnelCard(funnel: funnel) {
                                    selectedFunnel = funnel
                                    showingFunnelDetail = true
                                }
                            }
                        }
                        .padding(DesignSystem.padding)
                    }
                }
            }
            .background(DesignSystem.backgroundGradient)
            .sheet(isPresented: $showingNewFunnelSheet) {
                NewFunnelSheet()
            }
            .sheet(isPresented: $showingFunnelDetail) {
                if let funnel = selectedFunnel {
                    FunnelDetailView(funnel: funnel)
                }
            }
        }
    }
}

struct FunnelCard: View {
    let funnel: Funnel
    let onTap: () -> Void
    
    var body: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(funnel.name)
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(DesignSystem.textPrimary)
                        
                        Text(funnel.description)
                            .font(.subheadline)
                            .foregroundColor(DesignSystem.textSecondary)
                            .lineLimit(2)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("\(String(format: "%.1f", funnel.conversionRate))%")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(DesignSystem.textAccent)
                        
                        Text("コンバージョン率")
                            .font(.caption)
                            .foregroundColor(DesignSystem.textSecondary)
                    }
                }
                
                // Funnel Steps Preview
                VStack(spacing: 8) {
                    ForEach(Array(funnel.steps.prefix(3).enumerated()), id: \.element.id) { index, step in
                        HStack {
                            Text("\(index + 1)")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(DesignSystem.textSecondary)
                                .frame(width: 20)
                            
                            Text(step.name)
                                .font(.subheadline)
                                .foregroundColor(DesignSystem.textPrimary)
                            
                            Spacer()
                            
                            Text("\(step.visitors)")
                                .font(.caption)
                                .foregroundColor(DesignSystem.textSecondary)
                            
                            Text("\(String(format: "%.1f", step.conversionRate))%")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(DesignSystem.textPrimary)
                        }
                    }
                    
                    if funnel.steps.count > 3 {
                        Text("他 \(funnel.steps.count - 3) ステップ")
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
                    
                    Text("作成日: \(funnel.createdAt.formatted(date: .abbreviated, time: .omitted))")
                        .font(.caption)
                        .foregroundColor(DesignSystem.textSecondary)
                }
            }
        }
    }
}

struct NewFunnelSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var analyticsManager: AnalyticsManager
    
    @State private var name = ""
    @State private var description = ""
    @State private var steps: [FunnelStepInput] = [
        FunnelStepInput(name: "ステップ1", url: ""),
        FunnelStepInput(name: "ステップ2", url: ""),
        FunnelStepInput(name: "ステップ3", url: "")
    ]
    
    var body: some View {
        NavigationView {
            Form {
                Section("ファネル情報") {
                    TextField("ファネル名", text: $name)
                    TextField("説明", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }
                
                Section("ステップ") {
                    ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                        StepRow(step: $steps[index])
                    }
                    
                    Button("ステップを追加") {
                        steps.append(FunnelStepInput(name: "ステップ\(steps.count + 1)", url: ""))
                    }
                    .foregroundColor(DesignSystem.textAccent)
                }
            }
            .navigationTitle("新規ファネル")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("キャンセル") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("作成") {
                        createFunnel()
                    }
                    .disabled(name.isEmpty || steps.count < 2)
                }
            }
        }
    }
    
    private func createFunnel() {
        let funnelSteps = steps.map { input in
            FunnelStep(
                name: input.name,
                url: input.url,
                visitors: 0,
                conversions: 0,
                conversionRate: 0.0,
                dropOffRate: 0.0
            )
        }
        
        let newFunnel = Funnel(
            name: name,
            description: description,
            steps: funnelSteps,
            totalConversions: 0,
            conversionRate: 0.0,
            createdAt: Date()
        )
        
        // AnalyticsManagerにファネルを追加
        analyticsManager.funnels.append(newFunnel)
        
        dismiss()
    }
}

struct StepRow: View {
    @Binding var step: FunnelStepInput
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            TextField("ステップ名", text: $step.name)
            TextField("URL", text: $step.url)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
        }
    }
}

struct FunnelDetailView: View {
    let funnel: Funnel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(alignment: .leading, spacing: 16) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(funnel.name)
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(DesignSystem.textPrimary)
                                
                                Text(funnel.description)
                                    .font(.subheadline)
                                    .foregroundColor(DesignSystem.textSecondary)
                            }
                            
                            Spacer()
                            
                            VStack(alignment: .trailing, spacing: 4) {
                                Text("\(String(format: "%.1f", funnel.conversionRate))%")
                                    .font(.title)
                                    .fontWeight(.bold)
                                    .foregroundColor(DesignSystem.textAccent)
                                
                                Text("全体コンバージョン率")
                                    .font(.caption)
                                    .foregroundColor(DesignSystem.textSecondary)
                            }
                        }
                        
                        HStack {
                            InfoRow(label: "総コンバージョン", value: "\(funnel.totalConversions)")
                            Spacer()
                            InfoRow(label: "作成日", value: funnel.createdAt.formatted(date: .abbreviated, time: .omitted))
                        }
                    }
                    .padding(DesignSystem.padding)
                    .background(
                        RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                            .fill(DesignSystem.cardBackground)
                    )
                    
                    // Funnel Chart
                    ModernCardView {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("ファネルチャート")
                                .font(.headline)
                                .fontWeight(.semibold)
                                .foregroundColor(DesignSystem.textPrimary)
                            
                            Chart {
                                ForEach(funnel.steps, id: \.id) { step in
                                    BarMark(
                                        x: .value("ステップ", step.name),
                                        y: .value("訪問者", step.visitors)
                                    )
                                    .foregroundStyle(DesignSystem.primaryGradient)
                                }
                            }
                            .frame(height: 200)
                            .chartYAxis {
                                AxisMarks { value in
                                    AxisValueLabel()
                                }
                            }
                        }
                    }
                    
                    // Steps Detail
                    ForEach(funnel.steps) { step in
                        StepDetailCard(step: step)
                    }
                }
                .padding(DesignSystem.padding)
            }
            .background(DesignSystem.backgroundGradient)
            .navigationTitle("ファネル詳細")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button("データをエクスポート") {
                            // データをエクスポート
                        }
                        
                        Button("ファネルを編集") {
                            // ファネルを編集
                        }
                        
                        Button("削除", role: .destructive) {
                            // ファネルを削除
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

struct StepDetailCard: View {
    let step: FunnelStep
    
    var body: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text(step.name)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(DesignSystem.textPrimary)
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("\(String(format: "%.1f", step.conversionRate))%")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(DesignSystem.textAccent)
                        
                        Text("コンバージョン率")
                            .font(.caption)
                            .foregroundColor(DesignSystem.textSecondary)
                    }
                }
                
                Text(step.url)
                    .font(.subheadline)
                    .foregroundColor(DesignSystem.textSecondary)
                
                // Stats
                HStack(spacing: 20) {
                    StatItem(
                        title: "訪問者",
                        value: "\(step.visitors)",
                        icon: "person.2.fill"
                    )
                    
                    StatItem(
                        title: "コンバージョン",
                        value: "\(step.conversions)",
                        icon: "target"
                    )
                    
                    StatItem(
                        title: "離脱率",
                        value: "\(String(format: "%.1f", step.dropOffRate))%",
                        icon: "arrow.down.circle.fill"
                    )
                }
                
                // Progress Bar
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("コンバージョン率")
                            .font(.caption)
                            .foregroundColor(DesignSystem.textSecondary)
                        
                        Spacer()
                        
                        Text("\(String(format: "%.1f", step.conversionRate))%")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(DesignSystem.textPrimary)
                    }
                    
                    HStack(spacing: 4) {
                        Rectangle()
                            .fill(DesignSystem.textAccent)
                            .frame(width: max(0, CGFloat(step.conversionRate) * 2), height: 8)
                            .animation(.easeInOut(duration: 0.5), value: step.conversionRate)
                        
                        Spacer()
                    }
                    .frame(height: 8)
                    .background(Color.gray.opacity(0.2))
                    .cornerRadius(4)
                }
            }
        }
    }
}

// MARK: - Supporting Types

struct FunnelStepInput {
    var name: String
    var url: String
}

#Preview {
    FunnelView()
        .environmentObject(AnalyticsManager())
} 