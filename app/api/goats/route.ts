import { NextRequest, NextResponse } from "next/server";
import { appendGoat, getAllGoats, validateHeaders } from "@/lib/sheets";
import { Goat } from "@/lib/types";

export async function GET() {
  try {
    const goats = await getAllGoats();
    return NextResponse.json({ goats });
  } catch {
    return NextResponse.json({ error: "Failed to fetch goats." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const goat = (await req.json()) as Goat;
    if (!goat.ID?.trim()) return NextResponse.json({ error: "ID is required." }, { status: 400 });

    const headerValid = await validateHeaders();
    if (!headerValid) return NextResponse.json({ error: "Sheet headers do not match required format." }, { status: 400 });

    const goats = await getAllGoats();
    if (goats.some((g) => g.ID === goat.ID)) return NextResponse.json({ error: "Duplicate ID." }, { status: 400 });

    await appendGoat(goat);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to add goat." }, { status: 500 });
  }
}
