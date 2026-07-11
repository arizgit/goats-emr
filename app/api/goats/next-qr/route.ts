import { NextResponse } from "next/server";
import { generateNextQrCode, validateHeaders } from "@/lib/sheets";

export async function GET() {
  try {
    const headerValid = await validateHeaders();
    if (!headerValid) {
      return NextResponse.json({ error: "Sheet headers do not match required format." }, { status: 400 });
    }

    const qrCode = await generateNextQrCode();
    return NextResponse.json({ qrCode });
  } catch (error) {
    console.error("GET /api/goats/next-qr failed:", error);
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to generate QR code.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
