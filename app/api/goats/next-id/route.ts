import { NextResponse } from "next/server";
import { generateNextGoatId, validateHeaders } from "@/lib/sheets";

export async function GET() {
  try {
    const headerValid = await validateHeaders();
    if (!headerValid) {
      return NextResponse.json({ error: "Sheet headers do not match required format." }, { status: 400 });
    }

    const id = await generateNextGoatId();
    return NextResponse.json({ id });
  } catch (error) {
    console.error("GET /api/goats/next-id failed:", error);
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to generate goat ID.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
