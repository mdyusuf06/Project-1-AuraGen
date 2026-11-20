export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 p-6">
      <div className="text-center space-y-3 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md">
        <h2 className="text-2xl font-bold text-slate-900">404 - Page Not Found</h2>
        <p className="text-sm text-slate-500">
          The requested page could not be located on the AuraGen platform.
        </p>
        <a
          href="/"
          className="inline-block mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}
