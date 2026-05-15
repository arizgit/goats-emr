export type MedFrequency = "quarterly" | "semi_annual" | "annual" | "none";

export type MedEventType = "vaccine" | "deworm" | "gave_birth" | "other";

/** Vet checklist items (I–II); empty = not specified */
export type MedProductCode =
  | ""
  | "deworming"
  | "iron"
  | "b_complex"
  | "vitamin_ade"
  | "tetanus"
  | "medication_treatment";

export type MedHistoryEntry = {
  id: string;
  eventType: MedEventType;
  dateGiven: string;
  frequency: MedFrequency;
  nextDueDate: string;
  notes: string;
  productCode: MedProductCode;
  bucklingCount: string;
  doelingCount: string;
};

const PRODUCT_LABELS: Record<Exclude<MedProductCode, "">, string> = {
  deworming: "Deworming",
  iron: "Iron",
  b_complex: "B complex",
  vitamin_ade: "Vitamin A, D & E",
  tetanus: "Tetanus",
  medication_treatment: "Medication / treatment"
};

export function labelForMedProduct(code: MedProductCode): string {
  if (!code) return "";
  return PRODUCT_LABELS[code] ?? "";
}

export function medProductSelectOptions(
  eventType: MedEventType
): { value: MedProductCode; label: string }[] {
  const notSpecified = { value: "" as const, label: "Not specified" };
  switch (eventType) {
    case "vaccine":
      return [
        notSpecified,
        { value: "iron", label: "Iron" },
        { value: "b_complex", label: "B complex" },
        { value: "vitamin_ade", label: "Vitamin A, D & E" },
        { value: "tetanus", label: "Tetanus" }
      ];
    case "deworm":
      return [notSpecified, { value: "deworming", label: "Deworming" }];
    case "other":
      return [notSpecified, { value: "medication_treatment", label: "Medication / treatment" }];
    case "gave_birth":
      return [];
  }
}

export function normalizeProductForEventType(
  eventType: MedEventType,
  productCode: MedProductCode
): MedProductCode {
  const allowed = new Set(
    medProductSelectOptions(eventType).map((o) => o.value)
  );
  if (allowed.has(productCode)) return productCode;
  return "";
}

function coerceEventType(raw: string | undefined): MedEventType {
  if (raw === "vaccine" || raw === "deworm" || raw === "gave_birth" || raw === "other") {
    return raw;
  }
  return "other";
}

function coerceFrequency(raw: string | undefined): MedFrequency {
  if (raw === "quarterly" || raw === "semi_annual" || raw === "annual" || raw === "none") {
    return raw;
  }
  return "none";
}

function coerceProductCode(raw: string | undefined): MedProductCode {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (
    v === "" ||
    v === "deworming" ||
    v === "iron" ||
    v === "b_complex" ||
    v === "vitamin_ade" ||
    v === "tetanus" ||
    v === "medication_treatment"
  ) {
    return v;
  }
  return "";
}

function coerceCount(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  const s = String(raw).trim();
  if (!s) return "";
  if (/^\d+$/.test(s)) return s;
  return "";
}

/** Parses stored JSON; migrates legacy `kapon` events to `other` and preserves context in notes. */
export function parseMedicalHistory(rawValue: string): MedHistoryEntry[] {
  if (!rawValue?.trim()) return [];

  try {
    const parsed = JSON.parse(rawValue) as {
      id?: string;
      eventType?: string;
      dateGiven?: string;
      frequency?: string;
      nextDueDate?: string;
      notes?: string;
      productCode?: string;
      bucklingCount?: unknown;
      doelingCount?: unknown;
    }[];
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => {
      const rawType = item.eventType;
      const wasKapon = rawType === "kapon";
      const baseNotes = typeof item.notes === "string" ? item.notes : "";
      const notes = wasKapon ? (baseNotes.trim() ? `Kapon; ${baseNotes}` : "Kapon") : baseNotes;

      const eventType = wasKapon ? "other" : coerceEventType(rawType);
      const productRaw = coerceProductCode(item.productCode);
      const productCode =
        eventType === "gave_birth" ? "" : normalizeProductForEventType(eventType, productRaw);

      return {
        id: item.id || crypto.randomUUID(),
        eventType,
        dateGiven: item.dateGiven || "",
        frequency: coerceFrequency(item.frequency),
        nextDueDate: item.nextDueDate || "",
        notes,
        productCode,
        bucklingCount: eventType === "gave_birth" ? coerceCount(item.bucklingCount) : "",
        doelingCount: eventType === "gave_birth" ? coerceCount(item.doelingCount) : ""
      };
    });
  } catch {
    return [];
  }
}
