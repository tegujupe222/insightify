import { Router } from 'express';
import { ProjectController } from '../controllers/projectController';
import { authenticateToken, requireUser } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);
router.use(requireUser);

// Project CRUD operations
router.post('/', ProjectController.create);
router.get('/', ProjectController.getAll);
router.get('/:id', ProjectController.getById);
router.put('/:id', ProjectController.update);
router.delete('/:id', ProjectController.delete);

// Project management
router.patch('/:id/toggle', ProjectController.toggleActive);
router.post('/:id/regenerate-tracking-code', ProjectController.regenerateTrackingCode);

export default router; 