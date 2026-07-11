"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GoatIdQrBlock from "@/components/GoatIdQrBlock";
import GoatImage from "@/components/GoatImage";
import {
  medProductSelectOptions,
  normalizeProductForEventType,
  parseMedicalHistory,
  type MedEventType,
  type MedFrequency,
  type MedHistoryEntry,
  type MedProductCode
} from "@/lib/medicalHistory";
import { Goat } from "@/lib/types";

type Props = {
  initialValue?: Goat;
  mode: "create" | "edit";
};

const createEmptyMedEntry = (): MedHistoryEntry => ({
  id: crypto.randomUUID(),
  eventType: "vaccine",
  dateGiven: "",
  frequency: "none",
  nextDueDate: "",
  notes: "",
  productCode: "",
  bucklingCount: "",
  doelingCount: ""
});

function computeNextDueDate(dateGiven: string, frequency: MedFrequency): string {
  if (!dateGiven || frequency === "none") return "";

  const date = new Date(`${dateGiven}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  if (frequency === "quarterly") {
    date.setMonth(date.getMonth() + 3);
  } else if (frequency === "semi_annual") {
    date.setMonth(date.getMonth() + 6);
  } else if (frequency === "annual") {
    date.setFullYear(date.getFullYear() + 1);
  }

  return date.toISOString().slice(0, 10);
}

const emptyGoat: Goat = {
  ID: "",
  "Farm ID": "",
  Gender: "",
  Birthdate: "",
  Name: "",
  "QR Code": "",
  Image: "",
  "Parent Buck": "",
  "Parent Doe": "",
  "Date Disposed": "",
  Weight: "",
  "Medical History": "[]",
  Remarks: "",
  "Created At": "",
  "Updated At": ""
};

export default function GoatForm({ initialValue, mode }: Props) {
  const router = useRouter();
  const [goat, setGoat] = useState<Goat>(initialValue || emptyGoat);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [idLoading, setIdLoading] = useState(mode === "create");
  const [qrLoading, setQrLoading] = useState(false);
  const [allGoats, setAllGoats] = useState<Goat[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<MedHistoryEntry[]>(
    parseMedicalHistory((initialValue || emptyGoat)["Medical History"] || "[]")
  );

  const title = useMemo(() => (mode === "create" ? "Add New Goat" : "Edit Goat"), [mode]);

  const handleChange = (key: keyof Goat, value: string) => {
    setGoat((prev) => ({ ...prev, [key]: value }));
  };

  const updateMedicalEntry = (entryId: string, key: keyof MedHistoryEntry, value: string) => {
    setMedicalHistory((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) return entry;

        if (key === "eventType") {
          const newType = value as MedEventType;
          return {
            ...entry,
            eventType: newType,
            bucklingCount: newType === "gave_birth" ? entry.bucklingCount : "",
            doelingCount: newType === "gave_birth" ? entry.doelingCount : "",
            productCode: newType === "gave_birth" ? "" : normalizeProductForEventType(newType, entry.productCode),
            nextDueDate: computeNextDueDate(entry.dateGiven, entry.frequency)
          };
        }

        const updatedEntry: MedHistoryEntry =
          key === "frequency"
            ? { ...entry, frequency: value as MedFrequency }
            : key === "productCode"
              ? {
                  ...entry,
                  productCode: normalizeProductForEventType(entry.eventType, value as MedProductCode)
                }
              : { ...entry, [key]: value };

        if (key === "dateGiven" || key === "frequency") {
          updatedEntry.nextDueDate = computeNextDueDate(updatedEntry.dateGiven, updatedEntry.frequency);
        }

        return updatedEntry;
      })
    );
  };

  const addMedicalEntry = () => {
    setMedicalHistory((prev) => [...prev, createEmptyMedEntry()]);
  };

  const removeMedicalEntry = (entryId: string) => {
    setMedicalHistory((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  useEffect(() => {
    if (goat.Gender === "F") return;

    // Prevent non-female goats from retaining "gave_birth" medical events.
    setMedicalHistory((prev) =>
      prev.map((entry) =>
        entry.eventType === "gave_birth"
          ? {
              ...entry,
              eventType: "other",
              bucklingCount: "",
              doelingCount: "",
              productCode: normalizeProductForEventType("other", entry.productCode)
            }
          : entry
      )
    );
  }, [goat.Gender]);

  const handleImageUpload = async (file?: File) => {
    if (!file) return;

    setImageUploading(true);
    setError("");

    try {
      const body = new FormData();
      body.set("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed.");

      handleChange("Image", json.url as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setImageUploading(false);
    }
  };

  useEffect(() => {
    if (mode !== "create" || !idLoading) return;

    const fetchNextIds = async () => {
      try {
        const [idRes, qrRes] = await Promise.all([fetch("/api/goats/next-id"), fetch("/api/goats/next-qr")]);
        const idJson = (await idRes.json()) as { id?: string; error?: string };
        const qrJson = (await qrRes.json()) as { qrCode?: string; error?: string };
        if (!idRes.ok) throw new Error(idJson.error || "Failed to generate ID.");
        if (!qrRes.ok) throw new Error(qrJson.error || "Failed to generate QR code.");
        setGoat((prev) => ({
          ...prev,
          ID: idJson.id || "",
          "QR Code": qrJson.qrCode || ""
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate ID.");
      } finally {
        setIdLoading(false);
      }
    };

    void fetchNextIds();
  }, [idLoading, mode]);

  const generateQrCode = async () => {
    setQrLoading(true);
    setError("");
    try {
      const res = await fetch("/api/goats/next-qr");
      const json = (await res.json()) as { qrCode?: string; error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to generate QR code.");
      handleChange("QR Code", json.qrCode || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate QR code.");
    } finally {
      setQrLoading(false);
    }
  };

  useEffect(() => {
    const fetchGoats = async () => {
      try {
        const res = await fetch("/api/goats");
        const json = (await res.json()) as { goats?: Goat[] };
        if (!res.ok) return;
        setAllGoats(json.goats || []);
      } catch {
        setAllGoats([]);
      }
    };

    void fetchGoats();
  }, []);

  const parentCandidates = useMemo(
    () =>
      allGoats.filter((item) => item.ID && item.ID !== goat.ID).map((item) => ({
        value: item.ID,
        label: `${item.ID}${item.Name ? ` - ${item.Name}` : ""}`
      })),
    [allGoats, goat.ID]
  );

  const buckOptions = useMemo(
    () => parentCandidates.filter((option) => allGoats.find((g) => g.ID === option.value)?.Gender === "M"),
    [allGoats, parentCandidates]
  );

  const doeOptions = useMemo(
    () => parentCandidates.filter((option) => allGoats.find((g) => g.ID === option.value)?.Gender === "F"),
    [allGoats, parentCandidates]
  );

  const qrConflict = useMemo(() => {
    const qr = goat["QR Code"].trim().toUpperCase();
    if (!qr) return null;
    return (
      allGoats.find(
        (item) => item["QR Code"].trim().toUpperCase() === qr && item.ID !== goat.ID
      ) || null
    );
  }, [allGoats, goat.ID, goat["QR Code"]]);

  const saveGoat = async (reassignQr: boolean) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const normalizedGoat: Goat = {
        ...goat,
        "QR Code": goat["QR Code"].trim(),
        "Medical History": JSON.stringify(medicalHistory),
        Name: goat.Name
          ? `${goat.Name.trim().charAt(0).toUpperCase()}${goat.Name.trim().slice(1)}`
          : ""
      };
      const endpoint = mode === "create" ? "/api/goats" : `/api/goats/${encodeURIComponent(initialValue?.ID || goat.ID)}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...normalizedGoat, reassignQr })
      });

      const json = (await res.json()) as {
        error?: string;
        conflictGoatId?: string;
        conflictGoatName?: string;
      };

      if (res.status === 409 && json.conflictGoatId && !reassignQr) {
        const ownerLabel = `${json.conflictGoatId}${json.conflictGoatName ? ` (${json.conflictGoatName})` : ""}`;
        const confirmed = window.confirm(
          `QR code ${normalizedGoat["QR Code"]} is already assigned to ${ownerLabel}.\n\nReassign this tag to the current goat? The previous goat will have no QR until you assign another.`
        );
        if (confirmed) {
          await saveGoat(true);
          return;
        }
        setError(json.error || "QR code is already assigned.");
        return;
      }

      if (!res.ok) throw new Error(json.error || "Request failed.");

      setSuccess(mode === "create" ? "Goat added successfully." : "Goat updated successfully.");
      if (mode === "create") {
        setGoat(emptyGoat);
        setMedicalHistory([]);
        setIdLoading(true);
      } else {
        setGoat(normalizedGoat);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!goat.ID.trim()) {
      setError("ID is required.");
      return;
    }

    await saveGoat(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold text-farm-700">{title}</h2>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">ID</span>
        <input
          value={goat.ID}
          onChange={(e) => handleChange("ID", e.target.value)}
          placeholder={mode === "create" ? "Generating ID..." : "Kambing ID"}
          readOnly
          className="w-full rounded-xl border border-farm-200 p-3 text-base read-only:bg-farm-50"
        />
        <p className="mt-1 text-xs text-slate-500">Permanent record ID. Not printed on tags and not reassigned.</p>
      </label>

      <div className="space-y-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">QR tag code</span>
          <input
            value={goat["QR Code"]}
            onChange={(e) => handleChange("QR Code", e.target.value)}
            placeholder={idLoading ? "Generating tag code..." : "e.g. 001"}
            className="w-full rounded-xl border border-farm-200 p-3 font-mono text-base"
          />
        </label>
        <p className="text-xs text-slate-500">
          Reassignable physical tag. Encoded in the QR below. Clear to unassign, or generate a new unused code.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void generateQrCode()}
            disabled={qrLoading || idLoading}
            className="rounded-xl bg-farm-100 px-4 py-2 text-sm font-semibold text-farm-800 disabled:opacity-60"
          >
            {qrLoading ? "Generating…" : "Generate new tag"}
          </button>
          <button
            type="button"
            onClick={() => handleChange("QR Code", "")}
            disabled={!goat["QR Code"].trim()}
            className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
          >
            Unassign tag
          </button>
        </div>
        {qrConflict && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            This tag is currently on {qrConflict.ID}
            {qrConflict.Name ? ` (${qrConflict.Name})` : ""}. Saving will ask to reassign it here.
          </p>
        )}
      </div>

      {!idLoading && goat["QR Code"].trim() && (
        <GoatIdQrBlock encodedValue={goat["QR Code"].trim()} displayLabel={goat.Name || undefined} />
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Kasarian / Gender</span>
        <select value={goat.Gender} onChange={(e) => handleChange("Gender", e.target.value as Goat["Gender"])} className="w-full rounded-xl border border-farm-200 p-3 text-base">
          <option value="">Piliin ang kasarian</option>
          <option value="M">Lalake</option>
          <option value="F">Babae</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Birthdate</span>
        <input type="date" value={goat.Birthdate} onChange={(e) => handleChange("Birthdate", e.target.value)} className="w-full rounded-xl border border-farm-200 p-3 text-base" />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Pangalan / Name</span>
        <input value={goat.Name} onChange={(e) => handleChange("Name", e.target.value)} className="w-full rounded-xl border border-farm-200 p-3 text-base" />
      </label>

      <div className="space-y-2">
        <span className="block text-sm font-medium">Image</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={imageUploading}
          onChange={(e) => void handleImageUpload(e.target.files?.[0])}
          className="w-full rounded-xl border border-farm-200 p-3 text-base disabled:opacity-60"
        />
        {imageUploading && <p className="text-sm text-farm-700">Uploading image…</p>}
        {goat.Image && (
          <GoatImage
            src={goat.Image}
            alt="Goat"
            width={640}
            height={320}
            className="h-40 w-full rounded-xl object-cover"
          />
        )}
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Tty bulog / Parent buck</span>
        <select value={goat["Parent Buck"]} onChange={(e) => handleChange("Parent Buck", e.target.value)} className="w-full rounded-xl border border-farm-200 p-3 text-base">
          <option value="">Select goat</option>
          {buckOptions.map((option) => (
            <option key={`buck-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Nny doe / Parent doe</span>
        <select value={goat["Parent Doe"]} onChange={(e) => handleChange("Parent Doe", e.target.value)} className="w-full rounded-xl border border-farm-200 p-3 text-base">
          <option value="">Select goat</option>
          {doeOptions.map((option) => (
            <option key={`doe-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Date Disposed</span>
        <input type="date" value={goat["Date Disposed"]} onChange={(e) => handleChange("Date Disposed", e.target.value)} className="w-full rounded-xl border border-farm-200 p-3 text-base" />
      </label>

      <label className="block"><span className="mb-1 block text-sm font-medium">Bigat / Weight (KG)</span><input type="number" step="0.01" value={goat.Weight} onChange={(e) => handleChange("Weight", e.target.value)} className="w-full rounded-xl border border-farm-200 p-3 text-base" /></label>
      <div className="space-y-3 rounded-xl border border-farm-100 p-3">
        <div className="flex items-center justify-between">
          <span className="block text-sm font-medium">Medical History</span>
          <button type="button" onClick={addMedicalEntry} className="rounded-lg bg-farm-100 px-3 py-1 text-xs font-semibold text-farm-700">
            + Add Update
          </button>
        </div>
        {medicalHistory.length === 0 && (
          <p className="text-sm text-farm-700">No medical updates yet.</p>
        )}
        {medicalHistory.map((entry) => (
          <div key={entry.id} className="space-y-2 rounded-xl border border-farm-100 p-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium">Event Type</span>
              <select value={entry.eventType} onChange={(e) => updateMedicalEntry(entry.id, "eventType", e.target.value)} className="w-full rounded-lg border border-farm-200 p-2 text-sm">
                <option value="vaccine">Vaccine</option>
                <option value="deworm">Deworm</option>
                {goat.Gender === "F" && <option value="gave_birth">Gave Birth</option>}
                <option value="other">Other (medications & treatments)</option>
              </select>
            </label>
            {medProductSelectOptions(entry.eventType).length > 0 && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium">Treatment / vaccine</span>
                <select
                  value={entry.productCode}
                  onChange={(e) => updateMedicalEntry(entry.id, "productCode", e.target.value)}
                  className="w-full rounded-lg border border-farm-200 p-2 text-sm"
                >
                  {medProductSelectOptions(entry.eventType).map((opt) => (
                    <option key={opt.value || "none"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {entry.eventType === "gave_birth" ? (
              <>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium">Birthing date</span>
                  <input type="date" value={entry.dateGiven} onChange={(e) => updateMedicalEntry(entry.id, "dateGiven", e.target.value)} className="w-full rounded-lg border border-farm-200 p-2 text-sm" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium">Number bucklings</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={entry.bucklingCount}
                      onChange={(e) => updateMedicalEntry(entry.id, "bucklingCount", e.target.value.replace(/\D/g, ""))}
                      className="w-full rounded-lg border border-farm-200 p-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium">Number doelings</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={entry.doelingCount}
                      onChange={(e) => updateMedicalEntry(entry.id, "doelingCount", e.target.value.replace(/\D/g, ""))}
                      className="w-full rounded-lg border border-farm-200 p-2 text-sm"
                    />
                  </label>
                </div>
              </>
            ) : (
              <label className="block">
                <span className="mb-1 block text-xs font-medium">Date given</span>
                <input type="date" value={entry.dateGiven} onChange={(e) => updateMedicalEntry(entry.id, "dateGiven", e.target.value)} className="w-full rounded-lg border border-farm-200 p-2 text-sm" />
              </label>
            )}
            <label className="block">
              <span className="mb-1 block text-xs font-medium">Frequency</span>
              <select value={entry.frequency} onChange={(e) => updateMedicalEntry(entry.id, "frequency", e.target.value)} className="w-full rounded-lg border border-farm-200 p-2 text-sm">
                <option value="none">One-time / none</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi_annual">Semi-annual</option>
                <option value="annual">Annual</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">Next Due Date</span>
              <input type="date" value={entry.nextDueDate} onChange={(e) => updateMedicalEntry(entry.id, "nextDueDate", e.target.value)} className="w-full rounded-lg border border-farm-200 p-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">Notes / comments / advice</span>
              <textarea value={entry.notes} onChange={(e) => updateMedicalEntry(entry.id, "notes", e.target.value)} className="w-full rounded-lg border border-farm-200 p-2 text-sm" rows={2} />
            </label>
            <button type="button" onClick={() => removeMedicalEntry(entry.id)} className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
              Remove
            </button>
          </div>
        ))}
      </div>
      <label className="block"><span className="mb-1 block text-sm font-medium">Remarks</span><textarea value={goat.Remarks} onChange={(e) => handleChange("Remarks", e.target.value)} className="w-full rounded-xl border border-farm-200 p-3 text-base" rows={4} /></label>

      {error && <p className="rounded-xl bg-red-100 p-3 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-xl bg-farm-100 p-3 text-sm text-farm-700">{success}</p>}

      <button type="submit" disabled={loading || imageUploading || idLoading || qrLoading} className="w-full rounded-xl bg-farm-700 px-4 py-3 text-base font-bold text-white disabled:opacity-60">
        {loading ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
