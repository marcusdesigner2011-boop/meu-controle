"use client";
export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  const development = process.env.NODE_ENV === "development";
  return (
    <div role="alert" className="card">
      <h1 className="font-display text-2xl font-semibold">Algo deu errado</h1>
      <p className="mt-2 text-muted">Não conseguimos carregar seus dados agora. Confira sua conexão e tente de novo.</p>
      {development && <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-sand p-3 text-xs" role="status">{error.message}</pre>}
      <button onClick={reset} className="btn-primary mt-4">Tentar de novo</button>
    </div>
  );
}
