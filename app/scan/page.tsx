"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import BarcodeScanner from "@/components/BarcodeScanner";

export default function ScanPage() {
  const [status, setStatus] = useState("Align barcode/QR in camera view.");
  const [notFoundValue, setNotFoundValue] = useState("");
  const router = useRouter();

  const onDetected = async (value: string) => {
    setStatus(`Scanned: ${value}`);
    const res = await fetch(`/api/goats/scan/${encodeURIComponent(value)}`);
    const data = await res.json();

    if (res.ok && data.goat?.ID) {
      router.push(`/goats/${encodeURIComponent(data.goat.ID)}`);
      return;
    }

    setNotFoundValue(value);
    setStatus("Goat not found.");
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-farm-700">Scan Goat Ear Tag</h2>
      <BarcodeScanner onDetected={onDetected} />
      <p className="rounded-xl bg-white p-3 text-sm">{status}</p>
      {notFoundValue && <button onClick={() => router.push(`/goats/new?barcode=${encodeURIComponent(notFoundValue)}`)} className="w-full rounded-xl bg-farm-700 px-4 py-3 font-semibold text-white">Create New Goat with this barcode</button>}
    </section>
  );
}
