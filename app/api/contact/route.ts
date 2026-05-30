import { NextResponse } from 'next/server';
import getClientPromise from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Validate input
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Connect to MongoDB (lazy — checks MONGODB_URI at request time)
    const client = await getClientPromise();
    const db = client.db('shopply');
    
    // Store message in the database
    await db.collection('messages').insertOne({
      name,
      email,
      message,
      created_at: new Date()
    });

    // Return success response
    return NextResponse.json(
      { message: 'Message sent successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('MongoDB contact form error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
