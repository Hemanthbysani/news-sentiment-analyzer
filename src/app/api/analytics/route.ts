import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import analyticsService from '@/services/analytics';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') as 'hour' | 'day' | 'week' | 'month' || 'day';
    const limit = parseInt(searchParams.get('limit') || '1000');

    const metrics = await analyticsService.generateDashboardMetrics(timeframe, limit);

    return NextResponse.json(metrics);

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
