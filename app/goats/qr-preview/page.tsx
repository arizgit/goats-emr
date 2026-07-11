"use client";

import QRCode from "react-qr-code";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function QrPreviewBody() {
  const searchParams = useSearchParams();
  const value = searchParams.get("value")?.trim() ?? "";
  const label = searchParams.get("label")?.trim() ?? "";
  const autoPrint = searchParams.get("print") === "1";

  useEffect(() => {
    document.body.classList.add("qr-print-page");
    return () => document.body.classList.remove("qr-print-page");
  }, []);

  useEffect(() => {
    if (!autoPrint || !value) return;
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, [autoPrint, value]);

  if (!value) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
        <p className="text-farm-800">Missing QR value. Open this page from the goat form.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 p-6 print:min-h-0 print:gap-4 print:p-8">
      <div className="rounded-2xl border border-farm-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
        <QRCode value={value} size={320} level="M" className="print:h-auto print:w-full print:max-w-md" />
      </div>
      {autoPrint && label ? (
        <h1 className="text-center text-2xl font-bold text-farm-800 print:text-xl">{label}</h1>
      ) : null}
      <p className="font-mono text-sm text-slate-700">{value}</p>
      <p className="hidden print:block print:text-center print:text-xs print:text-slate-500">
        Scan this code in GoatsEMR to open the goat record.
      </p>
    </div>
  );
}

export default function QrPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8 text-farm-700">Loading preview…</div>
      }
    >
      <QrPreviewBody />
    </Suspense>
  );
}
