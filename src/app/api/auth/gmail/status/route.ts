import { NextResponse } from 'next/server';
import { gmailService } from '@/services/gmail';

export async function GET() {
  try {
    const isConfigured = gmailService.isConfigured();
    
    return NextResponse.json({
      configured: isConfigured,
      message: isConfigured 
        ? 'Gmail OAuth is properly configured' 
        : 'Gmail OAuth credentials are missing. Please set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET environment variables.'
    });
  } catch (error) {
    console.error('Gmail status check error:', error);
    return NextResponse.json({
      configured: false,
      error: 'Failed to check Gmail configuration'
    }, { status: 500 });
  }
}
