export default function AccessDeniedPage() {
  return (
    <div className="mx-auto mt-20 max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
      <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
      <p className="mt-2 text-sm text-slate-700">You are not authorized to use GoatsEMR.</p>
    </div>
  );
}
