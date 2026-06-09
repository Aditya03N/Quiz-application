export default function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-2xl bg-rose-100 px-4 py-3 text-sm text-rose-700">
      {message}
    </div>
  );
}
