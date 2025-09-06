import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/database';
import { Article, Analytics } from '@/models';

interface SystemLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: any;
}

// In-memory log storage (in production, you'd use a proper logging service)
let systemLogs: SystemLog[] = [];
const MAX_LOGS = 1000;

export function addSystemLog(level: SystemLog['level'], message: string, details?: any) {
  const log: SystemLog = {
    timestamp: new Date().toISOString(),
    level,
    message,
    details
  };
  
  systemLogs.unshift(log);
  
  // Keep only the last MAX_LOGS entries
  if (systemLogs.length > MAX_LOGS) {
    systemLogs = systemLogs.slice(0, MAX_LOGS);
  }
}

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
        latestAnalytics,
        recentErrors,
        recentActivity
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
        Analytics.findOne().sort({ date: -1 }),
        Promise.resolve(systemLogs.filter(log => log.level === 'error').slice(0, 5)),
        Promise.resolve(systemLogs.slice(0, 10))
      ]);

      // Calculate processing rate
      const processingRate = articlesLast24h > 0 ? (articlesLast24h / 24).toFixed(1) : '0';
      
      // System health based on recent errors and activity
      const recentErrorCount = systemLogs.filter(log => 
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
    
    let filteredLogs = systemLogs;
    if (level && ['info', 'warning', 'error', 'success'].includes(level)) {
      filteredLogs = systemLogs.filter(log => log.level === level);
    }
    
    return NextResponse.json({
      logs: filteredLogs.slice(0, limit),
      total: filteredLogs.length
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

// Initialize with a startup log
addSystemLog('info', 'System logs API initialized');
