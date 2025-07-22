import pool from '../config/database';
import { Subscription, SubscriptionCreateInput } from '../types';
import { generateInvoiceNumber } from '../utils/adminUtils';

export class SubscriptionModel {
  static async create(subscriptionData: SubscriptionCreateInput): Promise<Subscription> {
    const { userId, planType, amount } = subscriptionData;
    const invoiceNumber = generateInvoiceNumber();
    
    const query = `
      INSERT INTO subscriptions (user_id, plan_type, amount, invoice_number)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await pool.query(query, [userId, planType, amount, invoiceNumber]);
    return result.rows[0];
  }

  static async findById(id: string): Promise<Subscription | null> {
    const query = 'SELECT * FROM subscriptions WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<Subscription[]> {
    const query = 'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findPendingSubscriptions(): Promise<Subscription[]> {
    const query = 'SELECT * FROM subscriptions WHERE status = $1 ORDER BY created_at ASC';
    const result = await pool.query(query, ['pending']);
    return result.rows;
  }

  static async updateStatus(id: string, status: string, confirmedBy?: string): Promise<Subscription | null> {
    const query = `
      UPDATE subscriptions 
      SET status = $1, payment_confirmed_by = $2, payment_confirmed_at = NOW(), updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await pool.query(query, [status, confirmedBy, id]);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM subscriptions WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }
} 
