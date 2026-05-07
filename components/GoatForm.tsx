"use client";

import { useMemo, useState } from "react";
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
  Description: "",
  Barcode: "",
  "QR Code": "",
  Image: "",
  "Parent Buck": "",
  "Parent Doe": "",
  State: "",
  Deceased: "N",
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
        <input value={goat.ID} onChange={(e) => handleChange("ID", e.target.value)} placeholder="Kambing ID" className="w-full rounded-xl border border-farm-200 p-3 text-base" />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Gender</span>
        <select value={goat.Gender} onChange={(e) => handleChange("Gender", e.target.value as Goat["Gender"])} className="w-full rounded-xl border border-farm-200 p-3 text-base">
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Birthdate</span>
        <input type="date" value={goat.Birthdate} onChange={(e) => handleChange("Birthdate", e.target.value)} className="w-full rounded-xl border border-farm-200 p-3 text-base" />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Description</span>
        <input value={goat.Description} onChange={(e) => handleChange("Description", e.target.value)} className="w-full rounded-xl border border-farm-200 p-3 text-base" />
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

      <label className="block"><span className="mb-1 block text-sm font-medium">Parent Buck</span><input value={goat["Parent Buck"]} onChange={(e) => handleChange("Parent Buck", e.target.value)} className="w-full rounded-xl border border-farm-200 p-3 text-base" /></label>
      <label className="block"><span className="mb-1 block text-sm font-medium">Parent Doe</span><input value={goat["Parent Doe"]} onChange={(e) => handleChange("Parent Doe", e.target.value)} className="w-full rounded-xl border border-farm-200 p-3 text-base" /></label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">State</span>
        <select value={goat.State} onChange={(e) => handleChange("State", e.target.value as Goat["State"])} className="w-full rounded-xl border border-farm-200 p-3 text-base">
          <option value="">Select state</option>
          <option value="Healthy">Healthy</option>
          <option value="Sick">Sick</option>
          <option value="Pregnant">Pregnant</option>
          <option value="For Sale">For Sale</option>
          <option value="Quarantine">Quarantine</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Deceased</span>
        <select value={goat.Deceased} onChange={(e) => handleChange("Deceased", e.target.value as Goat["Deceased"])} className="w-full rounded-xl border border-farm-200 p-3 text-base">
          <option value="N">N</option>
          <option value="Y">Y</option>
        </select>
      </label>

      <label className="block"><span className="mb-1 block text-sm font-medium">Weight</span><input type="number" step="0.01" value={goat.Weight} onChange={(e) => handleChange("Weight", e.target.value)} className="w-full rounded-xl border border-farm-200 p-3 text-base" /></label>
      <label className="block"><span className="mb-1 block text-sm font-medium">Remarks</span><textarea value={goat.Remarks} onChange={(e) => handleChange("Remarks", e.target.value)} className="w-full rounded-xl border border-farm-200 p-3 text-base" rows={4} /></label>

      {error && <p className="rounded-xl bg-red-100 p-3 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-xl bg-farm-100 p-3 text-sm text-farm-700">{success}</p>}

      <button type="submit" disabled={loading || imageUploading} className="w-full rounded-xl bg-farm-700 px-4 py-3 text-base font-bold text-white disabled:opacity-60">
        {loading ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
