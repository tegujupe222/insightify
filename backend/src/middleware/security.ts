import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { body, validationResult } from 'express-validator';

// レート制限の設定
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message || 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// 一般的なAPIレート制限
export const apiLimiter = createRateLimit(15 * 60 * 1000, 100, 'API rate limit exceeded');

// 認証エンドポイント用の厳しいレート制限
export const authLimiter = createRateLimit(15 * 60 * 1000, 5, 'Too many authentication attempts');

// トラッキングエンドポイント用の緩いレート制限
export const trackingLimiter = createRateLimit(60 * 1000, 1000, 'Too many tracking requests');

// セキュリティヘッダーの設定
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// CORS設定
export const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://insightify.vercel.app',
      'https://insightify.com'
    ];
    
    // 開発環境ではoriginがundefinedの場合も許可
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining']
};

export const corsMiddleware = cors(corsOptions);

// XSS保護
export const xssProtection = (req: Request, _res: Response, next: NextFunction) => {
  // リクエストボディのサニタイゼーション
  if (req.body) {
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.replace(/[<>]/g, '');
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      return obj;
    };
    
    req.body = sanitizeObject(req.body);
  }
  
  next();
};

// CSRF保護
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // セッショントークンの検証
  const sessionToken = (req.session as any)?.csrfToken;
  const headerToken = req.headers['x-csrf-token'] as string;
  
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    if (!sessionToken || !headerToken || sessionToken !== headerToken) {
      res.status(403).json({
        success: false,
        error: 'CSRF token validation failed'
      });
      return;
    }
  }
  
  next();
};

// 入力値検証ミドルウェア
export const validateInput = (validations: any[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }
    
    next();
  };
};

// 一般的な入力値検証ルール
export const commonValidations = {
  email: body('email').isEmail().normalizeEmail(),
  password: body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  projectId: body('projectId').isUUID(),
  url: body('url').isURL(),
  pageUrl: body('pageUrl').isURL(),
  eventType: body('eventType').isString().isLength({ min: 1, max: 100 }),
  deviceType: body('deviceType').isIn(['desktop', 'mobile', 'tablet']),
  browser: body('browser').isString().isLength({ min: 1, max: 50 }),
  referrer: body('referrer').optional().isURL()
};

// セッションセキュリティ
export const sessionSecurity = (req: Request, _res: Response, next: NextFunction) => {
  // セッション固定攻撃対策
  if ((req.session as any).userId && !(req.session as any).regenerated) {
    (req.session as any).regenerate((err: any) => {
      if (err) {
        console.error('Session regeneration error:', err);
      }
      (req.session as any).regenerated = true;
      next();
    });
  } else {
    next();
  }
};

// エラーハンドラー
export const errorHandler = (error: any, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('Error:', error);
  
  // セキュリティ関連のエラーは詳細を隠す
  if (error.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Invalid input data'
    });
    return;
  }
  
  if (error.name === 'UnauthorizedError') {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }
  
  // 本番環境では詳細エラーを隠す
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(500).json({
    success: false,
    error: isProduction ? 'Internal server error' : error.message
  });
};

// リクエストログ
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req.session as any)?.userId || 'anonymous'
    };
    
    console.log(JSON.stringify(logData));
  });
  
  next();
};

// セキュリティ監査ログ
export const securityAuditLog = (req: Request, _res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /union\s+select/i,
    /drop\s+table/i,
    /exec\s*\(/i
  ];
  
  const requestString = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
    headers: req.headers
  });
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestString));
  
  if (isSuspicious) {
    console.warn('Suspicious request detected:', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      requestData: requestString
    });
  }
  
  next();
}; 