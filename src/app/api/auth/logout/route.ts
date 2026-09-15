import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { crossOriginResponse, isSameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return crossOriginResponse();

  await destroySession();
  return NextResponse.json({ ok: true });
}
