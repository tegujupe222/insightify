import SwiftUI

// MARK: - Design System

struct DesignSystem {
    // MARK: - Colors
    
    static let primaryGradient = LinearGradient(
        colors: [Color.blue, Color.purple],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let secondaryGradient = LinearGradient(
        colors: [Color.green, Color.mint],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let accentGradient = LinearGradient(
        colors: [Color.orange, Color.yellow],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let backgroundGradient = LinearGradient(
        colors: [Color(red: 0.95, green: 0.95, blue: 0.97), Color(red: 0.98, green: 0.98, blue: 1.0)],
        startPoint: .top,
        endPoint: .bottom
    )
    
    static let darkBackgroundGradient = LinearGradient(
        colors: [Color(red: 0.1, green: 0.1, blue: 0.12), Color(red: 0.15, green: 0.15, blue: 0.18)],
        startPoint: .top,
        endPoint: .bottom
    )
    
    // Colors
    static let cardBackground = Color.white
    static let cardBorder = Color.gray.opacity(0.3)
    static let textPrimary = Color.black
    static let textSecondary = Color.gray
    static let textAccent = Color.blue
    
    // MARK: - Color Functions (for dynamic color scheme support)
    static func textPrimary(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? .white : .black
    }
    
    static func textSecondary(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? .gray : .gray
    }
    
    static func textAccent(for colorScheme: ColorScheme) -> Color {
        .blue
    }
    
    static func cardBackground(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? Color.black.opacity(0.3) : Color.white
    }
    
    static func cardBorder(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? Color.white.opacity(0.2) : Color.gray.opacity(0.3)
    }
    
    // MARK: - Dimensions
    
    static let cornerRadius: CGFloat = 16
    static let smallCornerRadius: CGFloat = 8
    static let padding: CGFloat = 20
    static let smallPadding: CGFloat = 12
    
    // MARK: - Typography
    
    static let titleFont = Font.system(size: 28, weight: .bold, design: .default)
    static let headlineFont = Font.system(size: 20, weight: .semibold, design: .default)
    static let bodyFont = Font.system(size: 16, weight: .regular, design: .default)
    static let captionFont = Font.system(size: 14, weight: .medium, design: .default)
    static let smallFont = Font.system(size: 12, weight: .regular, design: .default)
    
    // MARK: - Animations
    
    static let standardAnimation = Animation.easeInOut(duration: 0.3)
    static let fastAnimation = Animation.easeInOut(duration: 0.15)
    static let slowAnimation = Animation.easeInOut(duration: 0.5)
    
    // MARK: - Shadows
    
    static let cardShadow = Shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 5)
}

// MARK: - Shadow Model

struct Shadow {
    let color: Color
    let radius: CGFloat
    let x: CGFloat
    let y: CGFloat
}

// MARK: - Modern Card View

struct ModernCardView<Content: View>: View {
    let content: Content
    let gradient: LinearGradient?
    let showBorder: Bool
    @Environment(\.colorScheme) private var colorScheme
    
    init(gradient: LinearGradient? = nil, showBorder: Bool = true, @ViewBuilder content: () -> Content) {
        self.gradient = gradient
        self.showBorder = showBorder
        self.content = content()
    }
    
    var body: some View {
        content
            .padding(DesignSystem.padding)
            .background(
                RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                    .fill(DesignSystem.cardBackground)
                    .overlay(
                        RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                            .stroke(showBorder ? DesignSystem.cardBorder : Color.clear, lineWidth: 1)
                    )
            )
            .overlay(
                Group {
                    if let gradient = gradient {
                        RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                            .fill(gradient)
                            .opacity(0.1)
                    }
                }
            )
            .shadow(
                color: DesignSystem.cardShadow.color,
                radius: DesignSystem.cardShadow.radius,
                x: DesignSystem.cardShadow.x,
                y: DesignSystem.cardShadow.y
            )
            .accessibilityElement(children: .combine)
    }
}

// MARK: - Animated Button

struct AnimatedButton: View {
    let title: String
    let icon: String?
    let action: () -> Void
    let style: ButtonStyle
    let isLoading: Bool
    @Environment(\.colorScheme) private var colorScheme
    
    enum ButtonStyle {
        case primary
        case secondary
        case danger
        case success
    }
    
    init(title: String, icon: String? = nil, style: ButtonStyle = .primary, isLoading: Bool = false, action: @escaping () -> Void) {
        self.title = title
        self.icon = icon
        self.style = style
        self.isLoading = isLoading
        self.action = action
    }
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if isLoading {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(foregroundColor)
                        .rotationEffect(.degrees(360))
                        .animation(.linear(duration: 1).repeatForever(autoreverses: false), value: isLoading)
                } else if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: 16, weight: .medium))
                }
                
                Text(title)
                    .font(.system(size: 16, weight: .medium))
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: DesignSystem.smallCornerRadius)
                    .fill(backgroundColor)
            )
            .foregroundColor(foregroundColor)
            .overlay(
                RoundedRectangle(cornerRadius: DesignSystem.smallCornerRadius)
                    .stroke(borderColor, lineWidth: 1)
            )
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(isLoading ? 0.95 : 1.0)
        .animation(.easeInOut(duration: 0.1), value: isLoading)
        .accessibilityLabel(title)
        .accessibilityHint(isLoading ? "読み込み中" : "")
    }
    
    private var backgroundColor: Color {
        switch style {
        case .primary:
            return .blue
        case .secondary:
            return Color.clear
        case .danger:
            return .red
        case .success:
            return .green
        }
    }
    
    private var foregroundColor: Color {
        switch style {
        case .primary, .danger, .success:
            return .white
        case .secondary:
            return DesignSystem.textPrimary
        }
    }
    
    private var borderColor: Color {
        switch style {
        case .primary, .danger, .success:
            return Color.clear
        case .secondary:
            return DesignSystem.cardBorder
        }
    }
}

// MARK: - Loading View

struct LoadingView: View {
    let message: String
    @Environment(\.colorScheme) private var colorScheme
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "arrow.clockwise")
                .font(.system(size: 48))
                .foregroundColor(DesignSystem.textAccent)
                .rotationEffect(.degrees(360))
                .animation(.linear(duration: 1).repeatForever(autoreverses: false), value: true)
            
            Text(message)
                .font(DesignSystem.headlineFont)
                .foregroundColor(DesignSystem.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(colorScheme == .dark ? DesignSystem.darkBackgroundGradient : DesignSystem.backgroundGradient)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("読み込み中: \(message)")
    }
}

// MARK: - Error View

struct ErrorView: View {
    let error: String
    let retryAction: (() -> Void)?
    @Environment(\.colorScheme) private var colorScheme
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundColor(.orange)
            
            Text("エラーが発生しました")
                .font(DesignSystem.headlineFont)
                .fontWeight(.semibold)
                .foregroundColor(DesignSystem.textPrimary)
            
            Text(error)
                .font(DesignSystem.bodyFont)
                .foregroundColor(DesignSystem.textSecondary)
                .multilineTextAlignment(.center)
            
            if let retryAction = retryAction {
                AnimatedButton(
                    title: "再試行",
                    icon: "arrow.clockwise",
                    style: .primary,
                    action: retryAction
                )
            }
        }
        .padding(DesignSystem.padding)
        .background(
            RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                .fill(DesignSystem.cardBackground)
                .overlay(
                    RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                        .stroke(Color.orange.opacity(0.3), lineWidth: 1)
                )
        )
        .padding(DesignSystem.padding)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("エラー: \(error)")
    }
}

// MARK: - Empty State View

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    let actionTitle: String?
    let action: (() -> Void)?
    @Environment(\.colorScheme) private var colorScheme
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: icon)
                .font(.system(size: 64))
                .foregroundColor(DesignSystem.textSecondary)
            
            Text(title)
                .font(DesignSystem.headlineFont)
                .fontWeight(.semibold)
                .foregroundColor(DesignSystem.textPrimary)
            
            Text(message)
                .font(DesignSystem.bodyFont)
                .foregroundColor(DesignSystem.textSecondary)
                .multilineTextAlignment(.center)
            
            if let actionTitle = actionTitle, let action = action {
                AnimatedButton(
                    title: actionTitle,
                    icon: "plus",
                    style: .primary,
                    action: action
                )
            }
        }
        .padding(DesignSystem.padding)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(title): \(message)")
    }
}

// MARK: - Animated Metric Card

struct AnimatedMetricCard: View {
    let title: String
    let value: String
    let subtitle: String
    let change: String
    let isPositive: Bool
    let icon: String
    let gradient: LinearGradient
    let isLoading: Bool
    @Environment(\.colorScheme) private var colorScheme
    
    var body: some View {
        ModernCardView(gradient: gradient) {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Image(systemName: icon)
                        .font(.title)
                        .foregroundColor(DesignSystem.textPrimary)
                    
                    Spacer()
                    
                    if !isLoading {
                        Text(change)
                            .font(DesignSystem.captionFont)
                            .fontWeight(.semibold)
                            .foregroundColor(isPositive ? .green : .red)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(
                                RoundedRectangle(cornerRadius: 6)
                                    .fill(isPositive ? Color.green.opacity(0.2) : Color.red.opacity(0.2))
                            )
                    }
                }
                
                VStack(alignment: .leading, spacing: 12) {
                    Text(title)
                        .font(DesignSystem.captionFont)
                        .fontWeight(.medium)
                        .foregroundColor(DesignSystem.textPrimary)
                    
                    if isLoading {
                        VStack {
                            Image(systemName: "arrow.clockwise")
                                .font(.title2)
                                .foregroundColor(DesignSystem.textPrimary)
                                .rotationEffect(.degrees(360))
                                .animation(.linear(duration: 1).repeatForever(autoreverses: false), value: isLoading)
                        }
                        .frame(maxWidth: .infinity)
                    } else {
                        Text(value)
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(DesignSystem.textPrimary)
                    }
                    
                    Text(subtitle)
                        .font(DesignSystem.captionFont)
                        .foregroundColor(DesignSystem.textSecondary)
                }
            }
            .padding(DesignSystem.padding)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(title): \(value), \(subtitle)")
    }
}

// MARK: - Search Bar

struct SearchBar: View {
    @Binding var text: String
    let placeholder: String
    @Environment(\.colorScheme) private var colorScheme
    
    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(DesignSystem.textSecondary)
            
            TextField(placeholder, text: $text)
                .textFieldStyle(PlainTextFieldStyle())
                .foregroundColor(DesignSystem.textPrimary)
            
            if !text.isEmpty {
                Button(action: {
                    text = ""
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(DesignSystem.textSecondary)
                }
                .accessibilityLabel("検索をクリア")
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: DesignSystem.smallCornerRadius)
                .fill(DesignSystem.cardBackground)
                .overlay(
                    RoundedRectangle(cornerRadius: DesignSystem.smallCornerRadius)
                        .stroke(DesignSystem.cardBorder, lineWidth: 1)
                )
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("検索: \(placeholder)")
    }
}

// MARK: - Tab Bar

struct ModernTabBar: View {
    @Binding var selectedTab: Int
    let tabs: [TabItem]
    @Environment(\.colorScheme) private var colorScheme
    
    struct TabItem {
        let title: String
        let icon: String
        let color: Color
    }
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(tabs.enumerated()), id: \.offset) { index, tab in
                Button(action: {
                    withAnimation(DesignSystem.standardAnimation) {
                        selectedTab = index
                    }
                }) {
                    VStack(spacing: 4) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(selectedTab == index ? tab.color : DesignSystem.textSecondary)
                        
                        Text(tab.title)
                            .font(DesignSystem.smallFont)
                            .foregroundColor(selectedTab == index ? tab.color : DesignSystem.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(
                        VStack {
                            if selectedTab == index {
                                Rectangle()
                                    .fill(tab.color)
                                    .frame(height: 2)
                                    .matchedGeometryEffect(id: "tab", in: namespace)
                            }
                        }
                    )
                }
                .buttonStyle(PlainButtonStyle())
                .accessibilityLabel(tab.title)
                .accessibilityAddTraits(selectedTab == index ? .isSelected : [])
            }
        }
        .background(DesignSystem.cardBackground)
        .overlay(
            Rectangle()
                .fill(DesignSystem.cardBorder)
                .frame(height: 1),
            alignment: .top
        )
    }
    
    @Namespace private var namespace
}

// MARK: - Chart Container

struct ChartContainer<Content: View>: View {
    let title: String
    let content: Content
    let isLoading: Bool
    @Environment(\.colorScheme) private var colorScheme
    
    init(title: String, isLoading: Bool = false, @ViewBuilder content: () -> Content) {
        self.title = title
        self.isLoading = isLoading
        self.content = content()
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .font(DesignSystem.headlineFont)
                .fontWeight(.semibold)
                .foregroundColor(DesignSystem.textPrimary)
            
            if isLoading {
                LoadingView(message: "データを読み込み中...")
                    .frame(height: 200)
            } else {
                content
            }
        }
        .padding(DesignSystem.padding)
        .background(
            RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                .fill(DesignSystem.cardBackground)
                .overlay(
                    RoundedRectangle(cornerRadius: DesignSystem.cornerRadius)
                        .stroke(DesignSystem.cardBorder, lineWidth: 1)
                )
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(title)チャート")
    }
}

// MARK: - Refreshable Scroll View

struct RefreshableScrollView<Content: View>: View {
    let content: Content
    let onRefresh: () async -> Void
    
    init(onRefresh: @escaping () async -> Void, @ViewBuilder content: () -> Content) {
        self.onRefresh = onRefresh
        self.content = content()
    }
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                content
            }
        }
        .refreshable {
            await onRefresh()
        }
        .accessibilityAction(named: "更新") {
            Task {
                await onRefresh()
            }
        }
    }
}

// MARK: - Floating Action Button

struct FloatingActionButton: View {
    let icon: String
    let action: () -> Void
    @Environment(\.colorScheme) private var colorScheme
    
    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.white)
                .frame(width: 56, height: 56)
                .background(
                    Circle()
                        .fill(DesignSystem.primaryGradient)
                        .shadow(
                            color: DesignSystem.cardShadow.color,
                            radius: 8, x: 0, y: 4
                        )
                )
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityLabel("アクションボタン")
    }
}

// MARK: - Badge

struct Badge: View {
    let text: String
    let color: Color
    
    var body: some View {
        Text(text)
            .font(DesignSystem.smallFont)
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                Capsule()
                    .fill(color)
            )
            .accessibilityLabel("バッジ: \(text)")
    }
}

// MARK: - Divider

struct ModernDivider: View {
    let color: Color
    @Environment(\.colorScheme) private var colorScheme
    
    init(color: Color? = nil) {
        self.color = color ?? DesignSystem.cardBorder
    }
    
    var body: some View {
        Rectangle()
            .fill(color)
            .frame(height: 1)
    }
}

// MARK: - Tooltip

struct Tooltip: View {
    let text: String
    let isVisible: Bool
    @Environment(\.colorScheme) private var colorScheme
    
    var body: some View {
        if isVisible {
            Text(text)
                .font(DesignSystem.smallFont)
                .foregroundColor(.white)
                .padding(8)
                .background(
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color.black.opacity(0.8))
                )
                .transition(.opacity.combined(with: .scale))
                .accessibilityLabel("ツールチップ: \(text)")
        }
    }
}

// MARK: - Responsive Layout

struct ResponsiveLayout<Content: View>: View {
    let content: Content
    let maxWidth: CGFloat
    
    init(maxWidth: CGFloat = 1200, @ViewBuilder content: () -> Content) {
        self.maxWidth = maxWidth
        self.content = content()
    }
    
    var body: some View {
        GeometryReader { geometry in
            content
                .frame(maxWidth: min(geometry.size.width, maxWidth))
                .frame(maxWidth: .infinity)
        }
    }
}

// MARK: - Adaptive Grid

struct AdaptiveGrid<Content: View>: View {
    let columns: [GridItem]
    let content: Content
    
    init(columns: [GridItem] = [GridItem(.adaptive(minimum: 300))], @ViewBuilder content: () -> Content) {
        self.columns = columns
        self.content = content()
    }
    
    var body: some View {
        LazyVGrid(columns: columns, spacing: 16) {
            content
        }
    }
}

// MARK: - Info Row

struct InfoRow: View {
    let label: String
    let value: String
    let style: DateFormatter.Style?
    @Environment(\.colorScheme) private var colorScheme
    
    init(label: String, value: String, style: DateFormatter.Style? = nil) {
        self.label = label
        self.value = value
        self.style = nil
    }
    
    init(label: String, value: Date, style: DateFormatter.Style) {
        self.label = label
        let formatter = DateFormatter()
        formatter.dateStyle = style
        formatter.timeStyle = style
        self.value = formatter.string(from: value)
        self.style = style
    }
    
    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(DesignSystem.textSecondary)
            
            Spacer()
            
            Text(value)
                .font(.subheadline)
                .foregroundColor(DesignSystem.textPrimary)
        }
    }
} 