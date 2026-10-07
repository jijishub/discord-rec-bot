import { NextRequest, NextResponse } from "next/server";
import { getStoredPersona, saveStoredPersona } from "@/lib/redis";
import { verifyAdminRequest } from "@/lib/auth";
import { BotPersona } from "@/types";

export async function GET() {
  const result = await getStoredPersona();
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  // Prevent unauthorized public users from overwriting or resetting bot persona
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin authentication required to modify bot persona." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const persona: BotPersona = body.persona;

    if (!persona || typeof persona !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid persona object" },
        { status: 400 }
      );
    }

    const result = await saveStoredPersona(persona);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
