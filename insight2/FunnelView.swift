import SwiftUI
import Charts

struct FunnelView: View {
    @EnvironmentObject var analyticsManager: AnalyticsManager
    @State private var selectedFunnel: Funnel?
    @State private var showingCreateFunnel = false
    
    var body: some View {
        ZStack {
            Color.black
                .ignoresSafeArea()
            
            VStack(spacing: 20) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("ファネル分析")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                        
                        Text("ユーザージャーニーの最適化")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                    
                    Spacer()
                    
                    Button("新しいファネルを作成") {
                        showingCreateFunnel = true
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.blue)
                }
                .padding(.horizontal)
                
                // Funnel list
                if analyticsManager.funnels.isEmpty {
                    emptyStateView
                } else {
                    LazyVStack(spacing: 16) {
                        ForEach(analyticsManager.funnels) { funnel in
                            FunnelCard(funnel: funnel) {
                                selectedFunnel = funnel
                            }
                        }
                    }
                    .padding(.horizontal)
                }
                
                // Selected funnel visualization
                if let selectedFunnel = selectedFunnel {
                    selectedFunnelView(selectedFunnel)
                }
            }
        }
        .sheet(isPresented: $showingCreateFunnel) {
            CreateFunnelView()
        }
    }
    
    // MARK: - Sub Views
    
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "chart.bar.doc")
                .font(.largeTitle)
                .foregroundColor(.gray)
            
            Text("ファネルがありません")
                .font(.subheadline)
                .foregroundColor(.gray)
            
            Text("新しいファネルを作成して分析を開始してください")
                .font(.caption)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
        }
        .padding(40)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.gray.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                )
        )
        .padding(.horizontal)
    }
    
    private func selectedFunnelView(_ funnel: Funnel) -> some View {
        VStack(spacing: 20) {
            Text("ファネル: \(funnel.name)")
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(.white)
            
            // Funnel visualization
            FunnelVisualization(funnel: funnel)
                .frame(height: 300)
                .padding(.horizontal)
            
            // Funnel statistics
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                FunnelStatCard(
                    title: "総コンバージョン",
                    value: "\(funnel.totalConversions)",
                    icon: "target",
                    color: .green
                )
                
                FunnelStatCard(
                    title: "全体コンバージョン率",
                    value: "\(String(format: "%.1f", funnel.conversionRate))%",
                    icon: "chart.line.uptrend.xyaxis",
                    color: .blue
                )
                
                FunnelStatCard(
                    title: "ファネルステップ数",
                    value: "\(funnel.steps.count)",
                    icon: "list.number",
                    color: .orange
                )
            }
            .padding(.horizontal)
            
            // Step details
            VStack(alignment: .leading, spacing: 12) {
                Text("ステップ詳細")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                
                LazyVStack(spacing: 8) {
                    ForEach(funnel.steps, id: \.id) { step in
                        FunnelStepRow(step: step, isLast: step.id == funnel.steps.last?.id)
                    }
                }
            }
            .padding(.horizontal)
        }
    }
}

// MARK: - Funnel Card

struct FunnelCard: View {
    let funnel: Funnel
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(funnel.name)
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                        
                        Text("\(funnel.steps.count) ステップ")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("\(String(format: "%.1f", funnel.conversionRate))%")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.green)
                        
                        Text("コンバージョン率")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
                
                // Mini funnel preview
                HStack(spacing: 4) {
                    ForEach(Array(funnel.steps.enumerated()), id: \.element.id) { index, step in
                        VStack(spacing: 2) {
                            Text("\(step.visitors)")
                                .font(.caption2)
                                .fontWeight(.medium)
                                .foregroundColor(.white)
                            
                            Rectangle()
                                .fill(Color.blue.opacity(0.6))
                                .frame(height: 40)
                                .cornerRadius(4)
                        }
                        
                        if index < funnel.steps.count - 1 {
                            Image(systemName: "arrow.right")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    }
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.gray.opacity(0.1))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Funnel Visualization

struct FunnelVisualization: View {
    let funnel: Funnel
    
    var body: some View {
        VStack(spacing: 16) {
            // Funnel chart
            Chart {
                ForEach(Array(funnel.steps.enumerated()), id: \.element.id) { index, step in
                    BarMark(
                        x: .value("ステップ", step.name),
                        y: .value("訪問者", step.visitors)
                    )
                    .foregroundStyle(by: .value("ステップ", step.name))
                    .position(by: .value("ステップ", step.name))
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading)
            }
            .frame(height: 200)
            
            // Conversion rates
            HStack {
                                        ForEach(funnel.steps, id: \.id) { step in
                    VStack(spacing: 4) {
                        Text(step.name)
                            .font(.caption)
                            .fontWeight(.medium)
                        
                        Text("\(String(format: "%.1f", step.conversionRate))%")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    if step.id != funnel.steps.last?.id {
                        Spacer()
                    }
                }
            }
        }
    }
}

// MARK: - Funnel Step Row

struct FunnelStepRow: View {
    let step: FunnelStep
    let isLast: Bool
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(step.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text(step.url)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text("\(step.visitors) 訪問者")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                Text("\(String(format: "%.1f", step.conversionRate))% コンバージョン")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color(.controlBackgroundColor))
        .cornerRadius(8)
        
        if !isLast {
            Image(systemName: "arrow.down")
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.vertical, 4)
        }
    }
}

// MARK: - Funnel Stat Card

struct FunnelStatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                
                Spacer()
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(value)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                Text(title)
                    .font(.caption)
                    .foregroundColor(.gray)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.gray.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                )
        )
    }
}

// MARK: - Create Funnel View

struct CreateFunnelView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var analyticsManager: AnalyticsManager
    
    @State private var funnelName = ""
    @State private var steps: [FunnelStepInput] = []
    @State private var showingAddStep = false
    
    struct FunnelStepInput: Identifiable {
        let id = UUID()
        var name = ""
        var url = ""
        var visitors = 0
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("ファネル基本情報") {
                    TextField("ファネル名", text: $funnelName)
                }
                
                Section("ステップ") {
                    ForEach($steps) { $step in
                        VStack(alignment: .leading, spacing: 8) {
                            TextField("ステップ名", text: $step.name)
                            TextField("URL", text: $step.url)
                            HStack {
                                Text("訪問者数")
                                Spacer()
                                TextField("0", value: $step.visitors, format: .number)
                                    .textFieldStyle(.roundedBorder)
                                    .frame(width: 100)
                            }
                        }
                    }
                    .onDelete(perform: deleteStep)
                    
                    Button("ステップを追加") {
                        steps.append(FunnelStepInput())
                    }
                }
            }
            .navigationTitle("新しいファネル")
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
                    .disabled(funnelName.isEmpty || steps.count < 2)
                }
            }
        }
    }
    
    private func deleteStep(at offsets: IndexSet) {
        steps.remove(atOffsets: offsets)
    }
    
    private func createFunnel() {
        let funnelSteps = steps.enumerated().map { index, step in
            FunnelStep(
                name: step.name,
                url: step.url,
                visitors: step.visitors,
                conversions: calculateConversions(for: index),
                conversionRate: calculateConversionRate(for: index),
                dropOffRate: calculateDropOffRate(for: index)
            )
        }
        
        let totalConversions = funnelSteps.last?.conversions ?? 0
        let conversionRate = funnelSteps.first?.visitors ?? 0 > 0 ? 
            Double(totalConversions) / Double(funnelSteps.first?.visitors ?? 1) * 100 : 0
        
        let funnel = Funnel(
            name: funnelName,
            description: "新しいファネル",
            steps: funnelSteps,
            totalConversions: totalConversions,
            conversionRate: conversionRate,
            createdAt: Date()
        )
        
        // In a real app, this would be saved to the backend
        analyticsManager.funnels.append(funnel)
        
        dismiss()
    }
    
    private func calculateConversionRate(for index: Int) -> Double {
        guard index < steps.count, index > 0 else { return 100.0 }
        let currentVisitors = steps[index].visitors
        let previousVisitors = steps[index - 1].visitors
        return previousVisitors > 0 ? Double(currentVisitors) / Double(previousVisitors) * 100 : 0
    }
    
    private func calculateConversions(for index: Int) -> Int {
        guard index < steps.count else { return 0 }
        return steps[index].visitors
    }
    
    private func calculateDropOffRate(for index: Int) -> Double {
        guard index < steps.count, index > 0 else { return 0.0 }
        let currentVisitors = steps[index].visitors
        let previousVisitors = steps[index - 1].visitors
        return previousVisitors > 0 ? (1.0 - Double(currentVisitors) / Double(previousVisitors)) * 100 : 0
    }
}

#Preview {
    FunnelView()
        .environmentObject(AnalyticsManager())
} 