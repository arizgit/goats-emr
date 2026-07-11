import { Goat } from "@/lib/types";

export type GoatWritePayload = Goat & {
  /** When true, clear this QR from any other goat before assigning. */
  reassignQr?: boolean;
};

/**
 * Normalize tag codes for compare/save.
 * Sheets often strips leading zeros from numeric-looking values (001 → 1);
 * restore 3-digit width for short numeric tags.
 */
export function normalizeQrCode(value: string | undefined | number): string {
  let normalized = String(value ?? "").trim().toUpperCase();
  // Drop a leading apostrophe Sheets may keep in rare cases.
  if (normalized.startsWith("'")) normalized = normalized.slice(1);
  if (/^\d{1,2}$/.test(normalized)) {
    normalized = normalized.padStart(3, "0");
  }
  return normalized;
}

/** Force Sheets to store the tag as text so leading zeros are kept. */
export function qrCodeForSheetWrite(value: string | undefined): string {
  const normalized = normalizeQrCode(value);
  if (!normalized) return "";
  return `'${normalized}`;
}

export function findQrConflict(
  goats: Goat[],
  qrCode: string,
  excludeGoatId?: string
): Goat | null {
  const normalized = normalizeQrCode(qrCode);
  if (!normalized) return null;

  return (
    goats.find(
      (goat) =>
        normalizeQrCode(goat["QR Code"]) === normalized &&
        (!excludeGoatId || goat.ID !== excludeGoatId)
    ) || null
  );
}
