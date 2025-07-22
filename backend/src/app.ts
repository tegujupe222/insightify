import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes';

const app = express();

app.use(cors());
app.use(express.json());

// ユーザー管理API
app.use('/api/users', userRoutes);

// 他のルートやエラーハンドリングもここに追加

export default app; 