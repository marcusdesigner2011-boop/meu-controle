export default function Loading() {
  return <div aria-busy="true" className="space-y-4 animate-pulse"><div className="h-8 w-48 rounded bg-sand" /><div className="grid gap-4 sm:grid-cols-3"><div className="h-24 rounded-2xl bg-sand" /><div className="h-24 rounded-2xl bg-sand" /><div className="h-24 rounded-2xl bg-sand" /></div></div>;
}
