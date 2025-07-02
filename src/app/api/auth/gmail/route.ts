import { NextRequest, NextResponse } from 'next/server';
import { gmailService } from '@/services/gmail';

export async function GET(req: NextRequest) {
  try {
    // Check if Gmail is properly configured
    if (!gmailService.isConfigured()) {
      return NextResponse.json({ 
        error: 'Gmail OAuth is not configured. Please set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET environment variables.' 
      }, { status: 500 });
    }

    const authUrl = await gmailService.getAuthUrl();
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Gmail OAuth URL generation error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate auth URL' 
    }, { status: 500 });
  }
}
