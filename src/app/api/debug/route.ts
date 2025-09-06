import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI: process.env.MONGODB_URI ? 'Set (hidden)' : 'Not set',
      DATABASE_URL: process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set',
      MONGO_URL: process.env.MONGO_URL ? 'Set (hidden)' : 'Not set',
      allMongoKeys: Object.keys(process.env).filter(key => 
        key.toUpperCase().includes('MONGO') || 
        key.toUpperCase().includes('DATABASE')
      ),
      totalEnvVars: Object.keys(process.env).length
    };

    return NextResponse.json({
      status: 'success',
      environment: envVars,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
