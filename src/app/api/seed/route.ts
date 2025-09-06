import { NextRequest, NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seed';

export async function POST(request: NextRequest) {
  try {
    const success = await seedDatabase();
    
    if (success) {
      return NextResponse.json({
        message: 'Database seeded successfully with default RSS feeds and keywords'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to seed database' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in seed API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Seed API endpoint',
    usage: 'POST /api/seed to seed the database with default data'
  });
}
