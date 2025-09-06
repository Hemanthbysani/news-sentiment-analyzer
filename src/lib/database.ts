import mongoose from 'mongoose';

// Try multiple possible environment variable names for MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 
                   process.env.DATABASE_URL || 
                   process.env.MONGO_URL ||
                   'mongodb://localhost:27017/news-sentiment-analyzer';

// Debug logging for production
if (process.env.NODE_ENV === 'production') {
  console.log('=== MongoDB Connection Debug ===');
  console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  console.log('MONGO_URL:', process.env.MONGO_URL ? 'Set' : 'Not set');
  console.log('Final URI being used:', MONGODB_URI.substring(0, 20) + '...');
  console.log('All environment variables containing "MONGO" or "DATABASE":', 
    Object.keys(process.env).filter(key => 
      key.toUpperCase().includes('MONGO') || 
      key.toUpperCase().includes('DATABASE')
    )
  );
  console.log('================================');
}

interface MongooseConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseConnection | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export default connectDB;
