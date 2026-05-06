import Link from "next/link";
import { Goat } from "@/lib/types";

type Props = {
  goat: Goat;
};

export default function GoatCard({ goat }: Props) {
  return (
    <Link
      href={`/goats/${encodeURIComponent(goat.ID)}`}
      className="block rounded-2xl border border-farm-100 bg-white p-4 shadow-sm transition hover:shadow"
    >
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold text-farm-700">{goat.ID || "No ID"}</p>
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            goat.Deceased === "Y" ? "bg-red-100 text-red-700" : "bg-farm-100 text-farm-700"
          }`}
        >
          {goat.Deceased === "Y" ? "Deceased" : "Alive"}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{goat.Description || "No description"}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <p><span className="font-semibold">Gender:</span> {goat.Gender || "-"}</p>
        <p><span className="font-semibold">State:</span> {goat.State || "-"}</p>
        <p><span className="font-semibold">Barcode:</span> {goat.Barcode || "-"}</p>
        <p><span className="font-semibold">Weight:</span> {goat.Weight || "-"}</p>
      </div>
    </Link>
  );
}
