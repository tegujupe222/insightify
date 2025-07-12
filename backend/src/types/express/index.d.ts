import { User } from '../index';

declare global {
  namespace Express {
    interface User extends User {}
    interface Request {
      user?: User;
    }
  }
}

// 型拡張を確実に有効にするためのエクスポート
export {}; 