import { NextRequest, NextResponse } from "next/server";
import { appendGoat, appendWeightHistoryEntry, generateNextGoatId, getAllGoats, validateHeaders } from "@/lib/sheets";
import { Goat } from "@/lib/types";

export async function GET() {
  try {
    const goats = await getAllGoats();
    return NextResponse.json({ goats });
  } catch (error) {
    console.error("GET /api/goats failed:", error);
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to fetch goats.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const goat = (await req.json()) as Goat;
    const now = new Date().toISOString();

    const headerValid = await validateHeaders();
    if (!headerValid) return NextResponse.json({ error: "Sheet headers do not match required format." }, { status: 400 });

    if (!goat.ID?.trim()) {
      goat.ID = await generateNextGoatId();
    }

    const goats = await getAllGoats();
    if (goats.some((g) => g.ID === goat.ID)) return NextResponse.json({ error: "Duplicate ID." }, { status: 400 });

    goat["Created At"] = goat["Created At"] || now;
    goat["Updated At"] = now;

    await appendGoat(goat);
    if (goat.Weight?.trim()) {
      await appendWeightHistoryEntry({
        "Goat ID": goat.ID,
        "Recorded At": now,
        "Weight KG": goat.Weight
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/goats failed:", error);
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to add goat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
