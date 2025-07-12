import { Router } from 'express';
import { UserModel } from '../models/User';
import { validateInput, commonValidations } from '../middleware/security';

const router = Router();

// 全ユーザー取得（管理者のみ）
router.get('/', async (req, res) => {
  try {
    const users = await UserModel.findAll();
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// ユーザー詳細取得
router.get('/:id', async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

// ユーザー更新
router.put('/:id', validateInput([commonValidations.email]), async (req, res) => {
  try {
    const { email, role, subscriptionStatus } = req.body;
    const updates: any = {};
    
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (subscriptionStatus) updates.subscriptionStatus = subscriptionStatus;
    
    const user = await UserModel.update(req.params.id, updates);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

// ユーザー削除
router.delete('/:id', async (req, res) => {
  try {
    const success = await UserModel.delete(req.params.id);
    if (!success) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

// 制限に近いユーザー取得
router.get('/near-limit/:threshold?', async (req, res) => {
  try {
    const threshold = parseFloat(req.params.threshold || '0.8');
    const users = await UserModel.getUsersNearLimit(threshold);
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users near limit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users near limit'
    });
  }
});

// 制限に達したユーザー取得
router.get('/at-limit/all', async (req, res) => {
  try {
    const users = await UserModel.getUsersAtLimit();
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users at limit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users at limit'
    });
  }
});

export default router; 