import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/database';

export async function GET() {
  try {
    // Check database connection
    const mongoose = await connectToDatabase();
    
    // Simple database connectivity test
    const isConnected = mongoose.connection.readyState === 1;
    
    const healthStatus = {
      status: isConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: isConnected ? 'connected' : 'disconnected',
        application: 'running'
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    return NextResponse.json(healthStatus, { status: isConnected ? 200 : 503 });
  } catch (error) {
    console.error('Health check failed:', error);
    
    const healthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
        application: 'running'
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    return NextResponse.json(healthStatus, { status: 503 });
  }
}
