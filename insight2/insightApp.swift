import SwiftUI

@main
struct insightApp: App {
    @StateObject private var analyticsManager = AnalyticsManager()
    @StateObject private var websiteManager = WebsiteManager()
    @StateObject private var apiServerManager: APIServerManager
    @StateObject private var reportManager: ReportManager
    
    init() {
        // StateObjectの初期化を正しい順序で行う
        let tempAnalyticsManager = AnalyticsManager()
        let tempWebsiteManager = WebsiteManager()
        let tempApiServerManager = APIServerManager(analyticsManager: tempAnalyticsManager, websiteManager: tempWebsiteManager)
        let tempReportManager = ReportManager(analyticsManager: tempAnalyticsManager, websiteManager: tempWebsiteManager)
        
        self._analyticsManager = StateObject(wrappedValue: tempAnalyticsManager)
        self._websiteManager = StateObject(wrappedValue: tempWebsiteManager)
        self._apiServerManager = StateObject(wrappedValue: tempApiServerManager)
        self._reportManager = StateObject(wrappedValue: tempReportManager)
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(analyticsManager)
                .environmentObject(websiteManager)
                .environmentObject(apiServerManager)
                .environmentObject(reportManager)
                .onAppear {
                    // アプリケーション起動時の初期化処理
                    setupApplication()
                }
        }
        .windowStyle(.hiddenTitleBar)
        .windowResizability(.contentSize)
    }
    
    private func setupApplication() {
        // アプリケーションの初期化処理
        #if DEBUG
        print("Insight2 Analytics App Started")
        #endif
        
        // エラーハンドリングの設定
        setupErrorHandling()
        
        // APIサーバーの自動起動（開発環境のみ）
        #if DEBUG
        Task {
            await apiServerManager.startServer()
        }
        #endif
    }
    
    private func setupErrorHandling() {
        // 未処理のエラーをキャッチ
        NSSetUncaughtExceptionHandler { exception in
            #if DEBUG
            print("Uncaught Exception: \(exception)")
            print("Stack Trace: \(exception.callStackSymbols)")
            #endif
        }
    }
} 