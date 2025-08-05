import SwiftUI
import WebKit

struct WebViewWrapper: View {
    @EnvironmentObject var analyticsManager: AnalyticsManager
    @State private var urlString = "https://www.apple.com"
    @State private var isLoading = false
    @State private var canGoBack = false
    @State private var canGoForward = false
    @State private var hasInitialized = false
    @State private var shouldLoadURL = false
    @State private var loadError: String?
    @State private var currentLoadedURL: String = ""
    @State private var lastRequestedURL: String = ""
    @State private var isInitialLoad = true
    @State private var webView: WKWebView?
    @State private var isNavigating = false
    
    var body: some View {
        ZStack {
            Color.black
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Enhanced URL Bar
                VStack(spacing: 0) {
                    // Main URL Bar
                    HStack(spacing: 12) {
                        // Navigation Buttons
                        HStack(spacing: 8) {
                            Button(action: {
                                guard !isNavigating else { return }
                                webView?.goBack()
                            }) {
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(canGoBack ? .white : .gray)
                                    .frame(width: 32, height: 32)
                                    .background(
                                        RoundedRectangle(cornerRadius: 8)
                                            .fill(canGoBack ? Color.blue.opacity(0.2) : Color.gray.opacity(0.1))
                                    )
                            }
                            .disabled(!canGoBack || isNavigating)
                            
                            Button(action: {
                                guard !isNavigating else { return }
                                webView?.goForward()
                            }) {
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(canGoForward ? .white : .gray)
                                    .frame(width: 32, height: 32)
                                    .background(
                                        RoundedRectangle(cornerRadius: 8)
                                            .fill(canGoForward ? Color.blue.opacity(0.2) : Color.gray.opacity(0.1))
                                    )
                            }
                            .disabled(!canGoForward || isNavigating)
                            
                            Button(action: {
                                guard !isNavigating else { return }
                                webView?.reload()
                            }) {
                                Image(systemName: "arrow.clockwise")
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(.white)
                                    .frame(width: 32, height: 32)
                                    .background(
                                        RoundedRectangle(cornerRadius: 8)
                                            .fill(Color.green.opacity(0.2))
                                    )
                            }
                            .disabled(isNavigating)
                        }
                        
                        // URL Input Field
                        HStack {
                            Image(systemName: "globe")
                                .foregroundColor(.gray)
                                .font(.system(size: 14))
                            
                            TextField("URLを入力", text: $urlString)
                                .textFieldStyle(.plain)
                                .font(.system(size: 14))
                                .foregroundColor(.white)
                                .frame(minWidth: 0, maxWidth: .infinity)
                                .onSubmit {
                                    loadURL()
                                }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.gray.opacity(0.1))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                                )
                        )
                        
                        // Go Button
                        Button("移動") {
                            loadURL()
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.small)
                        .disabled(urlString.isEmpty || isNavigating)
                        
                        // Loading Indicator
                        if isLoading {
                            Image(systemName: "arrow.clockwise")
                                .font(.system(size: 16))
                                .foregroundColor(DesignSystem.textAccent)
                                .rotationEffect(.degrees(360))
                                .animation(.linear(duration: 1).repeatForever(autoreverses: false), value: isLoading)
                                .frame(width: 20, height: 20)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    
                    // Error Display
                    if let error = loadError {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.orange)
                                .font(.system(size: 14))
                            
                            Text(error)
                                .font(.caption)
                                .foregroundColor(.orange)
                                .lineLimit(2)
                            
                            Spacer()
                            
                            Button("再試行") {
                                loadError = nil
                                loadURL()
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.orange.opacity(0.1))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color.orange.opacity(0.3), lineWidth: 1)
                                )
                        )
                        .padding(.horizontal, 16)
                        .padding(.bottom, 8)
                    }
                }
                .background(
                    RoundedRectangle(cornerRadius: 0)
                        .fill(Color.gray.opacity(0.05))
                        .overlay(
                            Rectangle()
                                .frame(height: 1)
                                .foregroundColor(Color.gray.opacity(0.2))
                                .offset(y: 1)
                        )
                )
                
                // WebView
                WebViewRepresentable(
                    urlString: urlString,
                    shouldLoadURL: shouldLoadURL,
                    onURLLoaded: {
                        shouldLoadURL = false
                        currentLoadedURL = urlString
                        lastRequestedURL = urlString
                        loadError = nil
                        isInitialLoad = false
                        isNavigating = false
                    },
                    onLoadError: { error in
                        loadError = error
                        shouldLoadURL = false
                        isInitialLoad = false
                        isNavigating = false
                    },
                    analyticsManager: analyticsManager,
                    isLoading: $isLoading,
                    canGoBack: $canGoBack,
                    canGoForward: $canGoForward,
                    hasInitialized: $hasInitialized,
                    webView: $webView,
                    isNavigating: $isNavigating
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.black)
            }
        }
        .onAppear {
            // 初期化時に一度だけURLを読み込む
            if isInitialLoad {
                loadURL()
            }
        }
    }
    
    private func loadURL() {
        // ナビゲーション中は新しいリクエストを無視
        guard !isNavigating else { return }
        
        // URLの検証
        guard let url = URL(string: urlString),
              let scheme = url.scheme,
              (scheme == "http" || scheme == "https") else {
            loadError = "無効なURLです"
            return
        }
        
        // 同じURLの場合は読み込まない
        guard lastRequestedURL != urlString else {
            return
        }
        
        isNavigating = true
        shouldLoadURL = true
        lastRequestedURL = urlString
        loadError = nil
    }
}

// MARK: - WebView Message Handler

class WebViewMessageHandler: NSObject, WKScriptMessageHandler {
    private var analyticsManager: AnalyticsManager?
    
    func setAnalyticsManager(_ manager: AnalyticsManager?) {
        self.analyticsManager = manager
    }
    
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any] else { return }
        
        // AnalyticsManagerにデータを送信
        Task { @MainActor in
            analyticsManager?.processWebViewEvent(body)
        }
    }
}

// MARK: - WebView Representable

struct WebViewRepresentable: NSViewRepresentable {
    let urlString: String
    let shouldLoadURL: Bool
    let onURLLoaded: () -> Void
    let onLoadError: (String) -> Void
    var analyticsManager: AnalyticsManager
    @Binding var isLoading: Bool
    @Binding var canGoBack: Bool
    @Binding var canGoForward: Bool
    @Binding var hasInitialized: Bool
    @Binding var webView: WKWebView?
    @Binding var isNavigating: Bool
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    func makeNSView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        
        // メッセージハンドラーの設定
        let messageHandler = WebViewMessageHandler()
        messageHandler.setAnalyticsManager(analyticsManager)
        configuration.userContentController.add(messageHandler, name: "insight")
        
        // 設定の最適化
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
        
        // レンダリング設定の最適化
        configuration.mediaTypesRequiringUserActionForPlayback = []
        
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = false
        webView.allowsMagnification = false
        
        // レンダリングパフォーマンスの最適化
        webView.setValue(false, forKey: "drawsBackground")
        
        // webViewバインディングを更新
        DispatchQueue.main.async {
            self.webView = webView
        }
        
        // 初期URLを読み込み（shouldLoadURLがtrueの場合のみ）
        if shouldLoadURL, let url = URL(string: urlString) {
            let request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 30)
            webView.load(request)
        }
        
        return webView
    }
    
    func updateNSView(_ nsView: WKWebView, context: Context) {
        // webViewバインディングを更新
        DispatchQueue.main.async {
            self.webView = nsView
        }
        
        // URLが変更された場合のみ更新
        if shouldLoadURL && !isNavigating {
            if let url = URL(string: urlString) {
                let request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 30)
                nsView.load(request)
            }
        }
        
        // メッセージハンドラーの設定（一度だけ）
        if context.coordinator.parent.analyticsManager !== analyticsManager {
            context.coordinator.parent.analyticsManager = analyticsManager
        }
        
        // 状態の更新（バインディングを通じて更新）
        context.coordinator.updateBindings(
            isLoading: isLoading,
            canGoBack: canGoBack,
            canGoForward: canGoForward,
            hasInitialized: hasInitialized,
            isNavigating: isNavigating
        )
    }
    
    class Coordinator: NSObject, WKNavigationDelegate {
        var parent: WebViewRepresentable
        var analyticsManager: AnalyticsManager
        var onLoadError: ((String) -> Void)?
        private var retryCount = 0
        private let maxRetries = 3
        
        init(_ parent: WebViewRepresentable) {
            self.parent = parent
            self.analyticsManager = parent.analyticsManager
            self.onLoadError = parent.onLoadError
        }
        
        func updateBindings(isLoading: Bool, canGoBack: Bool, canGoForward: Bool, hasInitialized: Bool, isNavigating: Bool) {
            // 状態が実際に変更された場合のみ更新
            if self.parent.isLoading != isLoading ||
               self.parent.canGoBack != canGoBack ||
               self.parent.canGoForward != canGoForward ||
               self.parent.hasInitialized != hasInitialized ||
               self.parent.isNavigating != isNavigating {
                
                DispatchQueue.main.async {
                    self.parent.isLoading = isLoading
                    self.parent.canGoBack = canGoBack
                    self.parent.canGoForward = canGoForward
                    self.parent.hasInitialized = hasInitialized
                    self.parent.isNavigating = isNavigating
                }
            }
        }
        
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            parent.isLoading = true
            parent.isNavigating = true
            #if DEBUG
            print("WebView: Started loading URL: \(webView.url?.absoluteString ?? "unknown")")
            #endif
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            parent.isLoading = false
            parent.canGoBack = webView.canGoBack
            parent.canGoForward = webView.canGoForward
            parent.hasInitialized = true
            parent.isNavigating = false
            retryCount = 0 // 成功したらリトライカウントをリセット
            
            #if DEBUG
            print("WebView: Finished loading URL: \(webView.url?.absoluteString ?? "unknown")")
            #endif
            
            // ページ読み込み完了時にトラッキングスクリプトを注入
            injectTrackingScript(webView)
        }
        
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
            parent.isNavigating = false
            #if DEBUG
            print("WebView loading failed: \(error.localizedDescription)")
            print("Error domain: \(error._domain), code: \(error._code)")
            #endif
            
            handleLoadError(error, webView: webView)
        }
        
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
            parent.isNavigating = false
            #if DEBUG
            print("WebView provisional loading failed: \(error.localizedDescription)")
            print("Error domain: \(error._domain), code: \(error._code)")
            #endif
            
            handleLoadError(error, webView: webView)
        }
        
        private func handleLoadError(_ error: Error, webView: WKWebView) {
            // NSURLErrorDomain error -999 は通常キャンセルを示す
            if let urlError = error as? URLError {
                switch urlError.code {
                case .cancelled:
                    #if DEBUG
                    print("WebView navigation was cancelled - this is normal if user navigates quickly")
                    #endif
                    return // キャンセルエラーは表示しない
                case .timedOut:
                    #if DEBUG
                    print("WebView navigation timed out")
                    #endif
                    retryLoad(webView: webView, errorMessage: "ページの読み込みがタイムアウトしました")
                case .notConnectedToInternet:
                    #if DEBUG
                    print("WebView: No internet connection")
                    #endif
                    onLoadError?("インターネット接続がありません")
                case .networkConnectionLost:
                    #if DEBUG
                    print("WebView: Network connection lost")
                    #endif
                    retryLoad(webView: webView, errorMessage: "ネットワーク接続が失われました")
                default:
                    #if DEBUG
                    print("WebView error code: \(urlError.code.rawValue)")
                    #endif
                    retryLoad(webView: webView, errorMessage: "ページの読み込みに失敗しました: \(error.localizedDescription)")
                }
            } else {
                retryLoad(webView: webView, errorMessage: "ページの読み込みに失敗しました: \(error.localizedDescription)")
            }
        }
        
        private func retryLoad(webView: WKWebView, errorMessage: String) {
            if retryCount < maxRetries {
                retryCount += 1
                let delay = Double(retryCount) * 2.0 // 指数バックオフ
                #if DEBUG
                print("Retrying load in \(delay) seconds (attempt \(retryCount)/\(maxRetries))")
                #endif
                
                Task { @MainActor in
                    try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                    if let url = URL(string: self.parent.urlString) {
                        let request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 30)
                        webView.load(request)
                    }
                }
            } else {
                retryCount = 0
                onLoadError?(errorMessage)
            }
        }
        
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            // 外部リンクの処理
            if let url = navigationAction.request.url {
                // 同じドメイン内のナビゲーションは許可
                if let currentHost = webView.url?.host,
                   let newHost = url.host,
                   currentHost == newHost {
                    decisionHandler(.allow)
                } else {
                    // 外部リンクは新しいウィンドウで開くか、警告を表示
                    decisionHandler(.allow)
                }
            } else {
                decisionHandler(.allow)
            }
        }
        
        private func injectTrackingScript(_ webView: WKWebView) {
            let script = """
            (function() {
                'use strict';
                
                // セッションID生成
                function generateSessionId() {
                    return 'session_' + Math.random().toString(36).substr(2, 9);
                }
                
                // セッションID取得
                function getSessionId() {
                    let sessionId = sessionStorage.getItem('insight_session_id');
                    if (!sessionId) {
                        sessionId = generateSessionId();
                        sessionStorage.setItem('insight_session_id', sessionId);
                    }
                    return sessionId;
                }
                
                // データ送信
                function sendAnalytics(eventType, data) {
                    try {
                        const payload = {
                            eventType: eventType,
                            url: window.location.href,
                            sessionId: getSessionId(),
                            timestamp: new Date().toISOString(),
                            userAgent: navigator.userAgent,
                            referrer: document.referrer,
                            ...data
                        };
                        
                        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.insight) {
                            window.webkit.messageHandlers.insight.postMessage(payload);
                        }
                    } catch (error) {
                        console.log('Analytics error:', error);
                    }
                }
                
                // ページビュー追跡
                function trackPageView() {
                    sendAnalytics('pageview', {
                        title: document.title,
                        path: window.location.pathname
                    });
                }
                
                // クリック追跡
                function trackClick(event) {
                    try {
                        const element = event.target;
                        const rect = element.getBoundingClientRect();
                        
                        sendAnalytics('click', {
                            elementId: element.id || null,
                            elementClass: element.className || null,
                            elementTag: element.tagName.toLowerCase(),
                            x: event.clientX,
                            y: event.clientY,
                            elementX: rect.left + event.clientX,
                            elementY: rect.top + event.clientY,
                            elementText: element.textContent ? element.textContent.substring(0, 100) : null,
                            viewportWidth: window.innerWidth,
                            viewportHeight: window.innerHeight
                        });
                    } catch (error) {
                        console.log('Click tracking error:', error);
                    }
                }
                
                // スクロール追跡
                function trackScroll() {
                    try {
                        const scrollDepth = Math.round(
                            (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
                        );
                        
                        sendAnalytics('scroll', {
                            scrollDepth: scrollDepth,
                            scrollY: window.scrollY,
                            documentHeight: document.body.scrollHeight
                        });
                    } catch (error) {
                        console.log('Scroll tracking error:', error);
                    }
                }
                
                // コンバージョン追跡
                function trackConversion(goal, value = 0) {
                    sendAnalytics('conversion', {
                        goal: goal,
                        value: value
                    });
                }
                
                // 初期化
                function init() {
                    try {
                        trackPageView();
                        
                        document.addEventListener('click', trackClick);
                        window.addEventListener('scroll', throttle(trackScroll, 1000));
                        
                        // フォーム送信をコンバージョンとして追跡
                        document.addEventListener('submit', function(event) {
                            const form = event.target;
                            const goal = form.dataset.conversionGoal || 'form_submission';
                            trackConversion(goal);
                        });
                        
                        // 外部リンククリックを追跡
                        document.addEventListener('click', function(event) {
                            const link = event.target.closest('a');
                            if (link && link.hostname !== window.location.hostname) {
                                trackConversion('external_link', 0);
                            }
                        });
                        
                        // 購入ボタンクリックを追跡
                        document.addEventListener('click', function(event) {
                            const element = event.target;
                            if (element.textContent && element.textContent.includes('購入')) {
                                trackConversion('purchase_click', 0);
                            }
                        });
                    } catch (error) {
                        console.log('Analytics init error:', error);
                    }
                }
                
                // スロットリング関数
                function throttle(func, limit) {
                    let inThrottle;
                    return function() {
                        const args = arguments;
                        const context = this;
                        if (!inThrottle) {
                            func.apply(context, args);
                            inThrottle = true;
                            setTimeout(() => inThrottle = false, limit);
                        }
                    }
                }
                
                // グローバル関数として公開
                window.insight = {
                    trackPageView,
                    trackClick,
                    trackConversion
                };
                
                // DOM準備完了時に初期化
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', init);
                } else {
                    init();
                }
            })();
            """
            
            webView.evaluateJavaScript(script) { result, error in
                if let error = error {
                    #if DEBUG
                    print("Script injection error: \(error)")
                    #endif
                }
            }
        }
    }
}

#Preview {
    WebViewWrapper()
        .environmentObject(AnalyticsManager())
} 