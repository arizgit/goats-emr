import { NextRequest, NextResponse } from "next/server";
import { getGoatByQrCode } from "@/lib/sheets";

export async function GET(_: NextRequest, context: { params: { qrCode: string } }) {
  try {
    const qrCode = decodeURIComponent(context.params.qrCode);
    const goat = await getGoatByQrCode(qrCode);

    if (!goat) return NextResponse.json({ error: "Goat not found." }, { status: 404 });

    return NextResponse.json({ goat });
  } catch {
    return NextResponse.json({ error: "Scan lookup failed." }, { status: 500 });
  }
}
