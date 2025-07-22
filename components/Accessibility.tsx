import React, { useEffect, useRef, useState } from 'react';

// フォーカストラップコンポーネント
interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  onEscape?: () => void;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({ 
  children, 
  active = true, 
  onEscape 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    // フォーカス可能な要素を取得
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      if (event.key === 'Tab') {
        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // 最初の要素にフォーカス
    if (firstElement) {
      firstElement.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, onEscape]);

  return (
    <div ref={containerRef}>
      {children}
    </div>
  );
};

// スキップリンクコンポーネント
export const SkipLink: React.FC = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-indigo-600 text-white px-4 py-2 rounded-md z-50"
    >
      メインコンテンツにスキップ
    </a>
  );
};

// スクリーンリーダー専用テキスト
interface ScreenReaderTextProps {
  children: React.ReactNode;
}

export const ScreenReaderText: React.FC<ScreenReaderTextProps> = ({ children }) => {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
};

// ローディング状態のアナウンス
interface LoadingAnnouncerProps {
  isLoading: boolean;
  message?: string;
}

export const LoadingAnnouncer: React.FC<LoadingAnnouncerProps> = ({ 
  isLoading, 
  message = '読み込み中です' 
}) => {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (isLoading) {
      setAnnouncement(message);
    } else {
      setAnnouncement('');
    }
  }, [isLoading, message]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
};

// エラー状態のアナウンス
interface ErrorAnnouncerProps {
  error: string | null;
}

export const ErrorAnnouncer: React.FC<ErrorAnnouncerProps> = ({ error }) => {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (error) {
      setAnnouncement(`エラーが発生しました: ${error}`);
    } else {
      setAnnouncement('');
    }
  }, [error]);

  return (
    <div
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
};

// アクセシブルなボタン
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  loading = false,
  loadingText = '処理中...',
  icon,
  iconPosition = 'left',
  disabled,
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
    >
      {loading ? (
        <>
          <span className="sr-only">{loadingText}</span>
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {children}
          </div>
        </>
      ) : (
        <div className="flex items-center">
          {icon && iconPosition === 'left' && (
            <span className="mr-2">{icon}</span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className="ml-2">{icon}</span>
          )}
        </div>
      )}
    </button>
  );
};

// アクセシブルなモーダル
interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // スクロールを無効化
      document.body.style.overflow = 'hidden';
      
      // フォーカスをモーダルに移動
      if (modalRef.current) {
        const focusableElement = modalRef.current.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;
        if (focusableElement) {
          focusableElement.focus();
        }
      }
    } else {
      // スクロールを有効化
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      role="dialog"
      aria-modal="true"
    >
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* モーダル */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <FocusTrap onEscape={onClose}>
          <div
            ref={modalRef}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${sizeClasses[size]} w-full`}
            role="document"
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 id="modal-title" className="text-lg font-medium text-gray-900 dark:text-white">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="モーダルを閉じる"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* コンテンツ */}
            <div id="modal-description" className="p-6">
              {children}
            </div>
          </div>
        </FocusTrap>
      </div>
    </div>
  );
};

// アクセシブルなツールチップ
interface AccessibleTooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const AccessibleTooltip: React.FC<AccessibleTooltipProps> = ({
  content,
  children,
  position = 'top'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg ${positionClasses[position]}`}
          role="tooltip"
          id={`tooltip-${Math.random().toString(36).substr(2, 9)}`}
        >
          {content}
          <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45" />
        </div>
      )}
    </div>
  );
}; 
