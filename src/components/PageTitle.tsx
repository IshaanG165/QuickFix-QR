export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle ? <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p> : null}
    </div>
  );
}
