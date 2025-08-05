import SwiftUI

struct WebsiteManagementView: View {
    @EnvironmentObject var websiteManager: WebsiteManager
    @State private var showingAddWebsite = false
    @State private var selectedWebsite: Website?
    @State private var showingWebsiteDetails = false
    
    var body: some View {
        VStack(spacing: 20) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Webサイト管理")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("登録されたWebサイトの管理とトラッキング設定")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Button("Webサイトを追加") {
                    showingAddWebsite = true
                }
                .buttonStyle(.borderedProminent)
            }
            .padding(.horizontal)
            
            // Website List
            if websiteManager.websites.isEmpty {
                EmptyStateView(
                    icon: "globe",
                    title: "Webサイトが登録されていません",
                    message: "「Webサイトを追加」ボタンをタップして、最初のWebサイトを登録してください。",
                    actionTitle: "Webサイトを追加",
                    action: {
                        showingAddWebsite = true
                    }
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: 16) {
                        ForEach(websiteManager.websites) { website in
                            WebsiteCard(website: website) {
                                selectedWebsite = website
                                showingWebsiteDetails = true
                            }
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
        .sheet(isPresented: $showingAddWebsite) {
            AddWebsiteView()
                .environmentObject(websiteManager)
        }
        .sheet(isPresented: $showingWebsiteDetails) {
            if let website = selectedWebsite {
                WebsiteDetailView(website: website)
                    .environmentObject(websiteManager)
            }
        }
    }
}

// MARK: - Website Card

struct WebsiteCard: View {
    let website: Website
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(website.name)
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                        
                        Text(website.url)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Badge(text: website.isActive ? "有効" : "無効", color: website.isActive ? .green : .red)
                        
                        if let lastData = website.lastDataReceived {
                            Text("最終データ: \(lastData, style: .relative)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                if let description = website.description {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                
                HStack {
                    Label("\(website.settings.trackingEnabled ? "有効" : "無効")", systemImage: "antenna.radiowaves.left.and.right")
                        .font(.caption)
                        .foregroundColor(website.settings.trackingEnabled ? .green : .red)
                    
                    Spacer()
                    
                    Label("\(website.settings.heatmapEnabled ? "有効" : "無効")", systemImage: "flame.fill")
                        .font(.caption)
                        .foregroundColor(website.settings.heatmapEnabled ? .green : .red)
                    
                    Spacer()
                    
                    Label("\(website.settings.abTestingEnabled ? "有効" : "無効")", systemImage: "arrow.left.arrow.right")
                        .font(.caption)
                        .foregroundColor(website.settings.abTestingEnabled ? .green : .red)
                }
            }
            .padding()
            .background(Color(.controlBackgroundColor))
            .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
    }
}



// MARK: - Empty State View

// EmptyStateView is now defined in CommonViews.swift

// MARK: - Add Website View

struct AddWebsiteView: View {
    @EnvironmentObject var websiteManager: WebsiteManager
    @Environment(\.dismiss) private var dismiss
    
    @State private var name = ""
    @State private var url = ""
    @State private var description = ""
    @State private var showingError = false
    @State private var errorMessage = ""
    
    var body: some View {
        NavigationView {
            VStack {
                VStack(alignment: .leading, spacing: 16) {
                    Text("基本情報")
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    VStack(spacing: 12) {
                        TextField("Webサイト名", text: $name)
                            .textFieldStyle(.roundedBorder)
                        
                        TextField("URL", text: $url)
                            .textFieldStyle(.roundedBorder)
                            .textContentType(.URL)
                        
                        TextField("説明（オプション）", text: $description, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                            .lineLimit(3...6)
                    }
                }
                .padding()
                
                VStack(alignment: .leading, spacing: 16) {
                    Text("設定")
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    NavigationLink("トラッキング設定") {
                        TrackingSettingsView()
                    }
                }
                .padding()
                
                Spacer()
            }
            .navigationTitle("Webサイトを追加")
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
        }
        .alert("エラー", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage)
        }
    }
    
    private func addWebsite() {
        // バリデーション
        guard !name.isEmpty else {
            errorMessage = "Webサイト名を入力してください"
            showingError = true
            return
        }
        
        guard !url.isEmpty else {
            errorMessage = "URLを入力してください"
            showingError = true
            return
        }
        
        guard websiteManager.validateWebsiteURL(url) else {
            errorMessage = "有効なURLを入力してください"
            showingError = true
            return
        }
        
        guard websiteManager.isWebsiteNameUnique(name) else {
            errorMessage = "このWebサイト名は既に使用されています"
            showingError = true
            return
        }
        
        // Webサイトを追加
        websiteManager.addWebsite(
            name: name,
            url: url,
            description: description.isEmpty ? nil : description
        )
        
        dismiss()
    }
}

// MARK: - Website Detail View

struct WebsiteDetailView: View {
    let website: Website
    @EnvironmentObject var websiteManager: WebsiteManager
    @Environment(\.dismiss) private var dismiss
    
    @State private var showingTrackingCode = false
    @State private var showingSettings = false
    @State private var showingDeleteAlert = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Website Info
                    VStack(alignment: .leading, spacing: 12) {
                        Text("基本情報")
                            .font(.headline)
                            .fontWeight(.semibold)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            InfoRow(label: "名前", value: website.name)
                            InfoRow(label: "URL", value: website.url)
                            if let description = website.description {
                                InfoRow(label: "説明", value: description)
                            }
                            InfoRow(label: "登録日", value: website.createdAt.formatted(date: .abbreviated, time: .shortened))
                            if let lastData = website.lastDataReceived {
                                InfoRow(label: "最終データ", value: lastData.formatted(date: .abbreviated, time: .shortened))
                            }
                        }
                    }
                    .padding()
                    .background(Color(.controlBackgroundColor))
                    .cornerRadius(12)
                    
                    // Settings Summary
                    VStack(alignment: .leading, spacing: 12) {
                        Text("設定")
                            .font(.headline)
                            .fontWeight(.semibold)
                        
                        VStack(spacing: 8) {
                            SettingRow(
                                title: "トラッキング",
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
                    .padding()
                    .background(Color(.controlBackgroundColor))
                    .cornerRadius(12)
                    
                    // Actions
                    VStack(spacing: 12) {
                        Button("トラッキングコードを表示") {
                            showingTrackingCode = true
                        }
                        .buttonStyle(.borderedProminent)
                        .frame(maxWidth: .infinity)
                        
                        Button("設定を編集") {
                            showingSettings = true
                        }
                        .buttonStyle(.bordered)
                        .frame(maxWidth: .infinity)
                        
                        Button("Webサイトを削除") {
                            showingDeleteAlert = true
                        }
                        .buttonStyle(.bordered)
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity)
                    }
                }
                .padding()
            }
            .navigationTitle(website.name)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") {
                        dismiss()
                    }
                }
            }
        }
        .sheet(isPresented: $showingTrackingCode) {
            TrackingCodeView(website: website)
        }
        .sheet(isPresented: $showingSettings) {
            WebsiteSettingsView(website: website)
                .environmentObject(websiteManager)
        }
        .alert("Webサイトを削除", isPresented: $showingDeleteAlert) {
            Button("削除", role: .destructive) {
                websiteManager.deleteWebsite(website)
                dismiss()
            }
            Button("キャンセル", role: .cancel) { }
        } message: {
            Text("「\(website.name)」を削除しますか？この操作は元に戻せません。")
        }
    }
}

// MARK: - Tracking Code View

struct TrackingCodeView: View {
    let website: Website
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 16) {
                Text("以下のコードをWebサイトのHTMLの<head>セクションに追加してください:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding(.horizontal)
                
                ScrollView {
                    Text(website.trackingCode)
                        .font(.system(.caption, design: .monospaced))
                        .padding()
                        .background(Color(.textBackgroundColor))
                        .cornerRadius(8)
                        .padding(.horizontal)
                }
            }
                    .navigationTitle("トラッキングコード")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .primaryAction) {
                    Button("コピー") {
                        NSPasteboard.general.clearContents()
                        NSPasteboard.general.setString(website.trackingCode, forType: .string)
                    }
                }
            }
        }
    }
}

// MARK: - Tracking Settings View

struct TrackingSettingsView: View {
    @State private var trackingEnabled = true
    @State private var heatmapEnabled = true
    @State private var abTestingEnabled = true
    @State private var privacyMode = false
    @State private var customEvents: [String] = []
    @State private var conversionGoals: [String] = []
    @State private var newCustomEvent = ""
    @State private var newConversionGoal = ""
    
    var body: some View {
        Form {
            Section("基本設定") {
                Toggle("トラッキングを有効にする", isOn: $trackingEnabled)
                Toggle("ヒートマップを有効にする", isOn: $heatmapEnabled)
                Toggle("A/Bテストを有効にする", isOn: $abTestingEnabled)
                Toggle("プライバシーモード", isOn: $privacyMode)
            }
            
            Section("カスタムイベント") {
                ForEach(customEvents, id: \.self) { event in
                    Text(event)
                }
                .onDelete(perform: deleteCustomEvent)
                
                HStack {
                    TextField("新しいイベント名", text: $newCustomEvent)
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
                    Text(goal)
                }
                .onDelete(perform: deleteConversionGoal)
                
                HStack {
                    TextField("新しい目標名", text: $newConversionGoal)
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
        .navigationTitle("トラッキング設定")
    }
    
    private func deleteCustomEvent(offsets: IndexSet) {
        customEvents.remove(atOffsets: offsets)
    }
    
    private func deleteConversionGoal(offsets: IndexSet) {
        conversionGoals.remove(atOffsets: offsets)
    }
}

// MARK: - Setting Row

struct SettingRow: View {
    let title: String
    let isEnabled: Bool
    let icon: String
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(isEnabled ? .green : .red)
                .frame(width: 20)
            
            Text(title)
                .font(.subheadline)
            
            Spacer()
            
            Text(isEnabled ? "有効" : "無効")
                .font(.caption)
                .foregroundColor(isEnabled ? .green : .red)
        }
    }
}

// MARK: - Website Settings View

struct WebsiteSettingsView: View {
    let website: Website
    @EnvironmentObject var websiteManager: WebsiteManager
    @Environment(\.dismiss) private var dismiss
    
    @State private var settings: WebsiteSettings
    @State private var newCustomEvent: String = ""
    @State private var newConversionGoal: String = ""
    
    init(website: Website) {
        self.website = website
        self._settings = State(initialValue: website.settings)
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("基本設定") {
                    Toggle("トラッキングを有効にする", isOn: $settings.trackingEnabled)
                    Toggle("ヒートマップを有効にする", isOn: $settings.heatmapEnabled)
                    Toggle("A/Bテストを有効にする", isOn: $settings.abTestingEnabled)
                    Toggle("プライバシーモード", isOn: $settings.privacyMode)
                }
                
                Section("カスタムイベント") {
                    ForEach(settings.customEvents, id: \.self) { event in
                        Text(event)
                    }
                    .onDelete(perform: deleteCustomEvent)
                    
                    HStack {
                        TextField("新しいイベント名", text: $newCustomEvent)
                        Button("追加") {
                            let trimmed = newCustomEvent.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !trimmed.isEmpty, !settings.customEvents.contains(trimmed) else { return }
                            settings.customEvents.append(trimmed)
                            newCustomEvent = ""
                        }
                        .disabled(newCustomEvent.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                }
                
                Section("コンバージョン目標") {
                    ForEach(settings.conversionGoals, id: \.self) { goal in
                        Text(goal)
                    }
                    .onDelete(perform: deleteConversionGoal)
                    
                    HStack {
                        TextField("新しい目標名", text: $newConversionGoal)
                        Button("追加") {
                            let trimmed = newConversionGoal.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !trimmed.isEmpty, !settings.conversionGoals.contains(trimmed) else { return }
                            settings.conversionGoals.append(trimmed)
                            newConversionGoal = ""
                        }
                        .disabled(newConversionGoal.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                }
            }
            .navigationTitle("設定")
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
    
    private func deleteCustomEvent(offsets: IndexSet) {
        settings.customEvents.remove(atOffsets: offsets)
    }
    
    private func deleteConversionGoal(offsets: IndexSet) {
        settings.conversionGoals.remove(atOffsets: offsets)
    }
    
    private func saveSettings() {
        let updatedWebsite = Website(
            id: website.id,
            name: website.name,
            url: website.url,
            description: website.description,
            trackingCode: website.trackingCode,
            isActive: website.isActive,
            createdAt: website.createdAt,
            lastDataReceived: website.lastDataReceived,
            settings: settings
        )
        
        websiteManager.updateWebsite(updatedWebsite)
        dismiss()
    }
}

#Preview {
    WebsiteManagementView()
        .environmentObject(WebsiteManager())
} 