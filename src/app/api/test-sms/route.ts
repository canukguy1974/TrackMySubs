import { NextRequest, NextResponse } from 'next/server';
import { sendSms } from '@/services/twilio';

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, message }: { phoneNumber: string; message: string } = await req.json();

    if (!phoneNumber || !message) {
      return NextResponse.json({ error: 'Phone number and message are required' }, { status: 400 });
    }

    const result = await sendSms(phoneNumber, message);

    return NextResponse.json({ 
      success: result.success, 
      sid: result.sid,
      error: result.error 
    });
  } catch (error) {
    console.error('SMS test error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
