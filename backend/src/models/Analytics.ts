import pool from '../config/database';

export class AnalyticsModel {
  static async createPageViews(pageViews: any[]): Promise<void> {
    if (pageViews.length === 0) return;

    const values = pageViews.map((_pv, index) => {
      const offset = index * 8;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`;
    }).join(', ');

    const query = `
      INSERT INTO page_views (project_id, session_id, page_url, referrer, user_agent, device_type, browser, os)
      VALUES ${values}
    `;

    const flatValues = pageViews.flatMap(pv => [
      pv.projectId,
      pv.sessionId,
      pv.pageUrl,
      pv.referrer,
      pv.userAgent,
      pv.deviceType,
      pv.browser,
      pv.os
    ]);

    await pool.query(query, flatValues);
  }

  static async createEvents(events: any[]): Promise<void> {
    if (events.length === 0) return;

    const values = events.map((_event, index) => {
      const offset = index * 5;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
    }).join(', ');

    const query = `
      INSERT INTO events (project_id, session_id, event_type, event_data, page_url)
      VALUES ${values}
    `;

    const flatValues = events.flatMap(event => [
      event.projectId,
      event.sessionId,
      event.eventType,
      JSON.stringify(event.eventData),
      event.pageUrl
    ]);

    await pool.query(query, flatValues);
  }

  static async createHeatmapData(heatmapData: any[]): Promise<void> {
    if (heatmapData.length === 0) return;

    // Use dedicated heatmap_data table for better performance
    const values = heatmapData.map((_hd, index) => {
      const offset = index * 5;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
    }).join(', ');

    const query = `
      INSERT INTO heatmap_data (project_id, page_url, x, y, count)
      VALUES ${values}
      ON CONFLICT (project_id, page_url, x, y) 
      DO UPDATE SET count = heatmap_data.count + EXCLUDED.count
    `;

    const flatValues = heatmapData.flatMap(hd => [
      hd.projectId,
      hd.pageUrl,
      hd.x,
      hd.y,
      hd.count || 1
    ]);

    await pool.query(query, flatValues);
  }

  static async updateSessionData(projectId: string, pageViews: any[], events: any[]): Promise<void> {
    // Group by session
    const sessionMap = new Map<string, { pageViews: any[], events: any[] }>();
    
    pageViews.forEach(pv => {
      if (!sessionMap.has(pv.sessionId)) {
        sessionMap.set(pv.sessionId, { pageViews: [], events: [] });
      }
      sessionMap.get(pv.sessionId)!.pageViews.push(pv);
    });

    events.forEach(event => {
      if (!sessionMap.has(event.sessionId)) {
        sessionMap.set(event.sessionId, { pageViews: [], events: [] });
      }
      sessionMap.get(event.sessionId)!.events.push(event);
    });

    // Update or create sessions
    for (const [sessionId, data] of sessionMap) {
      const query = `
        INSERT INTO sessions (project_id, visitor_id, page_views, events, device_type, browser, os)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          page_views = sessions.page_views + $3,
          events = sessions.events + $4,
          end_time = NOW()
      `;

      const firstPageView = data.pageViews[0];
      const values = [
        projectId,
        sessionId, // Using sessionId as visitorId for now
        data.pageViews.length,
        data.events.length,
        firstPageView?.deviceType || 'unknown',
        firstPageView?.browser || 'unknown',
        firstPageView?.os || 'unknown'
      ];

      await pool.query(query, values);
    }
  }

  static async getSummary(projectId: string, startDate: Date, endDate: Date): Promise<any> {
    // Use materialized view for better performance
    const query = `
      SELECT 
        COALESCE(SUM(page_views), 0) as total_page_views,
        COALESCE(SUM(sessions), 0) as unique_sessions,
        COALESCE(SUM(unique_visitors), 0) as unique_visitors
      FROM daily_analytics
      WHERE project_id = $1 
        AND date BETWEEN $2 AND $3
    `;

    const result = await pool.query(query, [projectId, startDate, endDate]);
    const summary = result.rows[0];

    // Calculate bounce rate (sessions with only 1 page view)
    const bounceQuery = `
      SELECT COUNT(*) as bounce_sessions
      FROM sessions s
      WHERE s.project_id = $1 
        AND s.start_time BETWEEN $2 AND $3
        AND s.page_views = 1
    `;

    const bounceResult = await pool.query(bounceQuery, [projectId, startDate, endDate]);
    const bounceRate = summary.unique_sessions > 0 
      ? (bounceResult.rows[0].bounce_sessions / summary.unique_sessions) * 100 
      : 0;

    // Calculate average session duration
    const durationQuery = `
      SELECT AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as avg_duration
      FROM sessions
      WHERE project_id = $1 
        AND start_time BETWEEN $2 AND $3
        AND end_time IS NOT NULL
    `;

    const durationResult = await pool.query(durationQuery, [projectId, startDate, endDate]);

    return {
      totalPageViews: parseInt(summary.total_page_views) || 0,
      uniqueSessions: parseInt(summary.unique_sessions) || 0,
      uniqueVisitors: parseInt(summary.unique_visitors) || 0,
      bounceRate: Math.round(bounceRate * 100) / 100,
      averageSessionDuration: Math.round(durationResult.rows[0]?.avg_duration || 0),
      averagePageViewsPerSession: summary.unique_sessions > 0 
        ? Math.round((summary.total_page_views / summary.unique_sessions) * 100) / 100 
        : 0
    };
  }

  static async getTimeSeriesData(projectId: string, startDate: Date, endDate: Date, _period: string): Promise<any[]> {
    // Use materialized view for better performance
    const query = `
      SELECT 
        date,
        page_views,
        sessions,
        unique_visitors
      FROM daily_analytics
      WHERE project_id = $1 
        AND date BETWEEN $2 AND $3
      ORDER BY date
    `;

    const result = await pool.query(query, [projectId, startDate, endDate]);
    return result.rows.map(row => ({
      date: row.date,
      pageViews: parseInt(row.page_views) || 0,
      sessions: parseInt(row.sessions) || 0,
      uniqueVisitors: parseInt(row.unique_visitors) || 0
    }));
  }

  static async getTopPages(projectId: string, startDate: Date, endDate: Date): Promise<any[]> {
    const query = `
      SELECT 
        page_url,
        COUNT(*) as views,
        COUNT(DISTINCT session_id) as sessions
      FROM page_views
      WHERE project_id = $1 
        AND timestamp BETWEEN $2 AND $3
      GROUP BY page_url
      ORDER BY views DESC
      LIMIT 10
    `;

    const result = await pool.query(query, [projectId, startDate, endDate]);
    return result.rows.map(row => ({
      url: row.page_url,
      views: parseInt(row.views) || 0,
      sessions: parseInt(row.sessions) || 0
    }));
  }

  static async getTrafficSources(projectId: string, startDate: Date, endDate: Date): Promise<any[]> {
    const query = `
      SELECT 
        CASE 
          WHEN referrer = 'direct' OR referrer = '' THEN 'Direct'
          WHEN referrer LIKE '%google%' THEN 'Google'
          WHEN referrer LIKE '%facebook%' THEN 'Facebook'
          WHEN referrer LIKE '%twitter%' OR referrer LIKE '%x.com%' THEN 'Twitter'
          WHEN referrer LIKE '%linkedin%' THEN 'LinkedIn'
          WHEN referrer LIKE '%github%' THEN 'GitHub'
          ELSE 'Other'
        END as source,
        COUNT(DISTINCT session_id) as visitors
      FROM page_views
      WHERE project_id = $1 
        AND timestamp BETWEEN $2 AND $3
      GROUP BY source
      ORDER BY visitors DESC
    `;

    const result = await pool.query(query, [projectId, startDate, endDate]);
    return result.rows.map(row => ({
      source: row.source,
      visitors: parseInt(row.visitors) || 0
    }));
  }

  static async getDeviceBreakdown(projectId: string, startDate: Date, endDate: Date): Promise<any[]> {
    const query = `
      SELECT 
        device_type,
        COUNT(DISTINCT session_id) as sessions
      FROM page_views
      WHERE project_id = $1 
        AND timestamp BETWEEN $2 AND $3
        AND device_type IS NOT NULL
      GROUP BY device_type
      ORDER BY sessions DESC
    `;

    const result = await pool.query(query, [projectId, startDate, endDate]);
    const total = result.rows.reduce((sum, row) => sum + parseInt(row.sessions), 0);

    return result.rows.map(row => ({
      device: row.device_type,
      sessions: parseInt(row.sessions) || 0,
      percentage: total > 0 ? Math.round((parseInt(row.sessions) / total) * 100) : 0
    }));
  }

  static async getHeatmapData(projectId: string, pageUrl: string, startDate: Date, endDate: Date): Promise<any[]> {
    const query = `
      SELECT 
        x,
        y,
        SUM(count) as count
      FROM heatmap_data
      WHERE project_id = $1 
        AND page_url = $2
        AND timestamp BETWEEN $3 AND $4
      GROUP BY x, y
      ORDER BY count DESC
    `;

    const result = await pool.query(query, [projectId, pageUrl, startDate, endDate]);
    return result.rows.map(row => ({
      x: parseInt(row.x) || 0,
      y: parseInt(row.y) || 0,
      count: parseInt(row.count) || 0
    }));
  }

  static async getLiveVisitors(projectId: string): Promise<number> {
    const query = `
      SELECT COUNT(DISTINCT session_id) as live_visitors
      FROM page_views
      WHERE project_id = $1 
        AND timestamp > NOW() - INTERVAL '5 minutes'
    `;

    const result = await pool.query(query, [projectId]);
    return parseInt(result.rows[0]?.live_visitors) || 0;
  }

  // Optimized method for real-time analytics
  static async getRealTimeStats(projectId: string): Promise<any> {
    const query = `
      SELECT 
        COUNT(DISTINCT pv.session_id) as active_sessions,
        COUNT(DISTINCT pv.id) as page_views_last_hour,
        COUNT(DISTINCT e.id) as events_last_hour
      FROM page_views pv
      LEFT JOIN events e ON pv.session_id = e.session_id 
        AND e.timestamp > NOW() - INTERVAL '1 hour'
      WHERE pv.project_id = $1 
        AND pv.timestamp > NOW() - INTERVAL '1 hour'
    `;

    const result = await pool.query(query, [projectId]);
    const stats = result.rows[0];

    return {
      activeSessions: parseInt(stats.active_sessions) || 0,
      pageViewsLastHour: parseInt(stats.page_views_last_hour) || 0,
      eventsLastHour: parseInt(stats.events_last_hour) || 0
    };
  }

  // Get recent page views for real-time updates
  static async getRecentPageViews(projectId: string, since: Date, limit: number = 50): Promise<any[]> {
    const query = `
      SELECT 
        pv.id,
        pv.session_id,
        pv.page_url,
        pv.referrer,
        pv.user_agent,
        pv.device_type,
        pv.browser,
        pv.os,
        pv.timestamp
      FROM page_views pv
      WHERE pv.project_id = $1 
        AND pv.timestamp > $2
      ORDER BY pv.timestamp DESC
      LIMIT $3
    `;

    const result = await pool.query(query, [projectId, since, limit]);
    return result.rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      pageUrl: row.page_url,
      referrer: row.referrer,
      userAgent: row.user_agent,
      deviceType: row.device_type,
      browser: row.browser,
      os: row.os,
      timestamp: row.timestamp
    }));
  }

  // Get recent events for real-time updates
  static async getRecentEvents(projectId: string, since: Date): Promise<any[]> {
    const query = `
      SELECT 
        e.id,
        e.session_id,
        e.event_type,
        e.event_data,
        e.page_url,
        e.timestamp
      FROM events e
      WHERE e.project_id = $1 
        AND e.timestamp > $2
      ORDER BY e.timestamp DESC
      LIMIT 50
    `;

    const result = await pool.query(query, [projectId, since]);
    return result.rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      eventType: row.event_type,
      eventData: row.event_data,
      pageUrl: row.page_url,
      timestamp: row.timestamp
    }));
  }

  // Get detailed live visitors with session information
  static async getDetailedLiveVisitors(projectId: string, since: Date, limit: number = 50): Promise<any[]> {
    const query = `
      SELECT 
        pv.session_id,
        pv.page_url as current_page,
        pv.user_agent,
        pv.device_type,
        pv.browser,
        pv.os,
        pv.referrer,
        pv.timestamp as last_activity,
        COUNT(DISTINCT pv2.id) as total_page_views,
        COUNT(DISTINCT e.id) as total_events,
        MIN(pv2.timestamp) as session_start,
        MAX(pv2.timestamp) as session_end
      FROM page_views pv
      LEFT JOIN page_views pv2 ON pv.session_id = pv2.session_id 
        AND pv2.project_id = $1
      LEFT JOIN events e ON pv.session_id = e.session_id 
        AND e.project_id = $1
      WHERE pv.project_id = $1 
        AND pv.timestamp > $2
      GROUP BY pv.session_id, pv.page_url, pv.user_agent, pv.device_type, pv.browser, pv.os, pv.referrer, pv.timestamp
      ORDER BY pv.timestamp DESC
      LIMIT $3
    `;

    const result = await pool.query(query, [projectId, since, limit]);
    return result.rows.map(row => ({
      sessionId: row.session_id,
      currentPage: row.current_page,
      userAgent: row.user_agent,
      deviceType: row.device_type,
      browser: row.browser,
      os: row.os,
      referrer: row.referrer,
      lastActivity: row.last_activity,
      totalPageViews: parseInt(row.total_page_views) || 0,
      totalEvents: parseInt(row.total_events) || 0,
      sessionStart: row.session_start,
      sessionEnd: row.session_end,
      sessionDuration: row.session_end && row.session_start 
        ? Math.round((new Date(row.session_end).getTime() - new Date(row.session_start).getTime()) / 1000)
        : 0
    }));
  }

  // Get filtered analytics data
  static async getFilteredData(projectId: string, startDate: Date, endDate: Date, filters: any, limit: number = 100): Promise<any> {
    // Build WHERE conditions for filters
    const conditions: string[] = ['project_id = $1', 'timestamp BETWEEN $2 AND $3'];
    const values: any[] = [projectId, startDate, endDate];
    let paramIndex = 4;

    if (filters.pageUrl) {
      conditions.push(`page_url ILIKE $${paramIndex}`);
      values.push(`%${filters.pageUrl}%`);
      paramIndex++;
    }

    if (filters.deviceType) {
      conditions.push(`device_type = $${paramIndex}`);
      values.push(filters.deviceType);
      paramIndex++;
    }

    if (filters.browser) {
      conditions.push(`browser ILIKE $${paramIndex}`);
      values.push(`%${filters.browser}%`);
      paramIndex++;
    }

    if (filters.referrer) {
      conditions.push(`referrer ILIKE $${paramIndex}`);
      values.push(`%${filters.referrer}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get filtered page views
    const pageViewsQuery = `
      SELECT * FROM page_views 
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex}
    `;
    const pageViewsResult = await pool.query(pageViewsQuery, [...values, limit.toString()]);

    // Get filtered events
    const eventsQuery = `
      SELECT * FROM events 
      WHERE project_id = $1 AND timestamp BETWEEN $2 AND $3
      ${filters.eventType ? `AND event_type = $${paramIndex}` : ''}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex + (filters.eventType ? 1 : 0)}
    `;
    const eventsValues = [projectId, startDate, endDate];
    if (filters.eventType) eventsValues.push(filters.eventType);
    eventsValues.push(limit.toString());
    const eventsResult = await pool.query(eventsQuery, eventsValues);

    // Get filtered sessions
    const sessionsQuery = `
      SELECT * FROM sessions 
      WHERE project_id = $1 AND start_time BETWEEN $2 AND $3
      ORDER BY start_time DESC
      LIMIT $${paramIndex}
    `;
    const sessionsResult = await pool.query(sessionsQuery, [...values, limit.toString()]);

    return {
      pageViews: pageViewsResult.rows,
      events: eventsResult.rows,
      sessions: sessionsResult.rows
    };
  }

  // Get data for export
  static async getExportData(projectId: string, type: string, startDate: Date, endDate: Date, _filters: any = {}): Promise<any[]> {
    let query = '';
    const values = [projectId, startDate, endDate];

    switch (type) {
    case 'pageviews':
      query = `
          SELECT 
            timestamp,
            page_url,
            referrer,
            user_agent,
            device_type,
            browser,
            os,
            session_id
          FROM page_views 
          WHERE project_id = $1 AND timestamp BETWEEN $2 AND $3
          ORDER BY timestamp DESC
        `;
      break;
      
    case 'events':
      query = `
          SELECT 
            timestamp,
            event_type,
            event_data,
            page_url,
            session_id
          FROM events 
          WHERE project_id = $1 AND timestamp BETWEEN $2 AND $3
          ORDER BY timestamp DESC
        `;
      break;
      
    case 'sessions':
      query = `
          SELECT 
            start_time,
            end_time,
            page_views,
            events,
            device_type,
            browser,
            os,
            visitor_id
          FROM sessions 
          WHERE project_id = $1 AND start_time BETWEEN $2 AND $3
          ORDER BY start_time DESC
        `;
      break;
      
    default:
      throw new Error('Invalid export type');
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Convert data to CSV format
  static convertToCSV(data: any[], _type: string): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  }

  // Get custom events (excluding system events)
  static async getCustomEvents(projectId: string, startDate: Date, endDate: Date, limit: number = 100): Promise<any[]> {
    const systemEvents = ['pageview', 'click', 'scroll', 'move'];
    const placeholders = systemEvents.map((_, i) => `$${i + 4}`).join(', ');
    
    const query = `
      SELECT 
        id,
        session_id,
        event_type,
        event_data,
        page_url,
        timestamp
      FROM events 
      WHERE project_id = $1 
        AND timestamp BETWEEN $2 AND $3
        AND event_type NOT IN (${placeholders})
      ORDER BY timestamp DESC
      LIMIT $${systemEvents.length + 4}
    `;

    const values = [projectId, startDate, endDate, ...systemEvents, limit.toString()];
    const result = await pool.query(query, values);
    
    return result.rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      eventType: row.event_type,
      eventData: row.event_data,
      pageUrl: row.page_url,
      timestamp: row.timestamp
    }));
  }

  // Get event types summary
  static async getEventTypesSummary(projectId: string, startDate: Date, endDate: Date): Promise<any[]> {
    const query = `
      SELECT 
        event_type,
        COUNT(*) as count,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM events 
      WHERE project_id = $1 
        AND timestamp BETWEEN $2 AND $3
      GROUP BY event_type
      ORDER BY count DESC
    `;

    const result = await pool.query(query, [projectId, startDate, endDate]);
    return result.rows.map(row => ({
      eventType: row.event_type,
      count: parseInt(row.count) || 0,
      uniqueSessions: parseInt(row.unique_sessions) || 0
    }));
  }
} 
