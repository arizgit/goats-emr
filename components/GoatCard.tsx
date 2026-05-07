import Link from "next/link";
import { Goat } from "@/lib/types";
import GoatImage from "@/components/GoatImage";

type Props = {
  goat: Goat;
};

export default function GoatCard({ goat }: Props) {
  const genderLabel = goat.Gender === "M" ? "Lalake" : goat.Gender === "F" ? "Babae" : "-";
  const birthdateLabel = goat.Birthdate || "-";
  const formattedName = goat.Name ? `${goat.Name.charAt(0).toUpperCase()}${goat.Name.slice(1)}` : "-";

  return (
    <Link
      href={`/goats/${encodeURIComponent(goat.ID)}`}
      className="block rounded-2xl border border-farm-100 bg-white p-3 shadow-sm transition hover:shadow"
    >
      <div className="flex items-center gap-3">
        {goat.Image ? (
          <GoatImage
            src={goat.Image}
            alt={formattedName !== "-" ? formattedName : goat.ID || "Goat"}
            width={48}
            height={48}
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-farm-50 text-xs font-semibold text-farm-700">
            No Img
          </div>
        )}

        <div className="min-w-0 flex-1 text-sm">
          <p className="truncate">
            <span className="font-semibold">ID:</span> {goat.ID || "-"} |{" "}
            <span className="font-semibold">Name:</span> {formattedName} |{" "}
            <span className="font-semibold">Kasarian:</span> {genderLabel} |{" "}
            <span className="font-semibold">Bday:</span> {birthdateLabel}
          </p>
        </div>

        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-farm-200 text-lg text-farm-700"
        >
          ›
        </span>
      </div>
    </Link>
  );
}
