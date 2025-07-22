/**
 * アナリティクスデータのテストスクリプト
 * 実際のデータが蓄積された際のAPI動作を確認するため
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function insertTestData(projectId) {
  const client = await pool.connect();
  
  try {
    console.log(`プロジェクト ${projectId} にテストデータを挿入中...`);

    // テスト用のページビューデータを挿入
    const testPageViews = [
      // 今日のデータ
      {
        session_id: 'session-1',
        page_url: '/home',
        referrer: 'https://google.com',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        device_type: 'desktop',
        browser: 'Chrome',
        os: 'macOS',
        timestamp: new Date()
      },
      {
        session_id: 'session-1',
        page_url: '/products',
        referrer: 'https://google.com',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        device_type: 'desktop',
        browser: 'Chrome',
        os: 'macOS',
        timestamp: new Date(Date.now() - 5 * 60 * 1000)
      },
      {
        session_id: 'session-2',
        page_url: '/home',
        referrer: 'https://facebook.com',
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
        device_type: 'mobile',
        browser: 'Safari',
        os: 'iOS',
        timestamp: new Date(Date.now() - 10 * 60 * 1000)
      },
      {
        session_id: 'session-3',
        page_url: '/contact',
        referrer: 'Direct',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        device_type: 'desktop',
        browser: 'Edge',
        os: 'Windows',
        timestamp: new Date(Date.now() - 15 * 60 * 1000)
      },
      // 昨日のデータ（変化率計算用）
      {
        session_id: 'session-yesterday-1',
        page_url: '/home',
        referrer: 'https://google.com',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        device_type: 'desktop',
        browser: 'Chrome',
        os: 'macOS',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        session_id: 'session-yesterday-2',
        page_url: '/about',
        referrer: 'https://twitter.com',
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
        device_type: 'mobile',
        browser: 'Safari',
        os: 'iOS',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 - 30 * 60 * 1000)
      }
    ];

    // ページビューデータを挿入
    for (const pageView of testPageViews) {
      await client.query(`
        INSERT INTO page_views (
          project_id, session_id, page_url, referrer, user_agent, 
          device_type, browser, os, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        projectId,
        pageView.session_id,
        pageView.page_url,
        pageView.referrer,
        pageView.user_agent,
        pageView.device_type,
        pageView.browser,
        pageView.os,
        pageView.timestamp
      ]);
    }

    // テスト用のイベントデータを挿入
    const testEvents = [
      {
        session_id: 'session-1',
        event_type: 'click',
        event_data: { element: 'button', text: 'Sign Up' },
        page_url: '/home',
        timestamp: new Date()
      },
      {
        session_id: 'session-2',
        event_type: 'scroll',
        event_data: { scrollDepth: 75 },
        page_url: '/home',
        timestamp: new Date(Date.now() - 8 * 60 * 1000)
      }
    ];

    // イベントデータを挿入
    for (const event of testEvents) {
      await client.query(`
        INSERT INTO events (
          project_id, session_id, event_type, event_data, page_url, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        projectId,
        event.session_id,
        event.event_type,
        JSON.stringify(event.event_data),
        event.page_url,
        event.timestamp
      ]);
    }

    console.log('✅ テストデータの挿入が完了しました');
    console.log(`📊 挿入されたデータ:`);
    console.log(`   - ページビュー: ${testPageViews.length}件`);
    console.log(`   - イベント: ${testEvents.length}件`);
    console.log(`   - セッション: ${new Set(testPageViews.map(pv => pv.session_id)).size}件`);

  } catch (error) {
    console.error('❌ テストデータの挿入に失敗しました:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function cleanupTestData(projectId) {
  const client = await pool.connect();
  
  try {
    console.log(`プロジェクト ${projectId} のテストデータを削除中...`);
    
    // テストデータを削除
    await client.query('DELETE FROM page_views WHERE project_id = $1', [projectId]);
    await client.query('DELETE FROM events WHERE project_id = $1', [projectId]);
    
    console.log('✅ テストデータの削除が完了しました');
  } catch (error) {
    console.error('❌ テストデータの削除に失敗しました:', error);
    throw error;
  } finally {
    client.release();
  }
}

// コマンドライン引数の処理
const command = process.argv[2];
const projectId = process.argv[3];

if (!command || !projectId) {
  console.log('使用方法:');
  console.log('  node scripts/test-analytics-data.js insert <project-id>  # テストデータを挿入');
  console.log('  node scripts/test-analytics-data.js cleanup <project-id> # テストデータを削除');
  process.exit(1);
}

async function main() {
  try {
    if (command === 'insert') {
      await insertTestData(projectId);
    } else if (command === 'cleanup') {
      await cleanupTestData(projectId);
    } else {
      console.error('❌ 無効なコマンドです。insert または cleanup を指定してください。');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main(); 