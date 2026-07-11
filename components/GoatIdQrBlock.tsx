"use client";

import QRCode from "react-qr-code";
import { useMemo, useState } from "react";

type Props = {
  encodedValue: string;
  displayLabel?: string;
};

export default function GoatIdQrBlock({ encodedValue, displayLabel }: Props) {
  const [largeOpen, setLargeOpen] = useState(false);

  const previewUrl = useMemo(() => {
    if (!encodedValue) return "";
    const params = new URLSearchParams();
    params.set("value", encodedValue);
    return `/goats/qr-preview?${params.toString()}`;
  }, [encodedValue]);

  const openPreview = (options?: { print?: boolean }) => {
    if (!encodedValue) return;
    const url = new URL(previewUrl, window.location.origin);
    if (options?.print) {
      url.searchParams.set("print", "1");
      if (displayLabel?.trim()) url.searchParams.set("label", displayLabel.trim());
    }
    window.open(url.pathname + url.search, "_blank", "noopener,noreferrer");
  };

  const handlePrint = () => openPreview({ print: true });

  if (!encodedValue) return null;

  return (
    <>
      <div className="rounded-xl border border-farm-200 bg-white p-4 shadow-sm">
        <p className="mb-1 text-sm font-medium text-farm-700">Tag QR</p>
        <p className="mb-3 text-xs text-slate-600">
          Print and attach this tag. Scanning the QR (or typing the printed tag ID) opens the assigned goat.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <div className="rounded-lg border border-farm-100 bg-farm-50 p-2">
            <QRCode value={encodedValue} size={128} level="H" />
          </div>
          <div className="flex w-full flex-col gap-2">
            <p className="font-mono text-sm text-slate-700">{encodedValue}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setLargeOpen(true)}
                className="rounded-xl bg-farm-100 px-4 py-2 text-sm font-semibold text-farm-800"
              >
                View large
              </button>
              <button
                type="button"
                onClick={() => openPreview()}
                className="rounded-xl bg-farm-100 px-4 py-2 text-sm font-semibold text-farm-800"
              >
                Open in new tab
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="rounded-xl bg-farm-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      {largeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Tag code enlarged"
        >
          <div className="relative max-h-[90vh] overflow-auto rounded-2xl bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setLargeOpen(false)}
              className="absolute right-3 top-3 rounded-lg bg-farm-100 px-3 py-1 text-sm font-semibold text-farm-800"
            >
              Close
            </button>
            <div className="mt-8 flex flex-col items-center gap-3">
              <QRCode value={encodedValue} size={280} level="H" />
              <p className="font-mono text-5xl text-slate-600">{encodedValue}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
