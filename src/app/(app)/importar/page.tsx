import { CsvImportForm } from "../feature-forms";
export const metadata = { title: "Importar CSV · Meu Controle" };
export default function Importar(){return <div className="max-w-3xl space-y-6"><h1 className="font-display text-3xl font-semibold">Importar lançamentos</h1><section className="card space-y-4"><p className="text-muted">Confira o formato e a prévia antes de importar. Linhas repetidas são ignoradas. A importação não cria contas ou categorias automaticamente.</p><CsvImportForm/></section></div>}
