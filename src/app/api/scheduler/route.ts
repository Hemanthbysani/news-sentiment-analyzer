import { NextRequest, NextResponse } from 'next/server';
import schedulerService from '@/services/scheduler';

export async function GET() {
  try {
    const status = schedulerService.getStatus();
    
    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get scheduler status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'start') {
      schedulerService.start();
      return NextResponse.json({
        success: true,
        message: 'Scheduler started'
      });
    } else if (action === 'stop') {
      schedulerService.stop();
      return NextResponse.json({
        success: true,
        message: 'Scheduler stopped'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error controlling scheduler:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to control scheduler' },
      { status: 500 }
    );
  }
}
