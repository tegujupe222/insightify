import pool from '../config/database';
import { HeatmapData, HeatmapPage, HeatmapDataInput } from '../types';

export class HeatmapDataModel {
  // Create new heatmap data point
  static async create(data: HeatmapDataInput): Promise<HeatmapData> {
    const { projectId, pageUrl, pageTitle, x, y, heatmapType = 'click', elementSelector, elementText } = data;
    
    const query = `
      INSERT INTO heatmap_data (project_id, page_url, page_title, x, y, heatmap_type, element_selector, element_text)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [projectId, pageUrl, pageTitle, x, y, heatmapType, elementSelector, elementText];
    const result = await pool.query(query, values);
    
    // Update or create heatmap page record
    await this.updateHeatmapPage(projectId, pageUrl, pageTitle, heatmapType);
    
    return result.rows[0];
  }

  // Get heatmap data for a specific page
  static async getByPage(projectId: string, pageUrl: string, heatmapType: string = 'click', limit: number = 1000): Promise<HeatmapData[]> {
    const query = `
      SELECT * FROM heatmap_data 
      WHERE project_id = $1 AND page_url = $2 AND heatmap_type = $3
      ORDER BY timestamp DESC
      LIMIT $4
    `;
    
    const result = await pool.query(query, [projectId, pageUrl, heatmapType, limit]);
    return result.rows;
  }

  // Get aggregated heatmap data for a page (grouped by coordinates)
  static async getAggregatedByPage(projectId: string, pageUrl: string, heatmapType: string = 'click'): Promise<Array<{x: number, y: number, count: number}>> {
    const query = `
      SELECT x, y, SUM(count) as count
      FROM heatmap_data 
      WHERE project_id = $1 AND page_url = $2 AND heatmap_type = $3
      GROUP BY x, y
      ORDER BY count DESC
    `;
    
    const result = await pool.query(query, [projectId, pageUrl, heatmapType]);
    return result.rows;
  }

  // Get all pages with heatmap data for a project
  static async getPagesByProject(projectId: string): Promise<HeatmapPage[]> {
    const query = `
      SELECT * FROM heatmap_pages 
      WHERE project_id = $1
      ORDER BY last_activity DESC
    `;
    
    const result = await pool.query(query, [projectId]);
    return result.rows;
  }

  // Get heatmap data for multiple pages
  static async getByProject(projectId: string, heatmapType: string = 'click', limit: number = 5000): Promise<HeatmapData[]> {
    const query = `
      SELECT * FROM heatmap_data 
      WHERE project_id = $1 AND heatmap_type = $2
      ORDER BY timestamp DESC
      LIMIT $3
    `;
    
    const result = await pool.query(query, [projectId, heatmapType, limit]);
    return result.rows;
  }

  // Get heatmap data by date range
  static async getByDateRange(projectId: string, pageUrl: string, startDate: Date, endDate: Date, heatmapType: string = 'click'): Promise<HeatmapData[]> {
    const query = `
      SELECT * FROM heatmap_data 
      WHERE project_id = $1 AND page_url = $2 AND heatmap_type = $3
      AND timestamp BETWEEN $4 AND $5
      ORDER BY timestamp DESC
    `;
    
    const result = await pool.query(query, [projectId, pageUrl, heatmapType, startDate, endDate]);
    return result.rows;
  }

  // Get heatmap statistics for a project
  static async getProjectStats(projectId: string): Promise<{
    totalPages: number;
    totalClicks: number;
    totalScrolls: number;
    totalMoves: number;
    mostActivePage: string | null;
  }> {
    const query = `
      SELECT 
        COUNT(DISTINCT page_url) as total_pages,
        SUM(CASE WHEN heatmap_type = 'click' THEN count ELSE 0 END) as total_clicks,
        SUM(CASE WHEN heatmap_type = 'scroll' THEN count ELSE 0 END) as total_scrolls,
        SUM(CASE WHEN heatmap_type = 'move' THEN count ELSE 0 END) as total_moves
      FROM heatmap_data 
      WHERE project_id = $1
    `;
    
    const result = await pool.query(query, [projectId]);
    const stats = result.rows[0];

    // Get most active page
    const mostActiveQuery = `
      SELECT page_url, SUM(count) as total_activity
      FROM heatmap_data 
      WHERE project_id = $1
      GROUP BY page_url
      ORDER BY total_activity DESC
      LIMIT 1
    `;
    
    const mostActiveResult = await pool.query(mostActiveQuery, [projectId]);
    const mostActivePage = mostActiveResult.rows[0]?.page_url || null;

    return {
      totalPages: parseInt(stats.total_pages) || 0,
      totalClicks: parseInt(stats.total_clicks) || 0,
      totalScrolls: parseInt(stats.total_scrolls) || 0,
      totalMoves: parseInt(stats.total_moves) || 0,
      mostActivePage
    };
  }

  // Get heatmap data for element analysis
  static async getElementAnalysis(projectId: string, pageUrl: string, heatmapType: string = 'click'): Promise<Array<{
    elementSelector: string;
    elementText: string;
    count: number;
  }>> {
    const query = `
      SELECT element_selector, element_text, SUM(count) as count
      FROM heatmap_data 
      WHERE project_id = $1 AND page_url = $2 AND heatmap_type = $3
      AND element_selector IS NOT NULL
      GROUP BY element_selector, element_text
      ORDER BY count DESC
      LIMIT 100
    `;
    
    const result = await pool.query(query, [projectId, pageUrl, heatmapType]);
    return result.rows;
  }

  // Update or create heatmap page record
  private static async updateHeatmapPage(projectId: string, pageUrl: string, pageTitle: string, heatmapType: string): Promise<void> {
    const upsertQuery = `
      INSERT INTO heatmap_pages (project_id, page_url, page_title, total_clicks, total_scrolls, total_moves, last_activity)
      VALUES ($1, $2, $3, 
        CASE WHEN $4 = 'click' THEN 1 ELSE 0 END,
        CASE WHEN $4 = 'scroll' THEN 1 ELSE 0 END,
        CASE WHEN $4 = 'move' THEN 1 ELSE 0 END,
        NOW())
      ON CONFLICT (project_id, page_url) 
      DO UPDATE SET 
        page_title = EXCLUDED.page_title,
        total_clicks = heatmap_pages.total_clicks + CASE WHEN $4 = 'click' THEN 1 ELSE 0 END,
        total_scrolls = heatmap_pages.total_scrolls + CASE WHEN $4 = 'scroll' THEN 1 ELSE 0 END,
        total_moves = heatmap_pages.total_moves + CASE WHEN $4 = 'move' THEN 1 ELSE 0 END,
        last_activity = NOW(),
        updated_at = NOW()
    `;
    
    await pool.query(upsertQuery, [projectId, pageUrl, pageTitle, heatmapType]);
  }

  // Delete heatmap data for a specific page
  static async deleteByPage(projectId: string, pageUrl: string): Promise<void> {
    const query = `
      DELETE FROM heatmap_data 
      WHERE project_id = $1 AND page_url = $2
    `;
    
    await pool.query(query, [projectId, pageUrl]);
    
    // Also delete from heatmap_pages
    const deletePageQuery = `
      DELETE FROM heatmap_pages 
      WHERE project_id = $1 AND page_url = $2
    `;
    
    await pool.query(deletePageQuery, [projectId, pageUrl]);
  }

  // Clean old heatmap data
  static async cleanOldData(daysToKeep: number = 90): Promise<number> {
    const query = `
      DELETE FROM heatmap_data 
      WHERE timestamp < NOW() - INTERVAL '${daysToKeep} days'
    `;
    
    const result = await pool.query(query);
    return result.rowCount;
  }

  // Get heatmap data for export
  static async exportData(projectId: string, pageUrl?: string, heatmapType?: string): Promise<HeatmapData[]> {
    let query = `
      SELECT * FROM heatmap_data 
      WHERE project_id = $1
    `;
    
    const params: any[] = [projectId];
    let paramIndex = 2;

    if (pageUrl) {
      query += ` AND page_url = $${paramIndex}`;
      params.push(pageUrl);
      paramIndex++;
    }

    if (heatmapType) {
      query += ` AND heatmap_type = $${paramIndex}`;
      params.push(heatmapType);
    }

    query += ` ORDER BY timestamp DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }
} 