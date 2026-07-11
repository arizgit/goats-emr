"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import BarcodeScanner from "@/components/BarcodeScanner";

export default function ScanPage() {
  const [status, setStatus] = useState("Align QR code in camera view.");
  const [notFoundValue, setNotFoundValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const inFlightLookupRef = useRef<string | null>(null);
  const router = useRouter();

  const onDetected = async (value: string) => {
    const normalized = value.trim();
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
      setStatus(`No goat found for QR code: ${normalized}`);
    } catch {
      setStatus("Lookup failed. Please check connection and try scanning again.");
    } finally {
      setIsSearching(false);
      inFlightLookupRef.current = null;
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-farm-700">Scan Goat QR Tag</h2>
      <p className="text-sm text-slate-600">
        Scan a physical tag to open the goat currently assigned to that QR code.
      </p>
      <BarcodeScanner onDetected={onDetected} />
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
