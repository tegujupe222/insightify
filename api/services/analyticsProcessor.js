const logger = require('../utils/logger');
const { sql } = require('../database/connection');
const { setRealTimeData, getRealTimeData, incrementCounter } = require('../database/redis');
const { emitAnalyticsEvent } = require('./socketService');

let isInitialized = false;

async function initAnalyticsProcessor() {
  try {
    // Initialize analytics processor
    logger.info('Initializing analytics processor...');
    
    // Set up periodic cleanup tasks
    setInterval(cleanupOldSessions, 5 * 60 * 1000); // Every 5 minutes
    setInterval(updateRealTimeCounters, 60 * 1000); // Every minute
    
    isInitialized = true;
    logger.info('✅ Analytics processor initialized successfully');
  } catch (error) {
    logger.error('❌ Analytics processor initialization failed:', error);
    throw error;
  }
}

// Process analytics event
async function processEvent(eventData) {
  try {
    const {
      eventType,
      websiteId,
      sessionId,
      data,
      timestamp,
      userAgent,
      ip,
      referrer
    } = eventData;

    // Validate required fields
    if (!eventType || !websiteId || !sessionId) {
      throw new Error('Missing required fields: eventType, websiteId, sessionId');
    }

    // Process based on event type
    switch (eventType) {
      case 'pageview':
        await processPageView(eventData);
        break;
      case 'click':
        await processClickEvent(eventData);
        break;
      case 'conversion':
        await processConversionEvent(eventData);
        break;
      case 'scroll':
        await processScrollEvent(eventData);
        break;
      case 'form_submit':
        await processFormSubmitEvent(eventData);
        break;
      case 'custom':
        await processCustomEvent(eventData);
        break;
      default:
        logger.warn(`Unknown event type: ${eventType}`);
    }

    // Update real-time data
    await updateRealTimeData(websiteId, eventType, data);

    // Emit WebSocket event
    emitAnalyticsEvent(websiteId, {
      eventType,
      sessionId,
      data,
      timestamp
    });

    logger.logAnalytics({
      eventType,
      websiteId,
      sessionId,
      timestamp
    });

  } catch (error) {
    logger.error('Error processing analytics event:', error);
    throw error;
  }
}

// Process page view event
async function processPageView(eventData) {
  const {
    websiteId,
    sessionId,
    url,
    pageTitle,
    userAgent,
    referrer,
    loadTime,
    metadata
  } = eventData;

  try {
    // Insert page view
    const result = await sql`
      INSERT INTO page_views (
        website_id, session_id, url, page_title, user_agent, referrer, 
        ip_address, load_time, metadata, timestamp
      ) VALUES (
        ${websiteId}, ${sessionId}, ${url}, ${pageTitle}, ${userAgent}, ${referrer},
        ${eventData.ip}, ${loadTime}, ${metadata || {}}, ${eventData.timestamp}
      ) RETURNING id
    `;

    // Update session
    await sql`
      INSERT INTO sessions (id, website_id, last_activity, page_views_count)
      VALUES (${sessionId}, ${websiteId}, ${eventData.timestamp}, 1)
      ON CONFLICT (id) DO UPDATE SET
        last_activity = ${eventData.timestamp},
        page_views_count = sessions.page_views_count + 1
    `;

    logger.info(`Page view processed: ${url} for session ${sessionId}`);
    return result.rows[0].id;
  } catch (error) {
    logger.error('Error processing page view:', error);
    throw error;
  }
}

// Process click event
async function processClickEvent(eventData) {
  const {
    websiteId,
    sessionId,
    url,
    elementId,
    elementClass,
    elementTag,
    elementText,
    xPosition,
    yPosition,
    viewportWidth,
    viewportHeight,
    metadata
  } = eventData;

  try {
    // Insert click event
    const result = await sql`
      INSERT INTO click_events (
        website_id, session_id, url, element_id, element_class, element_tag,
        element_text, x_position, y_position, viewport_width, viewport_height,
        metadata, timestamp
      ) VALUES (
        ${websiteId}, ${sessionId}, ${url}, ${elementId}, ${elementClass}, ${elementTag},
        ${elementText}, ${xPosition}, ${yPosition}, ${viewportWidth}, ${viewportHeight},
        ${metadata || {}}, ${eventData.timestamp}
      ) RETURNING id
    `;

    // Update session
    await sql`
      UPDATE sessions 
      SET last_activity = ${eventData.timestamp}, clicks_count = clicks_count + 1
      WHERE id = ${sessionId}
    `;

    logger.info(`Click event processed: ${elementTag} for session ${sessionId}`);
    return result.rows[0].id;
  } catch (error) {
    logger.error('Error processing click event:', error);
    throw error;
  }
}

// Process conversion event
async function processConversionEvent(eventData) {
  const {
    websiteId,
    sessionId,
    url,
    goal,
    value,
    abTestVariant,
    metadata
  } = eventData;

  try {
    // Insert conversion event
    const result = await sql`
      INSERT INTO conversion_events (
        website_id, session_id, url, goal, value, ab_test_variant,
        metadata, timestamp
      ) VALUES (
        ${websiteId}, ${sessionId}, ${url}, ${goal}, ${value}, ${abTestVariant},
        ${metadata || {}}, ${eventData.timestamp}
      ) RETURNING id
    `;

    // Update session
    await sql`
      UPDATE sessions 
      SET last_activity = ${eventData.timestamp}, conversions_count = conversions_count + 1
      WHERE id = ${sessionId}
    `;

    // Process A/B test result if variant is provided
    if (abTestVariant) {
      await processABTestResult(websiteId, sessionId, goal, value, abTestVariant);
    }

    logger.info(`Conversion event processed: ${goal} for session ${sessionId}`);
    return result.rows[0].id;
  } catch (error) {
    logger.error('Error processing conversion event:', error);
    throw error;
  }
}

// Process scroll event
async function processScrollEvent(eventData) {
  const {
    websiteId,
    sessionId,
    url,
    scrollDepth,
    metadata
  } = eventData;

  try {
    // Update session with scroll depth
    await sql`
      UPDATE sessions 
      SET last_activity = ${eventData.timestamp}, metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb), 
        '{scrollDepth}', 
        ${scrollDepth}::jsonb
      )
      WHERE id = ${sessionId}
    `;

    logger.info(`Scroll event processed: ${scrollDepth}% for session ${sessionId}`);
  } catch (error) {
    logger.error('Error processing scroll event:', error);
    throw error;
  }
}

// Process form submit event
async function processFormSubmitEvent(eventData) {
  const {
    websiteId,
    sessionId,
    url,
    formId,
    formData,
    metadata
  } = eventData;

  try {
    // Store form submission in metadata
    await sql`
      UPDATE sessions 
      SET last_activity = ${eventData.timestamp}, metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb), 
        '{formSubmissions}', 
        COALESCE(metadata->'formSubmissions', '[]'::jsonb) || jsonb_build_array(
          jsonb_build_object(
            'formId', ${formId},
            'formData', ${formData || {}},
            'timestamp', ${eventData.timestamp}::text
          )
        )
      )
      WHERE id = ${sessionId}
    `;

    logger.info(`Form submit event processed: ${formId} for session ${sessionId}`);
  } catch (error) {
    logger.error('Error processing form submit event:', error);
    throw error;
  }
}

// Process custom event
async function processCustomEvent(eventData) {
  const {
    websiteId,
    sessionId,
    eventName,
    eventData: customData,
    metadata
  } = eventData;

  try {
    // Store custom event in session metadata
    await sql`
      UPDATE sessions 
      SET last_activity = ${eventData.timestamp}, metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb), 
        '{customEvents}', 
        COALESCE(metadata->'customEvents', '[]'::jsonb) || jsonb_build_array(
          jsonb_build_object(
            'eventName', ${eventName},
            'eventData', ${customData || {}},
            'timestamp', ${eventData.timestamp}::text
          )
        )
      )
      WHERE id = ${sessionId}
    `;

    logger.info(`Custom event processed: ${eventName} for session ${sessionId}`);
  } catch (error) {
    logger.error('Error processing custom event:', error);
    throw error;
  }
}

// Process A/B test result
async function processABTestResult(websiteId, sessionId, goal, value, variant) {
  try {
    // Find active A/B test for this website and goal
    const abTestResult = await sql`
      SELECT at.id, atv.id as variant_id
      FROM ab_tests at
      JOIN ab_test_variants atv ON at.id = atv.ab_test_id
      WHERE at.website_id = ${websiteId} 
      AND at.status = 'active'
      AND ${goal} = ANY(at.goals)
      AND atv.name = ${variant}
      AND NOW() BETWEEN at.start_date AND at.end_date
    `;

    if (abTestResult.rows.length > 0) {
      const { id: abTestId, variant_id: variantId } = abTestResult.rows[0];

      // Insert A/B test result
      await sql`
        INSERT INTO ab_test_results (
          ab_test_id, variant_id, session_id, goal, converted, value, timestamp
        ) VALUES (
          ${abTestId}, ${variantId}, ${sessionId}, ${goal}, true, ${value}, NOW()
        )
      `;

      logger.info(`A/B test result processed: ${goal} for variant ${variant}`);
    }
  } catch (error) {
    logger.error('Error processing A/B test result:', error);
  }
}

// Update real-time data
async function updateRealTimeData(websiteId, eventType, eventData = {}) {
  try {
    const realtimeData = await getRealTimeData(websiteId) || {
      activeSessions: 0,
      pageViewsLastHour: 0,
      clicksLastHour: 0,
      conversionsLastHour: 0,
      recentEvents: []
    };

    // Update counters based on event type
    switch (eventType) {
      case 'pageview':
        realtimeData.pageViewsLastHour = await incrementCounter(`pageviews:${websiteId}:hour`);
        break;
      case 'click':
        realtimeData.clicksLastHour = await incrementCounter(`clicks:${websiteId}:hour`);
        break;
      case 'conversion':
        realtimeData.conversionsLastHour = await incrementCounter(`conversions:${websiteId}:hour`);
        break;
    }

    // Add recent event
    realtimeData.recentEvents.unshift({
      type: eventType,
      data: eventData,
      timestamp: new Date()
    });

    // Keep only last 50 events
    realtimeData.recentEvents = realtimeData.recentEvents.slice(0, 50);

    // Update active sessions count
    const activeSessionsResult = await sql`
      SELECT COUNT(*) as count
      FROM sessions 
      WHERE website_id = ${websiteId} 
      AND is_active = true 
      AND last_activity > NOW() - INTERVAL '30 minutes'
    `;
    realtimeData.activeSessions = parseInt(activeSessionsResult.rows[0].count);

    // Save to Redis
    await setRealTimeData(websiteId, realtimeData);

  } catch (error) {
    logger.error('Error updating real-time data:', error);
  }
}

// Cleanup old sessions
async function cleanupOldSessions() {
  try {
    // Mark sessions as inactive if no activity for 30 minutes
    const result = await sql`
      UPDATE sessions 
      SET is_active = false 
      WHERE is_active = true 
      AND last_activity < NOW() - INTERVAL '30 minutes'
    `;

    if (result.rowCount > 0) {
      logger.info(`Cleaned up ${result.rowCount} inactive sessions`);
    }
  } catch (error) {
    logger.error('Error cleaning up old sessions:', error);
  }
}

// Update real-time counters
async function updateRealTimeCounters() {
  try {
    // Reset hourly counters
    const now = new Date();
    const hourKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}`;
    
    // This would typically be done with Redis TTL, but for demo purposes
    // we're just logging the counter updates
    logger.debug('Updated real-time counters for hour:', hourKey);
  } catch (error) {
    logger.error('Error updating real-time counters:', error);
  }
}

// Get analytics summary for website
async function getAnalyticsSummary(websiteId, startDate, endDate) {
  try {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    // Get page views count
    const pageViewsResult = await sql`
      SELECT COUNT(*) as count
      FROM page_views 
      WHERE website_id = ${websiteId} 
      AND timestamp BETWEEN ${start} AND ${end}
    `;

    // Get unique sessions count
    const sessionsResult = await sql`
      SELECT COUNT(DISTINCT session_id) as count
      FROM page_views 
      WHERE website_id = ${websiteId} 
      AND timestamp BETWEEN ${start} AND ${end}
    `;

    // Get clicks count
    const clicksResult = await sql`
      SELECT COUNT(*) as count
      FROM click_events 
      WHERE website_id = ${websiteId} 
      AND timestamp BETWEEN ${start} AND ${end}
    `;

    // Get conversions count
    const conversionsResult = await sql`
      SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as total_value
      FROM conversion_events 
      WHERE website_id = ${websiteId} 
      AND timestamp BETWEEN ${start} AND ${end}
    `;

    return {
      period: { start, end },
      pageViews: parseInt(pageViewsResult.rows[0].count),
      uniqueSessions: parseInt(sessionsResult.rows[0].count),
      clicks: parseInt(clicksResult.rows[0].count),
      conversions: parseInt(conversionsResult.rows[0].count),
      totalValue: parseFloat(conversionsResult.rows[0].total_value),
      conversionRate: sessionsResult.rows[0].count > 0 ? 
        (parseInt(conversionsResult.rows[0].count) / parseInt(sessionsResult.rows[0].count) * 100).toFixed(2) : 0
    };
  } catch (error) {
    logger.error('Error getting analytics summary:', error);
    throw error;
  }
}

module.exports = {
  initAnalyticsProcessor,
  processEvent,
  processPageView,
  processClickEvent,
  processConversionEvent,
  processScrollEvent,
  processFormSubmitEvent,
  processCustomEvent,
  updateRealTimeData,
  cleanupOldSessions,
  updateRealTimeCounters,
  getAnalyticsSummary
};
