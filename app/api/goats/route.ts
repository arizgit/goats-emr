import { NextRequest, NextResponse } from "next/server";
import { findQrConflict, normalizeQrCode, type GoatWritePayload } from "@/lib/qrCode";
import { appendGoat, appendWeightHistoryEntry, clearQrCodeFromGoat, generateNextGoatId, generateNextQrCode, getAllGoats, validateHeaders } from "@/lib/sheets";

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
    const body = (await req.json()) as GoatWritePayload;
    const { reassignQr, ...goat } = body;
    const now = new Date().toISOString();

    const headerValid = await validateHeaders();
    if (!headerValid) return NextResponse.json({ error: "Sheet headers do not match required format." }, { status: 400 });

    if (!goat.ID?.trim()) {
      goat.ID = await generateNextGoatId();
    }

    goat["QR Code"] = normalizeQrCode(goat["QR Code"]);
    if (!goat["QR Code"]) {
      goat["QR Code"] = await generateNextQrCode();
    }

    const goats = await getAllGoats();
    if (goats.some((g) => g.ID === goat.ID)) return NextResponse.json({ error: "Duplicate ID." }, { status: 400 });

    const conflict = findQrConflict(goats, goat["QR Code"], goat.ID);
    if (conflict) {
      if (!reassignQr) {
        return NextResponse.json(
          {
            error: `QR code ${goat["QR Code"]} is already assigned to ${conflict.ID}${conflict.Name ? ` (${conflict.Name})` : ""}.`,
            conflictGoatId: conflict.ID,
            conflictGoatName: conflict.Name || ""
          },
          { status: 409 }
        );
      }
      await clearQrCodeFromGoat(conflict.ID);
    }

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
    return NextResponse.json({ ok: true, goat });
  } catch (error) {
    console.error("POST /api/goats failed:", error);
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to add goat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
