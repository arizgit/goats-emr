import { NextRequest, NextResponse } from "next/server";
import { appendWeightHistoryEntry, getGoatById, updateGoatById } from "@/lib/sheets";
import { Goat } from "@/lib/types";

export async function GET(_: NextRequest, context: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(context.params.id);
    const goat = await getGoatById(id);
    if (!goat) return NextResponse.json({ error: "Goat not found." }, { status: 404 });
    return NextResponse.json({ goat });
  } catch {
    return NextResponse.json({ error: "Failed to fetch goat." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(context.params.id);
    const goat = (await req.json()) as Goat;
    const now = new Date().toISOString();
    if (!goat.ID?.trim()) return NextResponse.json({ error: "ID is required." }, { status: 400 });

    const existing = await getGoatById(id);
    if (!existing) return NextResponse.json({ error: "Goat not found." }, { status: 404 });

    goat["Created At"] = goat["Created At"] || existing["Created At"] || now;
    goat["Updated At"] = now;

    const updated = await updateGoatById(id, goat);
    if (!updated) return NextResponse.json({ error: "Goat not found." }, { status: 404 });

    if ((existing.Weight || "").trim() !== (goat.Weight || "").trim() && goat.Weight?.trim()) {
      await appendWeightHistoryEntry({
        "Goat ID": goat.ID,
        "Recorded At": now,
        "Weight KG": goat.Weight
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update goat." }, { status: 500 });
  }
}
