"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BarcodeScanner from "@/components/BarcodeScanner";
import GoatImage from "@/components/GoatImage";
import { Goat } from "@/lib/types";

type Props = {
  initialValue?: Goat;
  mode: "create" | "edit";
  prefilledBarcode?: string;
};

const emptyGoat: Goat = {
  ID: "",
  "Farm ID": "",
  Gender: "",
  Birthdate: "",
  Name: "",
  Barcode: "",
  "QR Code": "",
  Image: "",
  "Parent Buck": "",
  "Parent Doe": "",
  "Date Disposed": "",
  Weight: "",
  Remarks: ""
};

export default function GoatForm({ initialValue, mode, prefilledBarcode }: Props) {
  const router = useRouter();
  const [goat, setGoat] = useState<Goat>(
    initialValue || { ...emptyGoat, Barcode: prefilledBarcode || "" }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [idLoading, setIdLoading] = useState(mode === "create");
  const [allGoats, setAllGoats] = useState<Goat[]>([]);

  const title = useMemo(() => (mode === "create" ? "Add New Goat" : "Edit Goat"), [mode]);

  const handleChange = (key: keyof Goat, value: string) => {
    setGoat((prev) => ({ ...prev, [key]: value }));
  };

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

  const parentOptions = useMemo(
    () =>
      allGoats.filter((item) => item.ID && item.ID !== goat.ID).map((item) => ({
        value: item.ID,
        label: `${item.ID}${item.Name ? ` - ${item.Name}` : ""}`
      })),
    [allGoats, goat.ID]
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
      const endpoint = mode === "create" ? "/api/goats" : `/api/goats/${encodeURIComponent(initialValue?.ID || goat.ID)}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goat)
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed.");

      setSuccess(mode === "create" ? "Goat added successfully." : "Goat updated successfully.");
      if (mode === "create") {
        setGoat(emptyGoat);
        setIdLoading(true);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
          readOnly={mode === "create"}
          className="w-full rounded-xl border border-farm-200 p-3 text-base read-only:bg-farm-50"
        />
      </label>

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
          <span className="mb-1 block text-sm font-medium">Barcode</span>
          <input value={goat.Barcode} onChange={(e) => handleChange("Barcode", e.target.value)} className="w-full rounded-xl border border-farm-200 p-3 text-base" />
        </label>
        <button type="button" onClick={() => setShowScanner((prev) => !prev)} className="w-full rounded-xl bg-farm-600 px-4 py-3 text-base font-semibold text-white">
          {showScanner ? "Hide Scanner" : "Scan Barcode"}
        </button>
        {showScanner && (
          <BarcodeScanner
            onDetected={(value) => {
              handleChange("Barcode", value);
              setShowScanner(false);
            }}
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
          {parentOptions.map((option) => (
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
          {parentOptions.map((option) => (
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
      <label className="block"><span className="mb-1 block text-sm font-medium">Remarks</span><textarea value={goat.Remarks} onChange={(e) => handleChange("Remarks", e.target.value)} className="w-full rounded-xl border border-farm-200 p-3 text-base" rows={4} /></label>

      {error && <p className="rounded-xl bg-red-100 p-3 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-xl bg-farm-100 p-3 text-sm text-farm-700">{success}</p>}

      <button type="submit" disabled={loading || imageUploading || idLoading} className="w-full rounded-xl bg-farm-700 px-4 py-3 text-base font-bold text-white disabled:opacity-60">
        {loading ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
