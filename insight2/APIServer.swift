import Foundation
import Network
import Combine
import CryptoKit

// MARK: - API Models

struct APIEvent: Codable {
    let eventType: String
    let url: String
    let sessionId: String
    let timestamp: String
    let userAgent: String
    let referrer: String?
    let websiteId: String?
    let data: [String: Any]?
    
    enum CodingKeys: String, CodingKey {
        case eventType, url, sessionId, timestamp, userAgent, referrer, websiteId, data
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        eventType = try container.decode(String.self, forKey: .eventType)
        url = try container.decode(String.self, forKey: .url)
        sessionId = try container.decode(String.self, forKey: .sessionId)
        timestamp = try container.decode(String.self, forKey: .timestamp)
        userAgent = try container.decode(String.self, forKey: .userAgent)
        referrer = try container.decodeIfPresent(String.self, forKey: .referrer)
        websiteId = try container.decodeIfPresent(String.self, forKey: .websiteId)
        data = nil // Custom decoding for dictionary
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(eventType, forKey: .eventType)
        try container.encode(url, forKey: .url)
        try container.encode(sessionId, forKey: .sessionId)
        try container.encode(timestamp, forKey: .timestamp)
        try container.encode(userAgent, forKey: .userAgent)
        try container.encodeIfPresent(referrer, forKey: .referrer)
        try container.encodeIfPresent(websiteId, forKey: .websiteId)
        // Custom encoding for dictionary
    }
}

struct APIResponse: Codable {
    let success: Bool
    let message: String
    let data: [String: String]?
    let timestamp: Date
    
    enum CodingKeys: String, CodingKey {
        case success, message, data, timestamp
    }
    
    init(success: Bool, message: String, data: [String: String]? = nil, timestamp: Date = Date()) {
        self.success = success
        self.message = message
        self.data = data
        self.timestamp = timestamp
    }
}

struct AuthToken: Codable {
    let token: String
    let expiresAt: Date
    let permissions: [String]
}

// MARK: - API Server

class APIServer: ObservableObject {
    @Published var isRunning = false
    @Published var receivedEvents: [APIEvent] = []
    @Published var serverLog: [String] = []
    @Published var activeConnections: Int = 0
    @Published var totalRequests: Int = 0
    @Published var errorCount: Int = 0
    
    private var listener: NWListener?
    private var webSocketHandlers: [ObjectIdentifier: WebSocketHandler] = [:]
    private var webSocketConnections: [ObjectIdentifier: NWConnection] = [:]
    private let port: UInt16 = 8080
    private let analyticsManager: AnalyticsManager
    private let websiteManager: WebsiteManager
    @MainActor private let logManager = LogManager.shared
    
    // Authentication
    private var validTokens: [String: AuthToken] = [:]
    private let apiKey = "insight-api-key-2024"
    
    // Rate limiting
    private var requestCounts: [String: (count: Int, resetTime: Date)] = [:]
    private let maxRequestsPerMinute = 100
    
    init(analyticsManager: AnalyticsManager, websiteManager: WebsiteManager) {
        self.analyticsManager = analyticsManager
        self.websiteManager = websiteManager
    }
    
    // MARK: - Server Management
    
    @MainActor func startServer() {
        guard !isRunning else { return }
        
        let parameters = NWParameters.tcp
        parameters.allowLocalEndpointReuse = true
        
        do {
            guard let port = NWEndpoint.Port(rawValue: port) else {
                log("❌ Invalid port number: \(port)")
                return
            }
            
            listener = try NWListener(using: parameters, on: port)
            
            listener?.stateUpdateHandler = { [weak self] state in
                Task { @MainActor in
                    await self?.handleStateUpdate(state)
                }
            }
            
            listener?.newConnectionHandler = { [weak self] connection in
                Task { @MainActor in
                    await self?.handleNewConnection(connection)
                }
            }
            
            listener?.start(queue: .main)
            isRunning = true
            
            log("🚀 Enhanced API Server started on port \(port)")
            log("📡 Endpoint: http://localhost:\(port)")
            log("🔐 Authentication enabled")
            log("🌐 WebSocket support enabled")
            
        } catch {
            log("❌ Failed to start server: \(error.localizedDescription)")
        }
    }
    
    @MainActor func stopServer() {
        guard isRunning else { return }
        
        // Close WebSocket connections
        webSocketConnections.forEach { $0.value.cancel() }
        webSocketConnections.removeAll()
        webSocketHandlers.removeAll()
        
        listener?.cancel()
        listener = nil
        isRunning = false
        
        log("🛑 API Server stopped")
    }
    
    @MainActor private func handleStateUpdate(_ state: NWListener.State) {
        switch state {
        case .ready:
            log("✅ Server is ready to accept connections")
        case .failed(let error):
            log("❌ Server failed: \(error.localizedDescription)")
            isRunning = false
        case .cancelled:
            log("🛑 Server was cancelled")
            isRunning = false
        default:
            break
        }
    }
    
    @MainActor private func handleNewConnection(_ connection: NWConnection) {
        log("🔗 New connection from \(connection.endpoint)")
        activeConnections += 1
        
        connection.stateUpdateHandler = { [weak self] state in
            switch state {
            case .ready:
                self?.receiveData(from: connection)
            case .failed(let error):
                Task { @MainActor in
                    await self?.log("❌ Connection failed: \(error.localizedDescription)")
                    self?.activeConnections -= 1
                }
            case .cancelled:
                Task { @MainActor in
                    await self?.log("🛑 Connection cancelled")
                    self?.activeConnections -= 1
                }
            default:
                break
            }
        }
        
        connection.start(queue: .main)
    }
    
    private func receiveData(from connection: NWConnection) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] data, _, isComplete, error in
            if let data = data {
                Task { @MainActor in
                    await self?.handleReceivedData(data, from: connection)
                }
            }
            
            if let error = error {
                Task { @MainActor in
                    await self?.log("❌ Receive error: \(error.localizedDescription)")
                    self?.errorCount += 1
                }
            }
            
            if !isComplete {
                self?.receiveData(from: connection)
            }
        }
    }
    
    @MainActor
    private func handleReceivedData(_ data: Data, from connection: NWConnection) {
        guard let requestString = String(data: data, encoding: .utf8) else {
            log("❌ Invalid request data")
            return
        }
        
        totalRequests += 1
        log("📨 Received request: \(requestString.prefix(200))...")
        
        let response = processRequest(requestString, from: connection)
        sendResponse(response, to: connection)
    }
    
    @MainActor
    private func processRequest(_ requestString: String, from connection: NWConnection) -> String {
        let lines = requestString.components(separatedBy: .newlines)
        guard let firstLine = lines.first else {
            return createErrorResponse("Invalid request")
        }
        
        let components = firstLine.components(separatedBy: " ")
        guard components.count >= 2 else {
            return createErrorResponse("Invalid request format")
        }
        
        let method = components[0]
        let path = components[1]
        
        // Rate limiting check
        if !checkRateLimit(for: connection) {
            return createErrorResponse("Rate limit exceeded", statusCode: 429)
        }
        
        // Authentication check for protected endpoints
        if isProtectedEndpoint(path) && !validateAuthentication(requestString) {
            return createErrorResponse("Unauthorized", statusCode: 401)
        }
        
        switch (method, path) {
        case ("POST", "/api/v1/events"):
            return handleEventsEndpoint(requestString)
        case ("GET", "/api/v1/analytics"):
            return handleAnalyticsEndpoint()
        case ("GET", "/api/v1/websites"):
            return handleWebsitesEndpoint()
        case ("GET", "/api/v1/health"):
            return handleHealthEndpoint()
        case ("GET", "/api/v1/ab-tests"):
            return handleABTestsEndpoint()
        case ("POST", "/api/v1/auth"):
            return handleAuthEndpoint(requestString)
        case ("GET", "/api/v1/websocket"):
            return handleWebSocketUpgrade(requestString, connection: connection)
        default:
            return createErrorResponse("Endpoint not found", statusCode: 404)
        }
    }
    
    // MARK: - Authentication
    
    private func isProtectedEndpoint(_ path: String) -> Bool {
        let protectedPaths = ["/api/v1/events", "/api/v1/analytics", "/api/v1/websites"]
        return protectedPaths.contains(path)
    }
    
    private func validateAuthentication(_ requestString: String) -> Bool {
        // Extract Authorization header
        let lines = requestString.components(separatedBy: .newlines)
        for line in lines {
            if line.hasPrefix("Authorization: Bearer ") {
                let token = String(line.dropFirst("Authorization: Bearer ".count))
                return validateToken(token)
            }
        }
        return false
    }
    
    private func validateToken(_ token: String) -> Bool {
        guard let authToken = validTokens[token] else { return false }
        return authToken.expiresAt > Date()
    }
    
    private func generateToken() -> AuthToken {
        let token = UUID().uuidString
        let expiresAt = Calendar.current.date(byAdding: .hour, value: 24, to: Date()) ?? Date()
        let authToken = AuthToken(token: token, expiresAt: expiresAt, permissions: ["read", "write"])
        validTokens[token] = authToken
        return authToken
    }
    
    // MARK: - Rate Limiting
    
    private func checkRateLimit(for connection: NWConnection) -> Bool {
        let connectionId = "\(connection.endpoint)"
        let now = Date()
        
        if let (count, resetTime) = requestCounts[connectionId] {
            if now > resetTime {
                requestCounts[connectionId] = (1, now.addingTimeInterval(60))
                return true
            } else if count >= maxRequestsPerMinute {
                return false
            } else {
                requestCounts[connectionId] = (count + 1, resetTime)
                return true
            }
        } else {
            requestCounts[connectionId] = (1, now.addingTimeInterval(60))
            return true
        }
    }
    
    // MARK: - Endpoint Handlers
    
    @MainActor
    private func handleEventsEndpoint(_ requestString: String) -> String {
        // Extract JSON from request body
        guard let jsonStart = requestString.range(of: "\r\n\r\n")?.upperBound,
              let jsonData = requestString[jsonStart...].data(using: .utf8) else {
            return createErrorResponse("Invalid request body")
        }
        
        do {
            let event = try JSONDecoder().decode(APIEvent.self, from: jsonData)
            receivedEvents.append(event)
            
            // Process event with AnalyticsManager
            processEvent(event)
            
            log("✅ Event processed: \(event.eventType) from \(event.url)")
            
            return createSuccessResponse("Event received successfully")
            
        } catch {
            log("❌ Failed to decode event: \(error.localizedDescription)")
            return createErrorResponse("Invalid event data")
        }
    }
    
    @MainActor
    private func handleAnalyticsEndpoint() -> String {
        let analyticsData = [
            "totalPageViews": "\(analyticsManager.pageViews.count)",
            "totalClickEvents": "\(analyticsManager.clickEvents.count)",
            "totalConversions": "\(analyticsManager.conversionEvents.count)",
            "activeSessions": "\(analyticsManager.getActiveSessions().count)",
            "lastUpdated": analyticsManager.lastUpdated.ISO8601Format()
        ]
        
        let response = APIResponse(success: true, message: "Analytics data retrieved", data: analyticsData)
        
        do {
            let jsonData = try JSONEncoder().encode(response)
            return createJSONResponse(jsonData)
        } catch {
            return createErrorResponse("Failed to encode response")
        }
    }
    
    @MainActor
    private func handleWebsitesEndpoint() -> String {
        let websitesData = websiteManager.websites.reduce(into: [String: String]()) { result, website in
            result[website.id.uuidString] = website.name
        }
        
        let response = APIResponse(success: true, message: "Websites data retrieved", data: websitesData)
        
        do {
            let jsonData = try JSONEncoder().encode(response)
            return createJSONResponse(jsonData)
        } catch {
            return createErrorResponse("Failed to encode response")
        }
    }
    
    private func handleHealthEndpoint() -> String {
        let healthData = [
            "status": "healthy",
            "uptime": "\(Date().timeIntervalSince1970)",
            "activeConnections": "\(activeConnections)",
            "totalRequests": "\(totalRequests)",
            "errorCount": "\(errorCount)"
        ]
        
        let response = APIResponse(success: true, message: "Server is healthy", data: healthData)
        
        do {
            let jsonData = try JSONEncoder().encode(response)
            return createJSONResponse(jsonData)
        } catch {
            return createErrorResponse("Failed to encode response")
        }
    }
    
    @MainActor
    private func handleABTestsEndpoint() -> String {
        let abTests = analyticsManager.getABTests()
        let abTestsData = abTests.map { test in
            [
                "id": test.id.uuidString,
                "name": test.name,
                "description": test.description,
                "status": test.status.rawValue,
                "conversionGoal": test.conversionGoal,
                "trafficSplit": "\(test.trafficSplit)",
                "variants": test.variants.map { variant in
                    [
                        "id": variant.id.uuidString,
                        "name": variant.name,
                        "description": variant.description,
                        "conversionRate": "\(variant.conversionRate)",
                        "visitors": "\(variant.visitors)"
                    ]
                }
            ]
        }
        
        let response = APIResponse(success: true, message: "A/B tests retrieved successfully", data: ["tests": abTestsData.description])
        
        do {
            let jsonData = try JSONEncoder().encode(response)
            return createJSONResponse(jsonData)
        } catch {
            return createErrorResponse("Failed to encode response")
        }
    }
    
    @MainActor
    private func handleAuthEndpoint(_ requestString: String) -> String {
        // Simple API key authentication
        if requestString.contains("api-key: \(apiKey)") {
            let authToken = generateToken()
            let tokenData = [
                "token": authToken.token,
                "expiresAt": authToken.expiresAt.ISO8601Format(),
                "permissions": authToken.permissions.joined(separator: ",")
            ]
            
            let response = APIResponse(success: true, message: "Authentication successful", data: tokenData)
            
            do {
                let jsonData = try JSONEncoder().encode(response)
                return createJSONResponse(jsonData)
            } catch {
                return createErrorResponse("Failed to encode response")
            }
        } else {
            return createErrorResponse("Invalid API key", statusCode: 401)
        }
    }
    
    private func handleWebSocketUpgrade(_ requestString: String, connection: NWConnection) -> String {
        // WebSocket upgrade response
        let wsKey = extractWebSocketKey(from: requestString)
        let wsAccept = generateWebSocketAccept(key: wsKey)
        
        let response = """
        HTTP/1.1 101 Switching Protocols
        Upgrade: websocket
        Connection: Upgrade
        Sec-WebSocket-Accept: \(wsAccept)
        
        """
        
        // Set up WebSocket handler
        let wsHandler = WebSocketHandler(connection: connection, analyticsManager: analyticsManager)
        let oid = ObjectIdentifier(connection)
        webSocketHandlers[oid] = wsHandler
        webSocketConnections[oid] = connection
        
        return response
    }
    
    private func extractWebSocketKey(from request: String) -> String {
        let lines = request.components(separatedBy: .newlines)
        for line in lines {
            if line.hasPrefix("Sec-WebSocket-Key: ") {
                return String(line.dropFirst("Sec-WebSocket-Key: ".count))
            }
        }
        return ""
    }
    
    private func generateWebSocketAccept(key: String) -> String {
        let magicString = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
        let concatenated = key + magicString
        let data = concatenated.data(using: .utf8)!
        let sha1 = Insecure.SHA1.hash(data: data)
        return Data(sha1).base64EncodedString()
    }
    
    @MainActor
    private func processEvent(_ event: APIEvent) {
        // Convert APIEvent to AnalyticsManager format
        var eventData: [String: Any] = [
            "eventType": event.eventType,
            "url": event.url,
            "sessionId": event.sessionId,
            "timestamp": event.timestamp,
            "userAgent": event.userAgent
        ]
        
        if let referrer = event.referrer {
            eventData["referrer"] = referrer
        }
        
        if let websiteId = event.websiteId {
            eventData["websiteId"] = websiteId
        }
        
        // Process with AnalyticsManager
        analyticsManager.processWebViewEvent(eventData)
        
        // Update website last data received
        if let websiteId = event.websiteId,
           let uuid = UUID(uuidString: websiteId) {
            websiteManager.updateLastDataReceived(for: uuid)
        }
        
        // Broadcast to WebSocket clients
        broadcastToWebSockets(event)
    }
    
    private func broadcastToWebSockets(_ event: APIEvent) {
        let eventData = try? JSONEncoder().encode(event)
        let message = String(data: eventData ?? Data(), encoding: .utf8) ?? ""
        
        webSocketHandlers.values.forEach { handler in
            handler.send(message)
        }
    }
    
    @MainActor
    private func sendResponse(_ response: String, to connection: NWConnection) {
        guard let data = response.data(using: .utf8) else {
            log("❌ Failed to encode response")
            return
        }
        
        connection.send(content: data, completion: .contentProcessed { [weak self] error in
            Task { @MainActor in
                if let error = error {
                    await self?.log("❌ Send error: \(error.localizedDescription)")
                    self?.errorCount += 1
                } else {
                    await self?.log("✅ Response sent successfully")
                }
            }
        })
    }
    
    // MARK: - Response Helpers
    
    private func createSuccessResponse(_ message: String) -> String {
        let response = APIResponse(success: true, message: message)
        
        do {
            let jsonData = try JSONEncoder().encode(response)
            return createJSONResponse(jsonData)
        } catch {
            return createErrorResponse("Failed to encode response")
        }
    }
    
    private func createErrorResponse(_ message: String, statusCode: Int = 400) -> String {
        let response = APIResponse(success: false, message: message)
        
        do {
            let jsonData = try JSONEncoder().encode(response)
            return createJSONResponse(jsonData, statusCode: statusCode)
        } catch {
            return """
            HTTP/1.1 \(statusCode) Bad Request
            Content-Type: application/json
            Content-Length: 0
            
            """
        }
    }
    
    private func createJSONResponse(_ data: Data, statusCode: Int = 200) -> String {
        return """
        HTTP/1.1 \(statusCode) OK
        Content-Type: application/json
        Content-Length: \(data.count)
        Access-Control-Allow-Origin: *
        Access-Control-Allow-Methods: GET, POST, OPTIONS
        Access-Control-Allow-Headers: Content-Type, Authorization
        
        \(String(data: data, encoding: .utf8) ?? "")
        """
    }
    
    // MARK: - Logging
    
    @MainActor
    private func log(_ message: String) {
        let timestamp = Date().formatted(date: .omitted, time: .standard)
        let logMessage = "[\(timestamp)] \(message)"
        self.serverLog.append(logMessage)
        // Keep only last 100 log entries
        if self.serverLog.count > 100 {
            self.serverLog.removeFirst(self.serverLog.count - 100)
        }
        logManager.info("API Server: \(message)", category: .api)
        print(logMessage)
    }
    
    // MARK: - Public Methods
    
    func clearLogs() {
        serverLog.removeAll()
    }
    
    func getServerURL() -> String {
        return "http://localhost:\(port)"
    }
    
    func getEventsEndpoint() -> String {
        return "\(getServerURL())/api/v1/events"
    }
    
    func getWebSocketEndpoint() -> String {
        return "ws://localhost:\(port)/api/v1/websocket"
    }
}

// MARK: - WebSocket Handler

class WebSocketHandler {
    private let connection: NWConnection
    private let analyticsManager: AnalyticsManager
    
    init(connection: NWConnection, analyticsManager: AnalyticsManager) {
        self.connection = connection
        self.analyticsManager = analyticsManager
    }
    
    func send(_ message: String) {
        // Create WebSocket frame
        let frame = createWebSocketFrame(message)
        
        connection.send(content: frame, completion: .contentProcessed { error in
            if let error = error {
                print("WebSocket send error: \(error)")
            }
        })
    }
    
    private func createWebSocketFrame(_ message: String) -> Data {
        var frame = Data()
        
        // FIN bit and opcode (text frame)
        frame.append(0x81)
        
        // Payload length
        let payload = message.data(using: .utf8) ?? Data()
        if payload.count < 126 {
            frame.append(UInt8(payload.count))
        } else if payload.count < 65536 {
            frame.append(126)
            frame.append(UInt8((payload.count >> 8) & 0xFF))
            frame.append(UInt8(payload.count & 0xFF))
        } else {
            frame.append(127)
            for i in 0..<8 {
                frame.append(UInt8((payload.count >> (56 - i * 8)) & 0xFF))
            }
        }
        
        frame.append(payload)
        return frame
    }
}

// MARK: - API Server Manager

class APIServerManager: ObservableObject {
    @Published var server: APIServer?
    @Published var isServerRunning = false
    
    private var analyticsManager: AnalyticsManager
    private var websiteManager: WebsiteManager
    
    init(analyticsManager: AnalyticsManager, websiteManager: WebsiteManager) {
        self.analyticsManager = analyticsManager
        self.websiteManager = websiteManager
    }
    
    @MainActor func startServer() async {
        server = APIServer(analyticsManager: analyticsManager, websiteManager: websiteManager)
        await server?.startServer()
        isServerRunning = server?.isRunning ?? false
    }
    
    @MainActor func stopServer() async {
        await server?.stopServer()
        isServerRunning = false
    }
    
    func getServerURL() -> String {
        return server?.getServerURL() ?? "http://localhost:8080"
    }
    
    func getEventsEndpoint() -> String {
        return server?.getEventsEndpoint() ?? "http://localhost:8080/api/v1/events"
    }
    
    func getWebSocketEndpoint() -> String {
        return server?.getWebSocketEndpoint() ?? "ws://localhost:8080/api/v1/websocket"
    }
} 