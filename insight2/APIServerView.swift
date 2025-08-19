import SwiftUI

struct APIServerView: View {
    @EnvironmentObject var apiServerManager: APIServerManager
    @State private var showingServerSettings = false
    @State private var selectedLogLevel: LogLevel = .info
    
    enum LogLevel: String, CaseIterable {
        case debug = "デバッグ"
        case info = "情報"
        case warning = "警告"
        case error = "エラー"
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 16) {
                    HStack {
                        Text("APIサーバー")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(DesignSystem.textPrimary)
                        
                        Spacer()
                        
                        AnimatedButton(
                            title: apiServerManager.isServerRunning ? "停止" : "開始",
                            icon: apiServerManager.isServerRunning ? "stop.fill" : "play.fill",
                            style: apiServerManager.isServerRunning ? .danger : .success,
                            action: {
                                if apiServerManager.isServerRunning {
                                    Task {
                                        await apiServerManager.stopServer()
                                    }
                                } else {
                                    Task {
                                        await apiServerManager.startServer()
                                    }
                                }
                            }
                        )
                    }
                    
                    Text("アナリティクスデータを受信するAPIサーバーの状態と設定を管理します")
                        .font(.subheadline)
                        .foregroundColor(DesignSystem.textSecondary)
                        .multilineTextAlignment(.leading)
                }
                .padding(DesignSystem.padding)
                
                // Server Status
                ServerStatusCard()
                
                // Server Information
                ServerInfoCard()
                
                // Server Logs
                ServerLogsCard()
                
                Spacer()
            }
            .background(DesignSystem.backgroundGradient)
            .sheet(isPresented: $showingServerSettings) {
                ServerSettingsSheet()
            }
        }
    }
}

struct ServerStatusCard: View {
    @EnvironmentObject var apiServerManager: APIServerManager
    
    var body: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("サーバー状態")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(DesignSystem.textPrimary)
                    
                    Spacer()
                    
                    StatusIndicator(isActive: apiServerManager.isServerRunning)
                }
                
                HStack(spacing: 20) {
                    StatItem(
                        title: "ポート",
                        value: "8080",
                        icon: "network"
                    )
                    
                    StatItem(
                        title: "プロトコル",
                        value: "HTTP/WebSocket",
                        icon: "antenna.radiowaves.left.and.right"
                    )
                    
                    StatItem(
                        title: "認証",
                        value: "有効",
                        icon: "lock.fill"
                    )
                }
                
                if apiServerManager.isServerRunning {
                    Text("サーバーは正常に動作しています")
                        .font(.subheadline)
                        .foregroundColor(.green)
                } else {
                    Text("サーバーは停止中です")
                        .font(.subheadline)
                        .foregroundColor(.orange)
                }
            }
        }
        .padding(.horizontal, DesignSystem.padding)
    }
}

struct ServerInfoCard: View {
    @EnvironmentObject var apiServerManager: APIServerManager
    
    var body: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 16) {
                Text("サーバー情報")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(DesignSystem.textPrimary)
                
                VStack(spacing: 12) {
                    InfoRow(label: "サーバーURL", value: apiServerManager.getServerURL())
                    InfoRow(label: "イベントエンドポイント", value: apiServerManager.getEventsEndpoint())
                    InfoRow(label: "WebSocketエンドポイント", value: apiServerManager.getWebSocketEndpoint())
                }
                
                // Copy buttons
                HStack(spacing: 12) {
                    AnimatedButton(
                        title: "URLをコピー",
                        icon: "doc.on.doc",
                        style: .secondary,
                        action: {
                            NSPasteboard.general.clearContents()
                            NSPasteboard.general.setString(apiServerManager.getServerURL(), forType: .string)
                        }
                    )
                    
                    AnimatedButton(
                        title: "エンドポイントをコピー",
                        icon: "doc.on.doc",
                        style: .secondary,
                        action: {
                            NSPasteboard.general.clearContents()
                            NSPasteboard.general.setString(apiServerManager.getEventsEndpoint(), forType: .string)
                        }
                    )
                }
            }
        }
        .padding(.horizontal, DesignSystem.padding)
    }
}

struct ServerLogsCard: View {
    @EnvironmentObject var apiServerManager: APIServerManager
    @State private var selectedLogLevel: APIServerView.LogLevel = .info
    
    var filteredLogs: [String] {
        guard let server = apiServerManager.server else { return [] }
        
        return server.serverLog.filter { log in
            switch selectedLogLevel {
            case .debug:
                return true
            case .info:
                return !log.contains("DEBUG")
            case .warning:
                return log.contains("WARNING") || log.contains("ERROR")
            case .error:
                return log.contains("ERROR")
            }
        }
    }
    
    var body: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("サーバーログ")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(DesignSystem.textPrimary)
                    
                    Spacer()
                    
                    Picker("ログレベル", selection: $selectedLogLevel) {
                        ForEach(APIServerView.LogLevel.allCases, id: \.self) { level in
                            Text(level.rawValue).tag(level)
                        }
                    }
                    .pickerStyle(.menu)
                }
                
                if let server = apiServerManager.server {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("接続数: \(server.activeConnections)")
                                .font(.caption)
                                .foregroundColor(DesignSystem.textSecondary)
                            
                            Spacer()
                            
                            Text("総リクエスト: \(server.totalRequests)")
                                .font(.caption)
                                .foregroundColor(DesignSystem.textSecondary)
                            
                            Text("エラー数: \(server.errorCount)")
                                .font(.caption)
                                .foregroundColor(DesignSystem.textSecondary)
                        }
                        
                        ScrollView {
                            LazyVStack(alignment: .leading, spacing: 4) {
                                ForEach(filteredLogs.suffix(50), id: \.self) { log in
                                    Text(log)
                                        .font(.system(.caption, design: .monospaced))
                                        .foregroundColor(logColor(for: log))
                                }
                            }
                        }
                        .frame(height: 200)
                        .padding(8)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.gray.opacity(0.1))
                        )
                    }
                } else {
                    Text("サーバーが起動していません")
                        .font(.subheadline)
                        .foregroundColor(DesignSystem.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding()
                }
                
                HStack {
                    AnimatedButton(
                        title: "ログをクリア",
                        icon: "trash",
                        style: .secondary,
                        action: {
                            apiServerManager.server?.clearLogs()
                        }
                    )
                    
                    Spacer()
                    
                    AnimatedButton(
                        title: "ログをエクスポート",
                        icon: "square.and.arrow.up",
                        style: .secondary,
                        action: {
                            exportLogs()
                        }
                    )
                }
            }
        }
        .padding(.horizontal, DesignSystem.padding)
    }
    
    private func logColor(for log: String) -> Color {
        if log.contains("ERROR") {
            return .red
        } else if log.contains("WARNING") {
            return .orange
        } else if log.contains("INFO") {
            return .blue
        } else {
            return DesignSystem.textPrimary
        }
    }
    
    private func exportLogs() {
        guard let server = apiServerManager.server else { return }
        
        let logs = server.serverLog.joined(separator: "\n")
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(logs, forType: .string)
    }
}

struct ServerSettingsSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var port: String = "8080"
    @State private var enableAuthentication = true
    @State private var enableRateLimiting = true
    @State private var maxRequestsPerMinute: String = "100"
    @State private var enableWebSocket = true
    @State private var enableCORS = true
    
    var body: some View {
        NavigationView {
            Form {
                Section("基本設定") {
                    HStack {
                        Text("ポート")
                        Spacer()
                        TextField("ポート", text: $port)
                            .textFieldStyle(.roundedBorder)
                            .frame(width: 100)
                    }
                    
                    Toggle("認証を有効にする", isOn: $enableAuthentication)
                    Toggle("CORSを有効にする", isOn: $enableCORS)
                }
                
                Section("レート制限") {
                    Toggle("レート制限を有効にする", isOn: $enableRateLimiting)
                    
                    if enableRateLimiting {
                        HStack {
                            Text("最大リクエスト数/分")
                            Spacer()
                            TextField("最大リクエスト数", text: $maxRequestsPerMinute)
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 100)
                        }
                    }
                }
                
                Section("WebSocket") {
                    Toggle("WebSocketを有効にする", isOn: $enableWebSocket)
                }
                
                Section("セキュリティ") {
                    Text("APIキー: insight-api-key-2024")
                        .font(.caption)
                        .foregroundColor(DesignSystem.textSecondary)
                    
                    Text("認証トークンは24時間で期限切れになります")
                        .font(.caption)
                        .foregroundColor(DesignSystem.textSecondary)
                }
            }
            .navigationTitle("サーバー設定")
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
        // 設定を保存する処理
        dismiss()
    }
}

struct APIEndpointCard: View {
    let title: String
    let endpoint: String
    let method: String
    let description: String
    
    var body: some View {
        ModernCardView {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text(title)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(DesignSystem.textPrimary)
                    
                    Spacer()
                    
                    Text(method)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            Capsule()
                                .fill(methodColor.opacity(0.2))
                        )
                        .foregroundColor(methodColor)
                }
                
                Text(endpoint)
                    .font(.system(.subheadline, design: .monospaced))
                    .foregroundColor(DesignSystem.textSecondary)
                
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(DesignSystem.textSecondary)
                
                AnimatedButton(
                    title: "コピー",
                    icon: "doc.on.doc",
                    style: .secondary,
                    action: {
                        NSPasteboard.general.clearContents()
                        NSPasteboard.general.setString(endpoint, forType: .string)
                    }
                )
            }
        }
    }
    
    private var methodColor: Color {
        switch method {
        case "GET":
            return .green
        case "POST":
            return .blue
        case "PUT":
            return .orange
        case "DELETE":
            return .red
        default:
            return .gray
        }
    }
}

#Preview {
    APIServerView()
        .environmentObject(APIServerManager(analyticsManager: AnalyticsManager(), websiteManager: WebsiteManager()))
} 