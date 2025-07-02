import { NextRequest, NextResponse } from 'next/server';
import { gmailService } from '@/services/gmail';

export async function GET(req: NextRequest) {
  try {
    const authUrl = await gmailService.getAuthUrl();
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Gmail OAuth URL generation error:', error);
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
  }
}
