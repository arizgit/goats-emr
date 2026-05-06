import { NextRequest, NextResponse } from "next/server";
import { getGoatByBarcode } from "@/lib/sheets";

export async function GET(_: NextRequest, context: { params: { barcode: string } }) {
  try {
    const barcode = decodeURIComponent(context.params.barcode);
    const goat = await getGoatByBarcode(barcode);

    if (!goat) return NextResponse.json({ error: "Goat not found." }, { status: 404 });

    return NextResponse.json({ goat });
  } catch {
    return NextResponse.json({ error: "Scan lookup failed." }, { status: 500 });
  }
}
