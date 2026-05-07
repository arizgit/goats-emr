import GoatForm from "@/components/GoatForm";

export default function NewGoatPage({
  searchParams
}: {
  searchParams?: { qrCode?: string };
}) {
  const qrCode = searchParams?.qrCode || "";
  return <GoatForm mode="create" prefilledQrCode={qrCode} />;
}
