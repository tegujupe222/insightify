import SwiftUI

struct APIServerView: View {
    @EnvironmentObject var apiServerManager: APIServerManager
    @State private var showingLogs = false
    
    var body: some View {
        VStack(spacing: 20) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("APIサーバー")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("Webサイトからのデータ受信サーバー")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Button(apiServerManager.isServerRunning ? "停止" : "起動") {
                    if apiServerManager.isServerRunning {
                        Task { await apiServerManager.stopServer() }
                    } else {
                        Task { await apiServerManager.startServer() }
                    }
                }
                .buttonStyle(.borderedProminent)
                .foregroundColor(apiServerManager.isServerRunning ? .red : .green)
            }
            .padding(.horizontal)
            
            // Server Status
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("サーバー状態")
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    HStack {
                        StatusIndicator(isActive: apiServerManager.isServerRunning)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text(apiServerManager.isServerRunning ? "実行中" : "停止中")
                                .font(.subheadline)
                                .fontWeight(.medium)
                            
                            Text(apiServerManager.isServerRunning ? "データを受信中" : "サーバーが停止しています")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                    }
                }
                .padding()
                .background(Color(.controlBackgroundColor))
                .cornerRadius(12)
            }
            .padding(.horizontal)
            
            // Endpoints
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("エンドポイント")
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    VStack(spacing: 8) {
                        EndpointRow(
                            title: "イベント受信",
                            endpoint: "POST /events",
                            url: apiServerManager.getEventsEndpoint(),
                            description: "Webサイトからのトラッキングデータを受信"
                        )
                        
                        EndpointRow(
                            title: "A/Bテスト取得",
                            endpoint: "GET /api/v1/ab-tests",
                            url: "\(apiServerManager.getServerURL())/api/v1/ab-tests",
                            description: "実行中のA/Bテスト情報を取得"
                        )
                        
                        EndpointRow(
                            title: "ヘルスチェック",
                            endpoint: "GET /health",
                            url: "\(apiServerManager.getServerURL())/health",
                            description: "サーバーの状態を確認"
                        )
                    }
                }
                .padding()
                .background(Color(.textBackgroundColor))
                .cornerRadius(12)
            }
            .padding(.horizontal)
            
            // Server Logs
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("サーバーログ")
                            .font(.headline)
                            .fontWeight(.semibold)
                        
                        Spacer()
                        
                        Button("ログを表示") {
                            showingLogs = true
                        }
                        .buttonStyle(.bordered)
                    }
                    
                    if let server = apiServerManager.server {
                        Text("受信イベント: \(server.receivedEvents.count)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
                .background(Color(.textBackgroundColor))
                .cornerRadius(12)
            }
            .padding(.horizontal)
            
            // Instructions
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("使用方法")
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("1. サーバーを起動")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            Text("「起動」ボタンをタップしてAPIサーバーを開始します。")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            Text("2. Webサイトを登録")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            Text("Webサイト管理でトラッキングしたいサイトを登録します。")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            Text("3. トラッキングコードを配置")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            Text("生成されたトラッキングコードをWebサイトのHTMLに追加します。")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            Text("4. データを確認")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            Text("Webサイトでアクセスがあると、ここでデータを受信できます。")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding()
                .background(Color(.textBackgroundColor))
                .cornerRadius(12)
            }
            .padding(.horizontal)
        }
        .sheet(isPresented: $showingLogs) {
            ServerLogsView()
                .environmentObject(apiServerManager)
        }
    }
}

// MARK: - Status Indicator

struct StatusIndicator: View {
    let isActive: Bool
    
    var body: some View {
        Circle()
            .fill(isActive ? Color.green : Color.red)
            .frame(width: 12, height: 12)
            .overlay(
                Circle()
                    .stroke(Color.primary.opacity(0.2), lineWidth: 2)
            )
    }
}

// MARK: - Endpoint Row

struct EndpointRow: View {
    let title: String
    let endpoint: String
    let url: String
    let description: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Spacer()
                
                Text(endpoint)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(4)
            }
            
            Text(url)
                .font(.caption)
                .foregroundColor(.secondary)
                .textSelection(.enabled)
            
            Text(description)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.textBackgroundColor))
        .cornerRadius(8)
    }
}

// MARK: - Server Logs View

struct ServerLogsView: View {
    @EnvironmentObject var apiServerManager: APIServerManager
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                if let server = apiServerManager.server {
                    // Logs
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 8) {
                            ForEach(server.serverLog, id: \.self) { log in
                                Text(log)
                                    .font(.system(.caption, design: .monospaced))
                                    .foregroundColor(.primary)
                                    .padding(.horizontal)
                            }
                        }
                        .padding(.vertical)
                    }
                    
                    // Events
                    VStack(alignment: .leading, spacing: 12) {
                        Text("受信イベント")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .padding(.horizontal)
                        
                        ScrollView {
                            LazyVStack(spacing: 8) {
                                ForEach(server.receivedEvents, id: \.timestamp) { event in
                                    EventRow(event: event)
                                }
                            }
                            .padding(.horizontal)
                        }
                        .frame(height: 200)
                    }
                    .padding(.vertical)
                    .background(Color(.textBackgroundColor))
                } else {
                    Text("サーバーが起動していません")
                        .font(.headline)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .navigationTitle("サーバーログ")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") {
                        dismiss()
                    }
                }
                
                if let server = apiServerManager.server {
                    ToolbarItem(placement: .primaryAction) {
                        Button("クリア") {
                            server.clearLogs()
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Event Row

struct EventRow: View {
    let event: APIEvent
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(event.eventType)
                    .font(.caption)
                    .fontWeight(.medium)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(eventColor.opacity(0.2))
                    .cornerRadius(4)
                
                Spacer()
                
                Text(event.timestamp)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            Text(event.url)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(1)
            
            if let referrer = event.referrer {
                Text("From: \(referrer)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
        }
        .padding()
        .background(Color(.textBackgroundColor))
        .cornerRadius(8)
    }
    
    private var eventColor: Color {
        switch event.eventType {
        case "pageview":
            return .blue
        case "click":
            return .green
        case "scroll":
            return .orange
        case "conversion":
            return .purple
        case "custom":
            return .pink
        default:
            return .gray
        }
    }
}

#Preview {
    APIServerView()
        .environmentObject(APIServerManager(
            analyticsManager: AnalyticsManager(),
            websiteManager: WebsiteManager()
        ))
} 