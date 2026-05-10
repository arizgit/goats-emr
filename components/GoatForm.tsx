"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BarcodeScanner from "@/components/BarcodeScanner";
import GoatIdQrBlock from "@/components/GoatIdQrBlock";
import GoatImage from "@/components/GoatImage";
import { Goat } from "@/lib/types";

type Props = {
  initialValue?: Goat;
  mode: "create" | "edit";
  prefilledQrCode?: string;
};

type MedFrequency = "quarterly" | "semi_annual" | "annual" | "none";
type MedEventType = "vaccine" | "deworm" | "kapon" | "gave_birth" | "other";

type MedHistoryEntry = {
  id: string;
  eventType: MedEventType;
  dateGiven: string;
  frequency: MedFrequency;
  nextDueDate: string;
  notes: string;
};

const createEmptyMedEntry = (): MedHistoryEntry => ({
  id: crypto.randomUUID(),
  eventType: "vaccine",
  dateGiven: "",
  frequency: "none",
  nextDueDate: "",
  notes: ""
});

function parseMedicalHistory(rawValue: string): MedHistoryEntry[] {
  if (!rawValue?.trim()) return [];

  try {
    const parsed = JSON.parse(rawValue) as Partial<MedHistoryEntry>[];
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => ({
      id: item.id || crypto.randomUUID(),
      eventType: (item.eventType as MedEventType) || "other",
      dateGiven: item.dateGiven || "",
      frequency: (item.frequency as MedFrequency) || "none",
      nextDueDate: item.nextDueDate || "",
      notes: item.notes || ""
    }));
  } catch {
    return [];
  }
}

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

export default function GoatForm({ initialValue, mode, prefilledQrCode }: Props) {
  const router = useRouter();
  const [goat, setGoat] = useState<Goat>(
    initialValue || { ...emptyGoat, "QR Code": prefilledQrCode || "" }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [qrScanStatus, setQrScanStatus] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [idLoading, setIdLoading] = useState(mode === "create");
  const [allGoats, setAllGoats] = useState<Goat[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<MedHistoryEntry[]>(
    parseMedicalHistory((initialValue || emptyGoat)["Medical History"] || "[]")
  );

  const title = useMemo(() => (mode === "create" ? "Add New Goat" : "Edit Goat"), [mode]);

  const qrEncodedValue = goat["QR Code"].trim() || goat.ID.trim();
  const qrFieldMatchesId =
    Boolean(goat.ID.trim()) && goat["QR Code"].trim() === goat.ID.trim();

  const handleChange = (key: keyof Goat, value: string) => {
    setGoat((prev) => ({ ...prev, [key]: value }));
  };

  const updateMedicalEntry = (entryId: string, key: keyof MedHistoryEntry, value: string) => {
    setMedicalHistory((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) return entry;

        const updatedEntry = { ...entry, [key]: value };
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
      prev.map((entry) => (entry.eventType === "gave_birth" ? { ...entry, eventType: "other" } : entry))
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

    const fetchNextId = async () => {
      try {
        const res = await fetch("/api/goats/next-id");
        const json = (await res.json()) as { id?: string; error?: string };
        if (!res.ok) throw new Error(json.error || "Failed to generate ID.");
        handleChange("ID", json.id || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate ID.");
      } finally {
        setIdLoading(false);
      }
    };

    void fetchNextId();
  }, [idLoading, mode]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!goat.ID.trim()) {
      setError("ID is required.");
      return;
    }

    setLoading(true);

    try {
      const normalizedGoat: Goat = {
        ...goat,
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
        body: JSON.stringify(normalizedGoat)
      });

      const json = await res.json();
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

  const handleQrDetected = async (value: string) => {
    const detectedValue = value.trim();
    if (!detectedValue) return;

    setQrScanStatus(`Detected QR code: ${detectedValue}`);
    const updatedGoat = { ...goat, "QR Code": detectedValue };
    setGoat(updatedGoat);

    // Create mode keeps manual save flow; edit mode auto-saves to avoid missed updates.
    if (mode !== "edit") {
      setSuccess("QR code captured. Tap Save to persist.");
      setShowScanner(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const normalizedGoat: Goat = {
        ...updatedGoat,
        "Medical History": JSON.stringify(medicalHistory),
        Name: updatedGoat.Name
          ? `${updatedGoat.Name.trim().charAt(0).toUpperCase()}${updatedGoat.Name.trim().slice(1)}`
          : ""
      };

      const endpoint = `/api/goats/${encodeURIComponent(initialValue?.ID || updatedGoat.ID)}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedGoat)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed.");

      setSuccess("QR code scanned and saved.");
      setGoat(normalizedGoat);
      setShowScanner(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save scanned QR code.");
    } finally {
      setLoading(false);
    }
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
      </label>

      {!idLoading && goat.ID.trim() && (
        <GoatIdQrBlock
          encodedValue={qrEncodedValue}
          displayLabel={goat.Name || undefined}
          qrFieldMatchesId={qrFieldMatchesId}
          onSyncQrFieldToId={() => handleChange("QR Code", goat.ID)}
        />
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Kasarian</span>
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
        <span className="mb-1 block text-sm font-medium">Name</span>
        <input value={goat.Name} onChange={(e) => handleChange("Name", e.target.value)} className="w-full rounded-xl border border-farm-200 p-3 text-base" />
      </label>

      <div className="space-y-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">QR Code</span>
          <input value={goat["QR Code"]} onChange={(e) => handleChange("QR Code", e.target.value)} className="w-full rounded-xl border border-farm-200 p-3 text-base" />
        </label>
        <button type="button" onClick={() => setShowScanner((prev) => !prev)} className="w-full rounded-xl bg-farm-600 px-4 py-3 text-base font-semibold text-white">
          {showScanner ? "Hide Scanner" : "Scan QR Code"}
        </button>
        {qrScanStatus && <p className="rounded-lg bg-white p-3 text-sm">{qrScanStatus}</p>}
        {showScanner && (
          <BarcodeScanner
            onDetected={(value) => void handleQrDetected(value)}
          />
        )}
      </div>

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
        <span className="mb-1 block text-sm font-medium">Tty bulog</span>
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
        <span className="mb-1 block text-sm font-medium">Nny doe</span>
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

      <label className="block"><span className="mb-1 block text-sm font-medium">Weight (KG)</span><input type="number" step="0.01" value={goat.Weight} onChange={(e) => handleChange("Weight", e.target.value)} className="w-full rounded-xl border border-farm-200 p-3 text-base" /></label>
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
                <option value="kapon">Kapon</option>
                {goat.Gender === "F" && <option value="gave_birth">Gave Birth</option>}
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">Date Given</span>
              <input type="date" value={entry.dateGiven} onChange={(e) => updateMedicalEntry(entry.id, "dateGiven", e.target.value)} className="w-full rounded-lg border border-farm-200 p-2 text-sm" />
            </label>
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
              <span className="mb-1 block text-xs font-medium">Notes</span>
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

      <button type="submit" disabled={loading || imageUploading || idLoading} className="w-full rounded-xl bg-farm-700 px-4 py-3 text-base font-bold text-white disabled:opacity-60">
        {loading ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
