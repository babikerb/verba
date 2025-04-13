import { supabase } from '@/services/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data, error } = await supabase.from('transcripts').select('*');

  if (error) return NextResponse.json({ error: error.message });

  return NextResponse.json({ data });
}
