"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import GoatForm from "@/components/GoatForm";
import GoatIdQrBlock from "@/components/GoatIdQrBlock";
import GoatImage from "@/components/GoatImage";
import { labelForMedProduct, parseMedicalHistory } from "@/lib/medicalHistory";
import { Goat } from "@/lib/types";

type WeightHistoryEntry = {
  "Goat ID": string;
  "Recorded At": string;
  "Weight KG": string;
};

function formatDateTime(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export default function GoatDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const [goat, setGoat] = useState<Goat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [weightHistory, setWeightHistory] = useState<WeightHistoryEntry[]>([]);

  useEffect(() => {
    const fetchGoat = async () => {
      try {
        const res = await fetch(`/api/goats/${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Goat not found.");
        setGoat(data.goat);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch goat.");
      } finally {
        setLoading(false);
      }
    };

    void fetchGoat();
  }, [id]);

  useEffect(() => {
    const fetchWeightHistory = async () => {
      try {
        const res = await fetch(`/api/goats/${encodeURIComponent(id)}/weight-history`);
        const data = (await res.json()) as { history?: WeightHistoryEntry[] };
        if (!res.ok) return;
        setWeightHistory(data.history || []);
      } catch {
        setWeightHistory([]);
      }
    };

    void fetchWeightHistory();
  }, [id]);

  if (loading) return <p>Loading goat details...</p>;
  if (error) return <p className="rounded-xl bg-red-100 p-4 text-red-700">{error}</p>;
  if (!goat) return <p>Goat not found.</p>;

  const labelMap: Record<string, string> = {
    Name: "Pangalan / Name",
    Gender: "Kasarian / Gender",
    "Date Disposed": "Date Disposed",
    Weight: "Bigat / Weight (KG)",
    "Parent Buck": "Tty bulog / Parent buck",
    "Parent Doe": "Nny doe / Parent doe",
    "Created At": "Created At",
    "Updated At": "Last Modified"
  };
  const medicalHistory = parseMedicalHistory(goat["Medical History"]);
  const qrEncoded = goat["QR Code"]?.trim() || goat.ID.trim();
  const eventTypeLabelMap: Record<string, string> = {
    vaccine: "Vaccine",
    deworm: "Deworm",
    gave_birth: "Gave Birth",
    other: "Other (medications & treatments)"
  };
  const frequencyLabelMap: Record<string, string> = {
    quarterly: "Quarterly",
    semi_annual: "Semi-annual",
    annual: "Annual",
    none: "One-time / none"
  };
  const renderValue = (key: string, value: string) => {
    if ((key === "Parent Buck" || key === "Parent Doe") && value) {
      return (
        <Link href={`/goats/${encodeURIComponent(value)}`} className="text-farm-700 underline">
          {value}
        </Link>
      );
    }

    if (key === "Image" && value) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-farm-700 underline"
        >
          Open image
        </a>
      );
    }

    if (key === "Weight" && value) return `${value} KG`;
    if (key === "Gender") return value === "M" ? "Lalake" : value === "F" ? "Babae" : "-";
    if (key === "Created At" || key === "Updated At") return formatDateTime(value);
    return value || "-";
  };

  return (
    <section className="space-y-4">
      <button onClick={() => setEditMode((prev) => !prev)} className="w-full rounded-xl bg-farm-600 px-4 py-3 text-white">{editMode ? "Cancel Edit" : "Edit"}</button>
      {goat.Image && (
        <div className="flex justify-center">
          <GoatImage
            src={goat.Image}
            alt={goat.ID}
            width={512}
            height={512}
            className="aspect-square w-full max-w-[min(100%,20rem)] rounded-2xl object-cover shadow-sm"
          />
        </div>
      )}
      {editMode ? (
        <GoatForm mode="edit" initialValue={goat} />
      ) : (
        <>
          {qrEncoded ? (
            <GoatIdQrBlock encodedValue={qrEncoded} displayLabel={goat.Name || undefined} />
          ) : null}
          <div className="space-y-2 rounded-2xl bg-white p-4">
            {Object.entries(goat)
              .filter(([key]) => key !== "Farm ID" && key !== "Medical History" && key !== "QR Code")
              .map(([key, value]) => (
                <p key={key} className="text-sm">
                  <span className="font-semibold">{labelMap[key] || key}:</span>{" "}
                  {renderValue(key, value)}
                </p>
              ))}
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold">Medical History:</p>
              {medicalHistory.length === 0 ? (
                <p className="text-sm">-</p>
              ) : (
                medicalHistory.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-farm-100 p-3 text-sm">
                    <p><span className="font-semibold">Type:</span> {eventTypeLabelMap[entry.eventType] || "Other"}</p>
                    {entry.productCode ? (
                      <p>
                        <span className="font-semibold">Treatment / vaccine:</span> {labelForMedProduct(entry.productCode)}
                      </p>
                    ) : null}
                    {entry.eventType === "gave_birth" ? (
                      <>
                        <p><span className="font-semibold">Birthing date:</span> {entry.dateGiven || "-"}</p>
                        <p><span className="font-semibold">Number bucklings:</span> {entry.bucklingCount !== "" ? entry.bucklingCount : "-"}</p>
                        <p><span className="font-semibold">Number doelings:</span> {entry.doelingCount !== "" ? entry.doelingCount : "-"}</p>
                      </>
                    ) : (
                      <p><span className="font-semibold">Date given:</span> {entry.dateGiven || "-"}</p>
                    )}
                    <p><span className="font-semibold">Frequency:</span> {frequencyLabelMap[entry.frequency] || "One-time / none"}</p>
                    <p><span className="font-semibold">Next due:</span> {entry.nextDueDate || "-"}</p>
                    <p><span className="font-semibold">Notes / comments / advice:</span> {entry.notes || "-"}</p>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold">Weight History:</p>
              {weightHistory.length === 0 ? (
                <p className="text-sm">-</p>
              ) : (
                weightHistory.map((entry) => (
                  <div
                    key={`${entry["Goat ID"]}-${entry["Recorded At"]}-${entry["Weight KG"]}`}
                    className="rounded-xl border border-farm-100 p-3 text-sm"
                  >
                    <p><span className="font-semibold">Weight:</span> {entry["Weight KG"] ? `${entry["Weight KG"]} KG` : "-"}</p>
                    <p><span className="font-semibold">Recorded At:</span> {formatDateTime(entry["Recorded At"])}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
