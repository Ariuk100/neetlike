// app/api/sant/problems/route.ts
import { NextResponse } from 'next/server';
import { problems } from './data';

export async function GET() {
  return NextResponse.json(problems);
}