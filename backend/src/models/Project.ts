import pool from '../config/database';
import { Project, ProjectCreateInput } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ProjectModel {
  static async create(projectData: ProjectCreateInput): Promise<Project> {
    const { name, url, userId } = projectData;
    const id = uuidv4();
    const trackingCode = `<!-- Insightify Tracking Snippet for ${name} -->
<script async defer src="https://cdn.insightify.com/tracker.js" data-project-id="${id}"></script>`;
    
    const query = `
      INSERT INTO projects (id, name, url, user_id, tracking_code, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(query, [id, name, url, userId, trackingCode, true]);
    return result.rows[0];
  }

  static async findById(id: string): Promise<Project | null> {
    const query = 'SELECT * FROM projects WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<Project[]> {
    const query = 'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findAll(): Promise<Project[]> {
    const query = 'SELECT * FROM projects ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id: string, updates: Partial<Project>): Promise<Project | null> {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const values = Object.values(updates).filter((_, index) => fields[index]);
    
    if (fields.length === 0) return null;
    
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `UPDATE projects SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`;
    
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM projects WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  static async toggleActive(id: string): Promise<Project | null> {
    const query = `
      UPDATE projects 
      SET is_active = NOT is_active, updated_at = NOW() 
      WHERE id = $1 
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async regenerateTrackingCode(id: string): Promise<Project | null> {
    const project = await this.findById(id);
    if (!project) return null;

    const newTrackingCode = `<!-- Insightify Tracking Snippet for ${project.name} -->
<script async defer src="https://cdn.insightify.com/tracker.js" data-project-id="${id}"></script>`;
    
    return this.update(id, { trackingCode: newTrackingCode });
  }
} 