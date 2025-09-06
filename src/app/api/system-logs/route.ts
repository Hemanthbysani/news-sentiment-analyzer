import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/database';
import { Article, Analytics } from '@/models';
import { addSystemLog, getSystemLogs, getSystemLogsCount } from '@/lib/systemLogger';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'status') {
      // Get system status
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const [
        totalArticles,
        articlesLast24h,
        articlesLastHour,
        latestAnalytics
      ] = await Promise.all([
        Article.countDocuments(),
        Article.countDocuments({ 
          $or: [
            { publishedAt: { $gte: oneDayAgo } },
            { createdAt: { $gte: oneDayAgo } }
          ]
        }),
        Article.countDocuments({ 
          $or: [
            { publishedAt: { $gte: oneHourAgo } },
            { createdAt: { $gte: oneHourAgo } }
          ]
        }),
        Analytics.findOne().sort({ date: -1 })
      ]);

      const allLogs = getSystemLogs();
      const recentErrors = allLogs.filter(log => log.level === 'error').slice(0, 5);
      const recentActivity = allLogs.slice(0, 10);

      // Calculate processing rate
      const processingRate = articlesLast24h > 0 ? (articlesLast24h / 24).toFixed(1) : '0';
      
      // System health based on recent errors and activity
      const recentErrorCount = allLogs.filter(log => 
        log.level === 'error' && 
        new Date(log.timestamp) > oneHourAgo
      ).length;
      
      let healthStatus: 'healthy' | 'warning' | 'error' = 'healthy';
      if (recentErrorCount > 5) {
        healthStatus = 'error';
      } else if (recentErrorCount > 2) {
        healthStatus = 'warning';
      }

      return NextResponse.json({
        status: {
          health: healthStatus,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: now.toISOString()
        },
        metrics: {
          totalArticles,
          articlesLast24h,
          articlesLastHour,
          processingRate: `${processingRate} articles/hour`,
          lastAnalyticsUpdate: latestAnalytics?.date
        },
        activity: {
          recentLogs: recentActivity,
          recentErrors,
          errorCount: recentErrorCount
        }
      });
    }

    // Return recent logs
    const limit = parseInt(searchParams.get('limit') || '50');
    const level = searchParams.get('level');
    
    const filteredLogs = getSystemLogs(limit, level || undefined);
    
    return NextResponse.json({
      logs: filteredLogs,
      total: getSystemLogsCount()
    });

  } catch (error) {
    console.error('System logs API error:', error);
    addSystemLog('error', 'System logs API error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      { error: 'Failed to fetch system logs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level, message, details } = body;
    
    if (!level || !message) {
      return NextResponse.json(
        { error: 'Level and message are required' },
        { status: 400 }
      );
    }
    
    addSystemLog(level, message, details);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Add log error:', error);
    return NextResponse.json(
      { error: 'Failed to add log' },
      { status: 500 }
    );
  }
}
