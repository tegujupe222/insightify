export interface SecurityConfig {
  rateLimit: {
    api: {
      windowMs: number;
      max: number;
    };
    auth: {
      windowMs: number;
      max: number;
    };
    tracking: {
      windowMs: number;
      max: number;
    };
  };
  cors: {
    allowedOrigins: string[];
    credentials: boolean;
  };
  session: {
    secret: string;
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };
  csp: {
    directives: {
      defaultSrc: string[];
      styleSrc: string[];
      fontSrc: string[];
      scriptSrc: string[];
      imgSrc: string[];
      connectSrc: string[];
      frameSrc: string[];
      objectSrc: string[];
    };
  };
  backup: {
    enabled: boolean;
    schedule: string;
    retention: number;
    compression: boolean;
  };
  monitoring: {
    enabled: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    retention: number;
  };
  automation: {
    enabled: boolean;
    tasks: {
      dailyBackup: boolean;
      cleanupLogs: boolean;
      resetPageViews: boolean;
      cleanupCache: boolean;
      healthCheck: boolean;
    };
  };
}

export const securityConfig: SecurityConfig = {
  rateLimit: {
    api: {
      windowMs: 15 * 60 * 1000, // 15分
      max: 100
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15分
      max: 5
    },
    tracking: {
      windowMs: 60 * 1000, // 1分
      max: 1000
    }
  },
  cors: {
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://insightify.vercel.app',
      'https://insightify.com'
    ],
    credentials: true
  },
  session: {
    secret: process.env.SESSION_SECRET || 'insightify-session-secret',
    maxAge: 24 * 60 * 60 * 1000, // 24時間
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict'
  },
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  backup: {
    enabled: true,
    schedule: '0 2 * * *', // 毎日午前2時
    retention: 30, // 30日間保持
    compression: true
  },
  monitoring: {
    enabled: true,
    logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    retention: 30 // 30日間保持
  },
  automation: {
    enabled: true,
    tasks: {
      dailyBackup: true,
      cleanupLogs: true,
      resetPageViews: true,
      cleanupCache: true,
      healthCheck: true
    }
  }
}; 