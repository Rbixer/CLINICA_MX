import { Card, PageHeader } from "../components/ui";

export default function Placeholder({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <p className="text-center text-slate-500 py-12">
          Este módulo estará disponible próximamente. Puede solicitar su implementación según las necesidades de la
          clínica.
        </p>
      </Card>
    </div>
  );
}
