import { summarizeText } from '@/services/huggingface';
import { NextResponse } from 'next/server';

export async function GET() {
  const summary = await summarizeText("The quick brown fox jumps over the lazy dog.");

  return NextResponse.json({ summary });
}
