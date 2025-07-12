import pool from '../config/database';
import { User, UserCreateInput } from '../types';
import bcrypt from 'bcryptjs';
import { isAdminEmail, calculatePageViewsLimit } from '../utils/adminUtils';

export class UserModel {
  static async create(userData: UserCreateInput): Promise<User> {
    const { email, password, role = 'user' } = userData;
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Check if email should be admin based on allowed admin emails
    const finalRole = isAdminEmail(email) ? 'admin' : role;
    
    const query = `
      INSERT INTO users (email, password, role, subscription_status, page_views_limit)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const subscriptionStatus = finalRole === 'admin' ? 'premium' : 'free';
    const pageViewsLimit = calculatePageViewsLimit(subscriptionStatus);
    
    const result = await pool.query(query, [email, hashedPassword, finalRole, subscriptionStatus, pageViewsLimit]);
    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findAll(): Promise<User[]> {
    const query = 'SELECT id, email, role, subscription_status, subscription_plan, monthly_page_views, page_views_limit, created_at, updated_at FROM users ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id: string, updates: Partial<User>): Promise<User | null> {
    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'password');
    const values = Object.values(updates).filter((_, index) => fields[index]);
    
    if (fields.length === 0) return null;
    
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`;
    
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  static async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  // Subscription related methods
  static async updateSubscriptionStatus(id: string, status: string, plan?: string): Promise<User | null> {
    const updates: any = { subscriptionStatus: status };
    
    if (plan) {
      updates.subscriptionPlan = plan;
    }
    
    if (status === 'premium') {
      updates.pageViewsLimit = calculatePageViewsLimit(status);
      updates.subscriptionStartDate = new Date();
      
      // Set end date based on plan
      if (plan === 'monthly') {
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        updates.subscriptionEndDate = endDate;
      } else if (plan === 'yearly') {
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        updates.subscriptionEndDate = endDate;
      }
    }
    
    return this.update(id, updates);
  }

  static async incrementPageViews(id: string): Promise<User | null> {
    const query = `
      UPDATE users 
      SET monthly_page_views = monthly_page_views + 1, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async resetMonthlyPageViews(): Promise<void> {
    const query = 'UPDATE users SET monthly_page_views = 0, updated_at = NOW()';
    await pool.query(query);
  }

  static async getUsersNearLimit(threshold: number = 0.8): Promise<User[]> {
    const query = `
      SELECT * FROM users 
      WHERE subscription_status = 'free' 
      AND monthly_page_views >= (page_views_limit * $1)
      ORDER BY monthly_page_views DESC
    `;
    
    const result = await pool.query(query, [threshold]);
    return result.rows;
  }

  static async getUsersAtLimit(): Promise<User[]> {
    const query = `
      SELECT * FROM users 
      WHERE subscription_status = 'free' 
      AND monthly_page_views >= page_views_limit
      ORDER BY monthly_page_views DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }
} 