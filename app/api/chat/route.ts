import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Chat endpoint not yet implemented (Phase 5)" },
    { status: 501 },
  );
}
