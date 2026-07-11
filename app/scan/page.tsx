"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import BarcodeScanner from "@/components/BarcodeScanner";
import { normalizeQrCode } from "@/lib/qrCode";

export default function ScanPage() {
  const [status, setStatus] = useState("Align the QR code inside the square.");
  const [notFoundValue, setNotFoundValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [manualTagId, setManualTagId] = useState("");
  const inFlightLookupRef = useRef<string | null>(null);
  const router = useRouter();

  const onDetected = useCallback(async (value: string) => {
    const normalized = normalizeQrCode(value);
    if (!normalized) return;
    if (inFlightLookupRef.current === normalized) return;

    setIsSearching(true);
    setNotFoundValue("");
    setStatus(`Searching goat for: ${normalized}`);
    inFlightLookupRef.current = normalized;

    try {
      const res = await fetch(`/api/goats/scan/${encodeURIComponent(normalized)}`);
      const data = await res.json();

      if (res.ok && data.goat?.ID) {
        setStatus(`Found goat ${data.goat.ID}. Opening record...`);
        router.push(`/goats/${encodeURIComponent(data.goat.ID)}`);
        return;
      }

      setNotFoundValue(normalized);
      setStatus(`No goat found for tag: ${normalized}`);
    } catch {
      setStatus("Lookup failed. Please check connection and try scanning again.");
    } finally {
      setIsSearching(false);
      inFlightLookupRef.current = null;
    }
  }, [router]);

  const submitManualTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = normalizeQrCode(manualTagId);
    if (!value) {
      setStatus("Enter the tag ID printed under the QR (e.g. 001).");
      return;
    }
    await onDetected(value);
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-farm-700">Scan Goat Tag</h2>
      <p className="text-sm text-slate-600">
        Point the camera at the QR, or type the tag ID printed under it if the camera cannot read the code.
      </p>
      <BarcodeScanner onDetected={onDetected} />

      <form onSubmit={(e) => void submitManualTag(e)} className="space-y-2 rounded-xl border border-farm-200 bg-white p-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-farm-800">Tag ID (printed under QR)</span>
          <input
            value={manualTagId}
            onChange={(e) => setManualTagId(e.target.value)}
            placeholder="e.g. 001"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-xl border border-farm-200 p-3 font-mono text-base uppercase"
          />
        </label>
        <button
          type="submit"
          disabled={isSearching || !manualTagId.trim()}
          className="w-full rounded-xl bg-farm-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          Look up tag ID
        </button>
      </form>

      <p className="rounded-xl bg-white p-3 text-sm">{isSearching ? "Searching..." : status}</p>
      {notFoundValue && (
        <button
          type="button"
          onClick={() => router.push("/goats/new")}
          className="w-full rounded-xl bg-farm-700 px-4 py-3 font-semibold text-white"
        >
          Create new goat
        </button>
      )}
    </section>
  );
}
