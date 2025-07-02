import { NextRequest, NextResponse } from 'next/server';
import { gmailService } from '@/services/gmail';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL(`/connect-account?error=${error}`, req.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/connect-account?error=no_code', req.url));
    }

    // Exchange code for tokens
    const credentials = await gmailService.getTokens(code);
    
    // In a real app, you'd save these credentials to your database
    // For testing, we'll redirect with the tokens in the URL (NOT SECURE - only for testing)
    const params = new URLSearchParams({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || '',
      expiry_date: credentials.expiry_date?.toString() || '',
      success: 'true'
    });

    return NextResponse.redirect(new URL(`/connect-account?${params.toString()}`, req.url));
  } catch (error) {
    console.error('Gmail OAuth callback error:', error);
    return NextResponse.redirect(new URL('/connect-account?error=auth_failed', req.url));
  }
}
