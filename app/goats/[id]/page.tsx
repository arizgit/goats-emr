"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import GoatForm from "@/components/GoatForm";
import { Goat } from "@/lib/types";

export default function GoatDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const [goat, setGoat] = useState<Goat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);

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

  const markDeceased = async () => {
    if (!goat) return;
    if (!window.confirm("Mark this goat as deceased?")) return;

    const updated = { ...goat, Deceased: "Y" as const };
    const res = await fetch(`/api/goats/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    });

    if (res.ok) {
      setGoat(updated);
    }
  };

  if (loading) return <p>Loading goat details...</p>;
  if (error) return <p className="rounded-xl bg-red-100 p-4 text-red-700">{error}</p>;
  if (!goat) return <p>Goat not found.</p>;

  return (
    <section className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setEditMode((prev) => !prev)} className="flex-1 rounded-xl bg-farm-600 px-4 py-3 text-white">{editMode ? "Cancel Edit" : "Edit"}</button>
        <button onClick={markDeceased} className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-white">Mark as Deceased</button>
      </div>
      {goat.Image && (
        <Image
          src={goat.Image}
          alt={goat.ID}
          width={800}
          height={416}
          unoptimized
          className="h-52 w-full rounded-2xl object-cover"
        />
      )}
      {editMode ? (
        <GoatForm mode="edit" initialValue={goat} />
      ) : (
        <div className="space-y-2 rounded-2xl bg-white p-4">
          {Object.entries(goat).map(([key, value]) => (
            <p key={key} className="text-sm"><span className="font-semibold">{key}:</span> {value || "-"}</p>
          ))}
        </div>
      )}
    </section>
  );
}
