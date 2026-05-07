import { NextRequest, NextResponse } from "next/server";
import { getWeightHistoryByGoatId } from "@/lib/sheets";

export async function GET(_: NextRequest, context: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(context.params.id);
    const history = await getWeightHistoryByGoatId(id);
    return NextResponse.json({ history });
  } catch {
    return NextResponse.json({ error: "Failed to fetch weight history." }, { status: 500 });
  }
}
