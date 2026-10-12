import { headers } from "next/headers";
import { NextResponse } from "next/server";

// The visitor's country from Vercel's edge (ISO code, e.g. "IN"), so pricing can
// default to INR for India. Null off Vercel (local dev) — callers default to USD.
export const dynamic = "force-dynamic";

export function GET() {
  const country = headers().get("x-vercel-ip-country");
  return NextResponse.json({ country: country || null }, { headers: { "Cache-Control": "private, no-store" } });
}
