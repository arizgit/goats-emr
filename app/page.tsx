"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import GoatCard from "@/components/GoatCard";
import { Goat } from "@/lib/types";

export default function DashboardPage() {
  const [goats, setGoats] = useState<Goat[]>([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<"all" | "M" | "F">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGoats = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/goats");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load goats.");
        setGoats(data.goats || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load goats.");
      } finally {
        setLoading(false);
      }
    };

    void fetchGoats();
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return goats.filter((g) => {
      const matchesSearch = [g.ID, g.Name, g.Barcode].some((v) => v.toLowerCase().includes(query));
      const matchesGender = genderFilter === "all" || g.Gender === genderFilter;
      return matchesSearch && matchesGender;
    });
  }, [goats, search, genderFilter]);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-farm-700">Goat Records</h2>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID, name, barcode" className="w-full rounded-xl border border-farm-200 p-3" />
      <div className="grid grid-cols-1 gap-2">
        <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value as "all" | "M" | "F")} className="rounded-xl border border-farm-200 p-3">
          <option value="all">Lahat ng Kasarian</option><option value="M">Lalake</option><option value="F">Babae</option>
        </select>
      </div>
      {loading && <p className="rounded-xl bg-white p-4">Loading goats...</p>}
      {error && <p className="rounded-xl bg-red-100 p-4 text-red-700">{error}</p>}
      <div className="space-y-3">{filtered.map((goat) => <GoatCard key={goat.ID + goat.Barcode} goat={goat} />)}</div>
      {!loading && filtered.length === 0 && <p className="rounded-xl bg-white p-4">No goats found.</p>}
      <Link href="/goats/new" className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-farm-600 text-3xl font-bold text-white shadow-lg" aria-label="Add goat">+</Link>
    </section>
  );
}
