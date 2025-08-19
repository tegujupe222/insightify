import SwiftUI

struct WebsiteManagementView: View {
    @EnvironmentObject var websiteManager: WebsiteManager
    @State private var showingAddWebsiteSheet = false
    @State private var selectedWebsite: Website?
    @State private var showingWebsiteDetail = false
    @State private var searchText = ""
    
    var filteredWebsites: [Website] {
        if searchText.isEmpty {
            return websiteManager.websites
        } else {
            return websiteManager.websites.filter { website in
                website.name.localizedCaseInsensitiveContains(searchText) ||
                website.url.localizedCaseInsensitiveContains(searchText)
            }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 16) {
                    HStack {
                        Text("ウェブサイト管理")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(DesignSystem.textPrimary)
                        
                        Spacer()
                        
                        AnimatedButton(
                            title: "ウェブサイト追加",
                            icon: "plus",
                            style: .primary,
                            action: { showingAddWebsiteSheet = true }
                        )
                    }
                    
                    Text("トラッキング対象のウェブサイトを管理し、設定を調整しましょう")
                        .font(.subheadline)
                        .foregroundColor(DesignSystem.textSecondary)
                        .multilineTextAlignment(.leading)
                }
                .padding(DesignSystem.padding)
                
                // Search Bar
                SearchBar(text: $searchText, placeholder: "ウェブサイトを検索...")
                    .padding(.horizontal, DesignSystem.padding)
                
                // Content
                if websiteManager.websites.isEmpty {
                    EmptyStateView(
                        icon: "globe",
                        title: "ウェブサイトがありません",
                        message: "最初のウェブサイトを追加して、トラッキングを開始しましょう",
                        actionTitle: "ウェブサイトを追加",
                        action: { showingAddWebsiteSheet = true }
                    )
                } else if filteredWebsites.isEmpty {
                    EmptyStateView(
                        icon: "magnifyingglass",
                        title: "検索結果がありません",
                        message: "別のキーワードで検索してみてください",
                        actionTitle: "検索をクリア",
                        action: { searchText = "" }
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(filteredWebsites) { website in
                                WebsiteCard(website: website) {
                                    selectedWebsite = website
                                    showingWebsiteDetail = true
                                }
                            }
                        }
                        .padding(DesignSystem.padding)
                    }
                }
            }
            .background(DesignSystem.backgroundGradient)
            .sheet(isPresented: $showingAddWebsiteSheet) {
                AddWebsiteSheet()
            }
            .sheet(isPresented: $showingWebsiteDetail) {
                if let website = selectedWebsite {
                    WebsiteDetailView(website: website)
                }
            }
        }
    }
}

struct WebsiteCard: View {
    let website: Website
    let onTap: () -> Void
    @EnvironmentObject var websiteManager: WebsiteManager
    
    var body: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(website.name)
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(DesignSystem.textPrimary)
                        
                        Text(website.url)
                            .font(.subheadline)
                            .foregroundColor(DesignSystem.textSecondary)
                            .lineLimit(1)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        StatusIndicator(isActive: website.isActive)
                        
                        if let lastData = website.lastDataReceived {
                            Text("最終データ: \(lastData.formatted(date: .abbreviated, time: .shortened))")
                                .font(.caption)
                                .foregroundColor(DesignSystem.textSecondary)
                        } else {
                            Text("データなし")
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                    }
                }
                
                if let description = website.description {
                    Text(description)
                        .font(.subheadline)
                        .foregroundColor(DesignSystem.textSecondary)
                        .lineLimit(2)
                }
                
                // Settings Summary
                HStack(spacing: 16) {
                    SettingBadge(
                        title: "トラッキング",
                        isEnabled: website.settings.trackingEnabled,
                        icon: "antenna.radiowaves.left.and.right"
                    )
                    
                    SettingBadge(
                        title: "ヒートマップ",
                        isEnabled: website.settings.heatmapEnabled,
                        icon: "flame.fill"
                    )
                    
                    SettingBadge(
                        title: "A/Bテスト",
                        isEnabled: website.settings.abTestingEnabled,
                        icon: "arrow.left.arrow.right"
                    )
                    
                    SettingBadge(
                        title: "プライバシー",
                        isEnabled: website.settings.privacyMode,
                        icon: "lock.fill"
                    )
                }
                
                // Actions
                HStack {
                    AnimatedButton(
                        title: "詳細",
                        icon: "doc.text",
                        style: .secondary,
                        action: onTap
                    )
                    
                    Spacer()
                    
                    AnimatedButton(
                        title: website.isActive ? "停止" : "開始",
                        icon: website.isActive ? "pause.fill" : "play.fill",
                        style: website.isActive ? .danger : .success,
                        action: {
                            websiteManager.toggleWebsiteStatus(website)
                        }
                    )
                }
            }
        }
    }
}

struct AddWebsiteSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var websiteManager: WebsiteManager
    
    @State private var name = ""
    @State private var url = ""
    @State private var description = ""
    @State private var trackingEnabled = true
    @State private var heatmapEnabled = true
    @State private var abTestingEnabled = true
    @State private var privacyMode = false
    @State private var customEvents: [String] = []
    @State private var conversionGoals: [String] = []
    @State private var newCustomEvent = ""
    @State private var newConversionGoal = ""
    @State private var showingValidationError = false
    @State private var validationMessage = ""
    
    var body: some View {
        NavigationView {
            Form {
                Section("基本情報") {
                    TextField("ウェブサイト名", text: $name)
                    TextField("URL", text: $url)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    TextField("説明", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }
                
                Section("トラッキング設定") {
                    Toggle("ページビュートラッキング", isOn: $trackingEnabled)
                    Toggle("ヒートマップ", isOn: $heatmapEnabled)
                    Toggle("A/Bテスト", isOn: $abTestingEnabled)
                    Toggle("プライバシーモード", isOn: $privacyMode)
                }
                
                Section("カスタムイベント") {
                    ForEach(customEvents, id: \.self) { event in
                        HStack {
                            Text(event)
                            Spacer()
                            Button("削除") {
                                customEvents.removeAll { $0 == event }
                            }
                            .foregroundColor(.red)
                        }
                    }
                    
                    HStack {
                        TextField("新しいイベント", text: $newCustomEvent)
                        Button("追加") {
                            if !newCustomEvent.isEmpty {
                                customEvents.append(newCustomEvent)
                                newCustomEvent = ""
                            }
                        }
                        .disabled(newCustomEvent.isEmpty)
                    }
                }
                
                Section("コンバージョン目標") {
                    ForEach(conversionGoals, id: \.self) { goal in
                        HStack {
                            Text(goal)
                            Spacer()
                            Button("削除") {
                                conversionGoals.removeAll { $0 == goal }
                            }
                            .foregroundColor(.red)
                        }
                    }
                    
                    HStack {
                        TextField("新しい目標", text: $newConversionGoal)
                        Button("追加") {
                            if !newConversionGoal.isEmpty {
                                conversionGoals.append(newConversionGoal)
                                newConversionGoal = ""
                            }
                        }
                        .disabled(newConversionGoal.isEmpty)
                    }
                }
            }
            .navigationTitle("ウェブサイト追加")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("キャンセル") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("追加") {
                        addWebsite()
                    }
                    .disabled(name.isEmpty || url.isEmpty)
                }
            }
            .alert("バリデーションエラー", isPresented: $showingValidationError) {
                Button("OK") { }
            } message: {
                Text(validationMessage)
            }
        }
    }
    
    private func addWebsite() {
        // バリデーション
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            validationMessage = "ウェブサイト名を入力してください"
            showingValidationError = true
            return
        }
        
        guard !url.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            validationMessage = "URLを入力してください"
            showingValidationError = true
            return
        }
        
        guard websiteManager.validateWebsiteURL(url) else {
            validationMessage = "有効なURLを入力してください"
            showingValidationError = true
            return
        }
        
        guard websiteManager.isWebsiteNameUnique(name) else {
            validationMessage = "この名前は既に使用されています"
            showingValidationError = true
            return
        }
        
        // 設定を作成
        let settings = WebsiteSettings(
            trackingEnabled: trackingEnabled,
            heatmapEnabled: heatmapEnabled,
            abTestingEnabled: abTestingEnabled,
            privacyMode: privacyMode,
            customEvents: customEvents,
            conversionGoals: conversionGoals
        )
        
        // ウェブサイトを追加
        websiteManager.addWebsite(
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            url: url.trimmingCharacters(in: .whitespacesAndNewlines),
            description: description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : description.trimmingCharacters(in: .whitespacesAndNewlines)
        )
        
        dismiss()
    }
}

struct WebsiteDetailView: View {
    let website: Website
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var websiteManager: WebsiteManager
    @State private var showingSettingsSheet = false
    @State private var showingTrackingCode = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(alignment: .leading, spacing: 16) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(website.name)
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(DesignSystem.textPrimary)
                                
                                Text(website.url)
                                    .font(.subheadline)
                                    .foregroundColor(DesignSystem.textSecondary)
                            }
                            
                            Spacer()
                            
                            StatusIndicator(isActive: website.isActive)
                        }
                        
                        if let description = website.description {
                            Text(description)
                                .font(.subheadline)
                                .foregroundColor(DesignSystem.textSecondary)
                        }
                        
                        HStack {
                            InfoRow(label: "作成日", value: website.createdAt.formatted(date: .abbreviated, time: .omitted))
                            Spacer()
                            if let lastData = website.lastDataReceived {
                                InfoRow(label: "最終データ", value: lastData.formatted(date: .abbreviated, time: .shortened))
                            }
                        }
                    }
                    .padding(DesignSystem.padding)
                    .background(
                        RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                            .fill(DesignSystem.cardBackground)
                    )
                    
                    // Settings
                    ModernCardView {
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Text("トラッキング設定")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(DesignSystem.textPrimary)
                                
                                Spacer()
                                
                                AnimatedButton(
                                    title: "編集",
                                    icon: "pencil",
                                    style: .secondary,
                                    action: { showingSettingsSheet = true }
                                )
                            }
                            
                            VStack(spacing: 12) {
                                SettingRow(
                                    title: "ページビュートラッキング",
                                    isEnabled: website.settings.trackingEnabled,
                                    icon: "antenna.radiowaves.left.and.right"
                                )
                                
                                SettingRow(
                                    title: "ヒートマップ",
                                    isEnabled: website.settings.heatmapEnabled,
                                    icon: "flame.fill"
                                )
                                
                                SettingRow(
                                    title: "A/Bテスト",
                                    isEnabled: website.settings.abTestingEnabled,
                                    icon: "arrow.left.arrow.right"
                                )
                                
                                SettingRow(
                                    title: "プライバシーモード",
                                    isEnabled: website.settings.privacyMode,
                                    icon: "lock.fill"
                                )
                            }
                        }
                    }
                    
                    // Custom Events
                    if !website.settings.customEvents.isEmpty {
                        ModernCardView {
                            VStack(alignment: .leading, spacing: 16) {
                                Text("カスタムイベント")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(DesignSystem.textPrimary)
                                
                                LazyVGrid(columns: [
                                    GridItem(.flexible()),
                                    GridItem(.flexible())
                                ], spacing: 8) {
                                    ForEach(website.settings.customEvents, id: \.self) { event in
                                        Text(event)
                                            .font(.caption)
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 4)
                                            .background(
                                                Capsule()
                                                    .fill(Color.blue.opacity(0.1))
                                            )
                                            .foregroundColor(.blue)
                                    }
                                }
                            }
                        }
                    }
                    
                    // Conversion Goals
                    if !website.settings.conversionGoals.isEmpty {
                        ModernCardView {
                            VStack(alignment: .leading, spacing: 16) {
                                Text("コンバージョン目標")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(DesignSystem.textPrimary)
                                
                                LazyVGrid(columns: [
                                    GridItem(.flexible()),
                                    GridItem(.flexible())
                                ], spacing: 8) {
                                    ForEach(website.settings.conversionGoals, id: \.self) { goal in
                                        Text(goal)
                                            .font(.caption)
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 4)
                                            .background(
                                                Capsule()
                                                    .fill(Color.green.opacity(0.1))
                                            )
                                            .foregroundColor(.green)
                                    }
                                }
                            }
                        }
                    }
                    
                    // Actions
                    VStack(spacing: 12) {
                        AnimatedButton(
                            title: "トラッキングコードを表示",
                            icon: "doc.text",
                            style: .primary,
                            action: { showingTrackingCode = true }
                        )
                        
                        AnimatedButton(
                            title: "ウェブサイトを削除",
                            icon: "trash",
                            style: .danger,
                            action: {
                                websiteManager.deleteWebsite(website)
                                dismiss()
                            }
                        )
                    }
                }
                .padding(DesignSystem.padding)
            }
            .background(DesignSystem.backgroundGradient)
            .navigationTitle("ウェブサイト詳細")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("閉じる") {
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showingSettingsSheet) {
                SettingsSheet(website: website)
            }
            .sheet(isPresented: $showingTrackingCode) {
                TrackingCodeSheet(website: website)
            }
        }
    }
}

struct SettingsSheet: View {
    let website: Website
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var websiteManager: WebsiteManager
    
    @State private var trackingEnabled: Bool
    @State private var heatmapEnabled: Bool
    @State private var abTestingEnabled: Bool
    @State private var privacyMode: Bool
    @State private var customEvents: [String]
    @State private var conversionGoals: [String]
    @State private var newCustomEvent = ""
    @State private var newConversionGoal = ""
    
    init(website: Website) {
        self.website = website
        self._trackingEnabled = State(initialValue: website.settings.trackingEnabled)
        self._heatmapEnabled = State(initialValue: website.settings.heatmapEnabled)
        self._abTestingEnabled = State(initialValue: website.settings.abTestingEnabled)
        self._privacyMode = State(initialValue: website.settings.privacyMode)
        self._customEvents = State(initialValue: website.settings.customEvents)
        self._conversionGoals = State(initialValue: website.settings.conversionGoals)
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("トラッキング設定") {
                    Toggle("ページビュートラッキング", isOn: $trackingEnabled)
                    Toggle("ヒートマップ", isOn: $heatmapEnabled)
                    Toggle("A/Bテスト", isOn: $abTestingEnabled)
                    Toggle("プライバシーモード", isOn: $privacyMode)
                }
                
                Section("カスタムイベント") {
                    ForEach(customEvents, id: \.self) { event in
                        HStack {
                            Text(event)
                            Spacer()
                            Button("削除") {
                                customEvents.removeAll { $0 == event }
                            }
                            .foregroundColor(.red)
                        }
                    }
                    
                    HStack {
                        TextField("新しいイベント", text: $newCustomEvent)
                        Button("追加") {
                            if !newCustomEvent.isEmpty {
                                customEvents.append(newCustomEvent)
                                newCustomEvent = ""
                            }
                        }
                        .disabled(newCustomEvent.isEmpty)
                    }
                }
                
                Section("コンバージョン目標") {
                    ForEach(conversionGoals, id: \.self) { goal in
                        HStack {
                            Text(goal)
                            Spacer()
                            Button("削除") {
                                conversionGoals.removeAll { $0 == goal }
                            }
                            .foregroundColor(.red)
                        }
                    }
                    
                    HStack {
                        TextField("新しい目標", text: $newConversionGoal)
                        Button("追加") {
                            if !newConversionGoal.isEmpty {
                                conversionGoals.append(newConversionGoal)
                                newConversionGoal = ""
                            }
                        }
                        .disabled(newConversionGoal.isEmpty)
                    }
                }
            }
            .navigationTitle("設定編集")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("キャンセル") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        saveSettings()
                    }
                }
            }
        }
    }
    
    private func saveSettings() {
        let newSettings = WebsiteSettings(
            trackingEnabled: trackingEnabled,
            heatmapEnabled: heatmapEnabled,
            abTestingEnabled: abTestingEnabled,
            privacyMode: privacyMode,
            customEvents: customEvents,
            conversionGoals: conversionGoals
        )
        
        let updatedWebsite = Website(
            id: website.id,
            name: website.name,
            url: website.url,
            description: website.description,
            trackingCode: websiteManager.generateTrackingCode(for: website.url, settings: newSettings),
            isActive: website.isActive,
            createdAt: website.createdAt,
            lastDataReceived: website.lastDataReceived,
            settings: newSettings
        )
        
        websiteManager.updateWebsite(updatedWebsite)
        dismiss()
    }
}

struct TrackingCodeSheet: View {
    let website: Website
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("トラッキングコード")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(DesignSystem.textPrimary)
                    
                    Text("このコードをウェブサイトの</head>タグの直前に貼り付けてください")
                        .font(.subheadline)
                        .foregroundColor(DesignSystem.textSecondary)
                }
                
                ScrollView {
                    Text(website.trackingCode)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundColor(DesignSystem.textPrimary)
                        .padding(12)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.gray.opacity(0.1))
                        )
                }
                
                HStack {
                    AnimatedButton(
                        title: "コピー",
                        icon: "doc.on.doc",
                        style: .primary,
                        action: {
                            NSPasteboard.general.clearContents()
                            NSPasteboard.general.setString(website.trackingCode, forType: .string)
                        }
                    )
                    
                    Spacer()
                    
                    AnimatedButton(
                        title: "閉じる",
                        icon: "xmark",
                        style: .secondary,
                        action: { dismiss() }
                    )
                }
            }
            .padding(DesignSystem.padding)
            .navigationTitle("トラッキングコード")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("閉じる") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    WebsiteManagementView()
        .environmentObject(WebsiteManager())
} 