import GoatForm from "@/components/GoatForm";

export default function NewGoatPage({
  searchParams
}: {
  searchParams?: { barcode?: string };
}) {
  const barcode = searchParams?.barcode || "";
  return <GoatForm mode="create" prefilledBarcode={barcode} />;
}
