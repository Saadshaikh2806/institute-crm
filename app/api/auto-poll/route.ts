import { NextResponse } from 'next/server';

export async function GET() {
  // Your API logic here
  return NextResponse.json({ status: 'ok' });
}
