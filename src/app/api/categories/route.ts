import { NextRequest, NextResponse } from "next/server";
import { getStoredCategories, saveStoredCategories } from "@/lib/redis";
import { verifyAdminRequest } from "@/lib/auth";
import { Category } from "@/types";

export async function GET() {
  const result = await getStoredCategories();
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  // Prevent unauthorized public users from overwriting or resetting categories
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin authentication required to modify categories." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const categories: Category[] = body.categories;

    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { success: false, error: "Invalid categories array" },
        { status: 400 }
      );
    }

    const result = await saveStoredCategories(categories);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
