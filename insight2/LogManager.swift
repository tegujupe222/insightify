import Foundation
import OSLog
import Combine

// MARK: - Log Levels

enum LogLevel: String, CaseIterable, Codable {
    case debug = "DEBUG"
    case info = "INFO"
    case warning = "WARNING"
    case error = "ERROR"
    case critical = "CRITICAL"
    
    var emoji: String {
        switch self {
        case .debug: return "🔍"
        case .info: return "ℹ️"
        case .warning: return "⚠️"
        case .error: return "❌"
        case .critical: return "🚨"
        }
    }
    
    var osLogType: OSLogType {
        switch self {
        case .debug: return .debug
        case .info: return .info
        case .warning: return .default
        case .error: return .error
        case .critical: return .fault
        }
    }
}

// MARK: - Log Categories

enum LogCategory: String, CaseIterable, Codable {
    case analytics = "Analytics"
    case network = "Network"
    case database = "Database"
    case ui = "UI"
    case security = "Security"
    case performance = "Performance"
    case api = "API"
    case tracking = "Tracking"
    case report = "Report"
    case system = "System"
}

// MARK: - Log Entry

struct LogEntry: Codable, Identifiable {
    let id: UUID
    let timestamp: Date
    let level: LogLevel
    let category: LogCategory
    let message: String
    let details: [String: String]?
    let errorDescription: String?
    let stackTrace: String?
    let sessionId: String?
    let userId: String?
    
    init(level: LogLevel, category: LogCategory, message: String, details: [String: String]? = nil, error: Error? = nil, stackTrace: String? = nil, sessionId: String? = nil, userId: String? = nil) {
        self.id = UUID()
        self.timestamp = Date()
        self.level = level
        self.category = category
        self.message = message
        self.details = details
        self.errorDescription = error?.localizedDescription
        self.stackTrace = stackTrace
        self.sessionId = sessionId
        self.userId = userId
    }
}

// MARK: - Log Manager

@MainActor
class LogManager: ObservableObject {
    @Published var logs: [LogEntry] = []
    @Published var isLoggingEnabled = true
    @Published var logLevel: LogLevel = .info
    @Published var maxLogEntries = 1000
    
    private let osLogger = Logger(subsystem: "com.igafactory.insight2", category: "main")
    private let fileLogger = FileLogger()
    private let crashReporter = CrashReporter()
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    
    init() {
        setupLogging()
        setupCrashReporting()
    }
    
    private func setupLogging() {
        // ログレベルの変更を監視
        $logLevel
            .sink { [weak self] level in
                self?.log(.info, category: .system, message: "ログレベルを変更しました: \(level.rawValue)")
            }
            .store(in: &cancellables)
        
        // ログの自動クリーンアップ
        Timer.publish(every: 300, on: .main, in: .common) // 5分ごと
            .autoconnect()
            .sink { [weak self] _ in
                self?.cleanupOldLogs()
            }
            .store(in: &cancellables)
    }
    
    private func setupCrashReporting() {
        // 未処理の例外をキャッチ
        NSSetUncaughtExceptionHandler { exception in
            Task { @MainActor in
                let details = [
                    "exceptionName": exception.name.rawValue,
                    "reason": exception.reason ?? "No reason"
                ]
                LogManager.shared.log(
                    .critical,
                    category: .system,
                    message: "未処理の例外が発生しました",
                    details: details,
                    error: nil,
                    stackTrace: exception.callStackSymbols.joined(separator: "\n"),
                    sessionId: nil,
                    userId: nil
                )
            }
        }
    }
    
    // MARK: - Logging Methods
    
    func log(_ level: LogLevel, category: LogCategory, message: String, details: [String: String]? = nil, error: Error? = nil, stackTrace: String? = nil, sessionId: String? = nil, userId: String? = nil) {
        guard isLoggingEnabled && level.rawValue >= logLevel.rawValue else { return }
        
        let entry = LogEntry(
            level: level,
            category: category,
            message: message,
            details: details,
            error: error,
            stackTrace: stackTrace,
            sessionId: sessionId,
            userId: userId
        )
        
        // メモリに保存
        logs.append(entry)
        
        // ログエントリ数を制限
        if logs.count > maxLogEntries {
            logs.removeFirst(logs.count - maxLogEntries)
        }
        
        // OS Loggerに出力
        let osLogMessage = "\(level.emoji) [\(category.rawValue)] \(message)"
        osLogger.log(level: level.osLogType, "\(osLogMessage)")
        
        // ファイルに保存
        fileLogger.write(entry)
        
        // エラーの場合はクラッシュレポートに送信
        if level == .error || level == .critical {
            crashReporter.report(entry)
        }
        
        // デバッグ出力
        #if DEBUG
        print("\(level.emoji) [\(category.rawValue)] \(message)")
        if let error = error {
            print("   Error: \(error.localizedDescription)")
        }
        if let details = details {
            print("   Details: \(details)")
        }
        #endif
    }
    
    // MARK: - Convenience Methods
    
    func debug(_ message: String, category: LogCategory = .system, details: [String: String]? = nil) {
        log(.debug, category: category, message: message, details: details)
    }
    
    func info(_ message: String, category: LogCategory = .system, details: [String: String]? = nil) {
        log(.info, category: category, message: message, details: details)
    }
    
    func warning(_ message: String, category: LogCategory = .system, details: [String: String]? = nil, error: Error? = nil) {
        log(.warning, category: category, message: message, details: details, error: error)
    }
    
    func error(_ message: String, category: LogCategory = .system, details: [String: String]? = nil, error: Error? = nil, stackTrace: String? = nil) {
        log(.error, category: category, message: message, details: details, error: error, stackTrace: stackTrace)
    }
    
    func critical(_ message: String, category: LogCategory = .system, details: [String: String]? = nil, error: Error? = nil, stackTrace: String? = nil) {
        log(.critical, category: category, message: message, details: details, error: error, stackTrace: stackTrace)
    }
    
    // MARK: - Analytics Logging
    
    func logAnalyticsEvent(_ eventType: String, data: [String: Any], sessionId: String? = nil) {
        let details = data.mapValues { "\($0)" }
        log(.info, category: .analytics, message: "Analytics Event: \(eventType)", details: details, sessionId: sessionId)
    }
    
    func logNetworkRequest(_ url: String, method: String, statusCode: Int? = nil, error: Error? = nil) {
        var details: [String: String] = ["url": url, "method": method]
        if let statusCode = statusCode {
            details["statusCode"] = "\(statusCode)"
        }
        
        let message = "Network Request: \(method) \(url)"
        let level: LogLevel = error != nil ? .error : .info
        let category: LogCategory = .network
        
        log(level, category: category, message: message, details: details, error: error)
    }
    
    func logDatabaseOperation(_ operation: String, table: String, recordCount: Int? = nil, error: Error? = nil) {
        var details: [String: String] = ["operation": operation, "table": table]
        if let recordCount = recordCount {
            details["recordCount"] = "\(recordCount)"
        }
        
        let message = "Database Operation: \(operation) on \(table)"
        let level: LogLevel = error != nil ? .error : .info
        let category: LogCategory = .database
        
        log(level, category: category, message: message, details: details, error: error)
    }
    
    func logPerformance(_ operation: String, duration: TimeInterval, details: [String: String]? = nil) {
        var perfDetails = details ?? [:]
        perfDetails["duration"] = String(format: "%.3fs", duration)
        
        let level: LogLevel = duration > 1.0 ? .warning : .info
        log(level, category: .performance, message: "Performance: \(operation)", details: perfDetails)
    }
    
    // MARK: - Log Management
    
    func clearLogs() {
        logs.removeAll()
        fileLogger.clear()
        info("ログをクリアしました")
    }
    
    func exportLogs() -> Data? {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = .prettyPrinted
        
        return try? encoder.encode(logs)
    }
    
    func getLogs(for level: LogLevel? = nil, category: LogCategory? = nil, limit: Int = 100) -> [LogEntry] {
        var filteredLogs = logs
        
        if let level = level {
            filteredLogs = filteredLogs.filter { $0.level == level }
        }
        
        if let category = category {
            filteredLogs = filteredLogs.filter { $0.category == category }
        }
        
        return Array(filteredLogs.suffix(limit))
    }
    
    private func cleanupOldLogs() {
        let cutoffDate = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
        logs.removeAll { $0.timestamp < cutoffDate }
        
        debug("古いログをクリーンアップしました")
    }
    
    // MARK: - Singleton
    
    static let shared = LogManager()
}

// MARK: - File Logger

class FileLogger {
    private let logDirectory: URL
    private let dateFormatter: DateFormatter
    
    init() {
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        logDirectory = documentsPath.appendingPathComponent("Logs")
        
        dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        
        createLogDirectoryIfNeeded()
    }
    
    private func createLogDirectoryIfNeeded() {
        if !FileManager.default.fileExists(atPath: logDirectory.path) {
            try? FileManager.default.createDirectory(at: logDirectory, withIntermediateDirectories: true)
        }
    }
    
    func write(_ entry: LogEntry) {
        let logFile = getLogFile(for: entry.timestamp)
        let logLine = formatLogEntry(entry)
        
        if let data = (logLine + "\n").data(using: .utf8) {
            if let fileHandle = try? FileHandle(forWritingTo: logFile) {
                fileHandle.seekToEndOfFile()
                fileHandle.write(data)
                fileHandle.closeFile()
            } else {
                try? data.write(to: logFile, options: .atomicWrite)
            }
        }
    }
    
    private func getLogFile(for date: Date) -> URL {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let dateString = dateFormatter.string(from: date)
        return logDirectory.appendingPathComponent("insight2-\(dateString).log")
    }
    
    private func formatLogEntry(_ entry: LogEntry) -> String {
        let timestamp = dateFormatter.string(from: entry.timestamp)
        let level = entry.level.rawValue
        let category = entry.category.rawValue
        let message = entry.message
        
        var logLine = "[\(timestamp)] \(level) [\(category)] \(message)"
        
        if let details = entry.details {
            let detailsString = details.map { "\($0.key)=\($0.value)" }.joined(separator: ", ")
            logLine += " | Details: \(detailsString)"
        }
        
        if let errorDescription = entry.errorDescription {
            logLine += " | Error: \(errorDescription)"
        }
        
        if let sessionId = entry.sessionId {
            logLine += " | Session: \(sessionId)"
        }
        
        return logLine
    }
    
    func clear() {
        let fileManager = FileManager.default
        let logFiles = try? fileManager.contentsOfDirectory(at: logDirectory, includingPropertiesForKeys: nil)
        
        logFiles?.forEach { url in
            try? fileManager.removeItem(at: url)
        }
    }
}

// MARK: - Crash Reporter

class CrashReporter {
    private let crashReportURL = URL(string: "https://api.insight-analytics.com/crash-reports")!
    
    func report(_ entry: LogEntry) {
        guard entry.level == .error || entry.level == .critical else { return }
        
        let crashReport = CrashReport(
            timestamp: entry.timestamp,
            level: entry.level.rawValue,
            category: entry.category.rawValue,
            message: entry.message,
            details: entry.details,
            error: entry.errorDescription,
            stackTrace: entry.stackTrace,
            sessionId: entry.sessionId,
            deviceInfo: getDeviceInfo(),
            appVersion: getAppVersion()
        )
        
        // クラッシュレポートをローカルに保存
        saveCrashReport(crashReport)
        
        // サーバーに送信（非同期）
        sendCrashReport(crashReport)
    }
    
    private func getDeviceInfo() -> [String: String] {
        let device = ProcessInfo.processInfo
        return [
            "model": device.hostName,
            "os": device.operatingSystemVersionString,
            "memory": "\(device.physicalMemory / 1024 / 1024) MB"
        ]
    }
    
    private func getAppVersion() -> String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "Unknown"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "Unknown"
        return "\(version) (\(build))"
    }
    
    private func saveCrashReport(_ report: CrashReport) {
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let crashReportsDirectory = documentsPath.appendingPathComponent("CrashReports")
        
        if !FileManager.default.fileExists(atPath: crashReportsDirectory.path) {
            try? FileManager.default.createDirectory(at: crashReportsDirectory, withIntermediateDirectories: true)
        }
        
        let fileName = "crash-\(report.timestamp.timeIntervalSince1970).json"
        let fileURL = crashReportsDirectory.appendingPathComponent(fileName)
        
        if let data = try? JSONEncoder().encode(report) {
            try? data.write(to: fileURL)
        }
    }
    
    private func sendCrashReport(_ report: CrashReport) {
        guard let data = try? JSONEncoder().encode(report) else { return }
        
        var request = URLRequest(url: crashReportURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = data
        
        URLSession.shared.dataTask(with: request) { _, response, error in
            if let error = error {
                Task { @MainActor in
                    LogManager.shared.error("クラッシュレポートの送信に失敗しました", category: .system, error: error)
                }
            } else if let httpResponse = response as? HTTPURLResponse {
                Task { @MainActor in
                    LogManager.shared.info("クラッシュレポートを送信しました: \(httpResponse.statusCode)", category: .system)
                }
            }
        }.resume()
    }
}

// MARK: - Crash Report Model

struct CrashReport: Codable {
    let timestamp: Date
    let level: String
    let category: String
    let message: String
    let details: [String: String]?
    let error: String?
    let stackTrace: String?
    let sessionId: String?
    let deviceInfo: [String: String]
    let appVersion: String
} 