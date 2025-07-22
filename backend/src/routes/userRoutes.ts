import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken, requireAdmin, requireUser } from '../middleware/auth';

const router = Router();

// 全ユーザー取得（管理者のみ）
router.get('/', authenticateToken, requireAdmin, UserController.getAllUsers);

// ユーザー詳細取得（管理者または本人）
router.get('/:id', authenticateToken, requireUser, UserController.getUserById);

// ユーザー情報編集（管理者または本人）
router.patch('/:id', authenticateToken, requireUser, UserController.updateUser);

// ユーザー削除（管理者のみ）
router.delete('/:id', authenticateToken, requireAdmin, UserController.deleteUser);

// BAN/解除（管理者のみ）
router.post('/:id/ban', authenticateToken, requireAdmin, UserController.toggleUserBan);

// 権限変更（管理者のみ）
router.post('/:id/role', authenticateToken, requireAdmin, UserController.changeUserRole);

export default router; 
