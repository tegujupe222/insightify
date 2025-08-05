import Foundation
import CoreData
import Combine

// MARK: - Core Data Models

struct CoreDataModels {
    static let modelName = "InsightAnalytics"
    static let modelExtension = "momd"
}

// MARK: - Data Manager Error Types

enum DataManagerError: LocalizedError {
    case coreDataError(String)
    case encodingError(String)
    case decodingError(String)
    case fileSystemError(String)
    case validationError(String)
    case networkError(String)
    
    var errorDescription: String? {
        switch self {
        case .coreDataError(let message):
            return "Core Data エラー: \(message)"
        case .encodingError(let message):
            return "エンコーディングエラー: \(message)"
        case .decodingError(let message):
            return "デコーディングエラー: \(message)"
        case .fileSystemError(let message):
            return "ファイルシステムエラー: \(message)"
        case .validationError(let message):
            return "バリデーションエラー: \(message)"
        case .networkError(let message):
            return "ネットワークエラー: \(message)"
        }
    }
}

// MARK: - Data Manager

@MainActor
class DataManager: ObservableObject {
    @Published var isInitialized = false
    @Published var lastSyncDate: Date?
    @Published var dataIntegrityStatus: DataIntegrityStatus = .unknown
    
    private var persistentContainer: NSPersistentContainer
    private var backgroundContext: NSManagedObjectContext
    private var cancellables = Set<AnyCancellable>()
    
    enum DataIntegrityStatus {
        case unknown
        case healthy
        case warning
        case error
    }
    
    // MARK: - Initialization
    
    init() {
        persistentContainer = NSPersistentContainer(name: CoreDataModels.modelName)
        backgroundContext = persistentContainer.newBackgroundContext()
        
        setupCoreData()
        setupObservers()
    }
    
    private func setupCoreData() {
        persistentContainer.loadPersistentStores { [weak self] _, error in
            if let error = error {
                print("❌ Core Data 読み込みエラー: \(error)")
                self?.dataIntegrityStatus = .error
            } else {
                print("✅ Core Data 初期化完了")
                self?.dataIntegrityStatus = .healthy
                self?.isInitialized = true
                Task {
                    await self?.performDataIntegrityCheck()
                }
            }
        }
        
        // 自動保存設定
        persistentContainer.viewContext.automaticallyMergesChangesFromParent = true
        persistentContainer.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
    }
    
    private func setupObservers() {
        // データ変更の監視
        NotificationCenter.default.publisher(for: .NSManagedObjectContextDidSave)
            .sink { [weak self] _ in
                Task {
                    await self?.handleDataChange()
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Core Data Operations
    
    private func saveContext() async throws {
        let context = persistentContainer.viewContext
        
        guard context.hasChanges else { return }
        
        do {
            try context.save()
            print("✅ Core Data 保存完了")
        } catch {
            print("❌ Core Data 保存エラー: \(error)")
            throw DataManagerError.coreDataError(error.localizedDescription)
        }
    }
    
    private func performBackgroundTask<T>(_ task: @escaping (NSManagedObjectContext) throws -> T) async throws -> T {
        return try await withCheckedThrowingContinuation { continuation in
            backgroundContext.perform {
                do {
                    let result = try task(self.backgroundContext)
                    continuation.resume(returning: result)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }
    
    // MARK: - Data Integrity
    
    private func performDataIntegrityCheck() async {
        do {
            let pageViewCount = try await getPageViewCount()
            let clickEventCount = try await getClickEventCount()
            let conversionEventCount = try await getConversionEventCount()
            
            let totalRecords = pageViewCount + clickEventCount + conversionEventCount
            
            if totalRecords > 10000 {
                dataIntegrityStatus = .warning
            } else if totalRecords > 100000 {
                dataIntegrityStatus = .error
            } else {
                dataIntegrityStatus = .healthy
            }
            
            print("📊 データ整合性チェック: \(totalRecords) レコード")
            
        } catch {
            dataIntegrityStatus = .error
            print("❌ データ整合性チェックエラー: \(error)")
        }
    }
    
    private func handleDataChange() async {
        await performDataIntegrityCheck()
    }
    
    // MARK: - Analytics Data Management
    
    func savePageViews(_ pageViews: [PageViewData]) async throws {
        try await performBackgroundTask { context in
            for pageView in pageViews {
                let entity = PageViewEntity(context: context)
                entity.id = pageView.id
                entity.url = pageView.url
                entity.timestamp = pageView.timestamp
                entity.sessionId = pageView.sessionId
                entity.userAgent = pageView.userAgent
                entity.referrer = pageView.referrer
                entity.pageTitle = pageView.pageTitle
                entity.loadTime = pageView.loadTime ?? 0
                entity.createdAt = Date()
            }
            
            try context.save()
        }
        
        try await saveContext()
    }
    
    func loadPageViews() async throws -> [PageViewData] {
        return try await performBackgroundTask { context in
            let request: NSFetchRequest<PageViewEntity> = PageViewEntity.fetchRequest()
            request.sortDescriptors = [NSSortDescriptor(keyPath: \PageViewEntity.timestamp, ascending: false)]
            
            let entities = try context.fetch(request)
            
            return entities.map { entity in
                PageViewData(
                    id: entity.id ?? UUID(),
                    url: entity.url ?? "",
                    timestamp: entity.timestamp ?? Date(),
                    sessionId: entity.sessionId ?? "",
                    userAgent: entity.userAgent ?? "",
                    referrer: entity.referrer,
                    pageTitle: entity.pageTitle ?? "",
                    loadTime: entity.loadTime > 0 ? entity.loadTime : nil
                )
            }
        }
    }
    
    func saveClickEvents(_ clickEvents: [ClickEvent]) async throws {
        try await performBackgroundTask { context in
            for clickEvent in clickEvents {
                let entity = ClickEventEntity(context: context)
                entity.id = clickEvent.id
                entity.url = clickEvent.url
                entity.elementId = clickEvent.elementId
                entity.elementClass = clickEvent.elementClass
                entity.elementTag = clickEvent.elementTag
                entity.x = Int32(clickEvent.x)
                entity.y = Int32(clickEvent.y)
                entity.timestamp = clickEvent.timestamp
                entity.sessionId = clickEvent.sessionId
                entity.elementText = clickEvent.elementText
                entity.viewportWidth = Int32(clickEvent.viewportWidth ?? 0)
                entity.viewportHeight = Int32(clickEvent.viewportHeight ?? 0)
                entity.createdAt = Date()
            }
            
            try context.save()
        }
        
        try await saveContext()
    }
    
    func loadClickEvents() async throws -> [ClickEvent] {
        return try await performBackgroundTask { context in
            let request: NSFetchRequest<ClickEventEntity> = ClickEventEntity.fetchRequest()
            request.sortDescriptors = [NSSortDescriptor(keyPath: \ClickEventEntity.timestamp, ascending: false)]
            
            let entities = try context.fetch(request)
            
            return entities.map { entity in
                ClickEvent(
                    id: entity.id ?? UUID(),
                    url: entity.url ?? "",
                    elementId: entity.elementId,
                    elementClass: entity.elementClass,
                    elementTag: entity.elementTag ?? "",
                    x: Int(entity.x),
                    y: Int(entity.y),
                    timestamp: entity.timestamp ?? Date(),
                    sessionId: entity.sessionId ?? "",
                    elementText: entity.elementText,
                    viewportWidth: entity.viewportWidth > 0 ? Int(entity.viewportWidth) : nil,
                    viewportHeight: entity.viewportHeight > 0 ? Int(entity.viewportHeight) : nil
                )
            }
        }
    }
    
    func saveConversionEvents(_ conversionEvents: [ConversionEvent]) async throws {
        try await performBackgroundTask { context in
            for conversionEvent in conversionEvents {
                let entity = ConversionEventEntity(context: context)
                entity.id = conversionEvent.id
                entity.url = conversionEvent.url
                entity.goal = conversionEvent.goal
                entity.value = conversionEvent.value
                entity.timestamp = conversionEvent.timestamp
                entity.sessionId = conversionEvent.sessionId
                entity.abTestVariant = conversionEvent.abTestVariant
                entity.metadata = try? JSONSerialization.data(withJSONObject: conversionEvent.metadata ?? [:])
                entity.createdAt = Date()
            }
            
            try context.save()
        }
        
        try await saveContext()
    }
    
    func loadConversionEvents() async throws -> [ConversionEvent] {
        return try await performBackgroundTask { context in
            let request: NSFetchRequest<ConversionEventEntity> = ConversionEventEntity.fetchRequest()
            request.sortDescriptors = [NSSortDescriptor(keyPath: \ConversionEventEntity.timestamp, ascending: false)]
            
            let entities = try context.fetch(request)
            
            return entities.map { entity in
                var metadata: [String: String]?
                if let metadataData = entity.metadata {
                    metadata = try? JSONSerialization.jsonObject(with: metadataData) as? [String: String]
                }
                
                return ConversionEvent(
                    id: entity.id ?? UUID(),
                    url: entity.url ?? "",
                    goal: entity.goal ?? "",
                    value: entity.value,
                    timestamp: entity.timestamp ?? Date(),
                    sessionId: entity.sessionId ?? "",
                    abTestVariant: entity.abTestVariant,
                    metadata: metadata
                )
            }
        }
    }
    
    // MARK: - Data Cleanup
    
    func cleanupOldData(olderThan days: Int) async throws {
        let cutoffDate = Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()
        
        try await performBackgroundTask { context in
            // 古いページビューの削除
            let pageViewRequest: NSFetchRequest<NSFetchRequestResult> = PageViewEntity.fetchRequest()
            pageViewRequest.predicate = NSPredicate(format: "timestamp < %@", cutoffDate as NSDate)
            let pageViewDeleteRequest = NSBatchDeleteRequest(fetchRequest: pageViewRequest)
            try context.execute(pageViewDeleteRequest)
            
            // 古いクリックイベントの削除
            let clickEventRequest: NSFetchRequest<NSFetchRequestResult> = ClickEventEntity.fetchRequest()
            clickEventRequest.predicate = NSPredicate(format: "timestamp < %@", cutoffDate as NSDate)
            let clickEventDeleteRequest = NSBatchDeleteRequest(fetchRequest: clickEventRequest)
            try context.execute(clickEventDeleteRequest)
            
            // 古いコンバージョンイベントの削除
            let conversionEventRequest: NSFetchRequest<NSFetchRequestResult> = ConversionEventEntity.fetchRequest()
            conversionEventRequest.predicate = NSPredicate(format: "timestamp < %@", cutoffDate as NSDate)
            let conversionEventDeleteRequest = NSBatchDeleteRequest(fetchRequest: conversionEventRequest)
            try context.execute(conversionEventDeleteRequest)
            
            try context.save()
        }
        
        try await saveContext()
        print("🧹 古いデータを削除しました（\(days)日以上前）")
    }
    
    // MARK: - Data Export/Import
    
    func exportData() async throws -> Data {
        let pageViews = try await loadPageViews()
        let clickEvents = try await loadClickEvents()
        let conversionEvents = try await loadConversionEvents()
        
        let exportData = ExportData(
            pageViews: pageViews,
            clickEvents: clickEvents,
            conversionEvents: conversionEvents,
            exportedAt: Date()
        )
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = .prettyPrinted
        
        return try encoder.encode(exportData)
    }
    
    func importData(_ data: Data) async throws {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        
        let importData = try decoder.decode(ExportData.self, from: data)
        
        try await savePageViews(importData.pageViews)
        try await saveClickEvents(importData.clickEvents)
        try await saveConversionEvents(importData.conversionEvents)
        
        print("📥 データインポート完了: \(importData.pageViews.count) ページビュー, \(importData.clickEvents.count) クリックイベント, \(importData.conversionEvents.count) コンバージョンイベント")
    }
    
    // MARK: - Helper Methods
    
    private func getPageViewCount() async throws -> Int {
        return try await performBackgroundTask { context in
            let request: NSFetchRequest<PageViewEntity> = PageViewEntity.fetchRequest()
            return try context.count(for: request)
        }
    }
    
    private func getClickEventCount() async throws -> Int {
        return try await performBackgroundTask { context in
            let request: NSFetchRequest<ClickEventEntity> = ClickEventEntity.fetchRequest()
            return try context.count(for: request)
        }
    }
    
    private func getConversionEventCount() async throws -> Int {
        return try await performBackgroundTask { context in
            let request: NSFetchRequest<ConversionEventEntity> = ConversionEventEntity.fetchRequest()
            return try context.count(for: request)
        }
    }
}

// MARK: - Export Data Model

struct ExportData: Codable {
    let pageViews: [PageViewData]
    let clickEvents: [ClickEvent]
    let conversionEvents: [ConversionEvent]
    let exportedAt: Date
}

// MARK: - Core Data Entities (Placeholder - these would be generated by Core Data model)

// Note: These are placeholder classes. In a real implementation, these would be generated
// by Core Data from the .xcdatamodeld file.

class PageViewEntity: NSManagedObject {
    @NSManaged var id: UUID?
    @NSManaged var url: String?
    @NSManaged var timestamp: Date?
    @NSManaged var sessionId: String?
    @NSManaged var userAgent: String?
    @NSManaged var referrer: String?
    @NSManaged var pageTitle: String?
    @NSManaged var loadTime: Double
    @NSManaged var createdAt: Date?
}

class ClickEventEntity: NSManagedObject {
    @NSManaged var id: UUID?
    @NSManaged var url: String?
    @NSManaged var elementId: String?
    @NSManaged var elementClass: String?
    @NSManaged var elementTag: String?
    @NSManaged var x: Int32
    @NSManaged var y: Int32
    @NSManaged var timestamp: Date?
    @NSManaged var sessionId: String?
    @NSManaged var elementText: String?
    @NSManaged var viewportWidth: Int32
    @NSManaged var viewportHeight: Int32
    @NSManaged var createdAt: Date?
}

class ConversionEventEntity: NSManagedObject {
    @NSManaged var id: UUID?
    @NSManaged var url: String?
    @NSManaged var goal: String?
    @NSManaged var value: Double
    @NSManaged var timestamp: Date?
    @NSManaged var sessionId: String?
    @NSManaged var abTestVariant: String?
    @NSManaged var metadata: Data?
    @NSManaged var createdAt: Date?
}

// MARK: - Core Data Extensions

extension PageViewEntity {
    @nonobjc class func fetchRequest() -> NSFetchRequest<PageViewEntity> {
        return NSFetchRequest<PageViewEntity>(entityName: "PageViewEntity")
    }
}

extension ClickEventEntity {
    @nonobjc class func fetchRequest() -> NSFetchRequest<ClickEventEntity> {
        return NSFetchRequest<ClickEventEntity>(entityName: "ClickEventEntity")
    }
}

extension ConversionEventEntity {
    @nonobjc class func fetchRequest() -> NSFetchRequest<ConversionEventEntity> {
        return NSFetchRequest<ConversionEventEntity>(entityName: "ConversionEventEntity")
    }
} 