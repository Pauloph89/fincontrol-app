import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

const titles: Record<string, string> = {
  "/conciliacao": "Conciliação Financeira",
  "/fluxo-caixa": "Fluxo de Caixa",
  "/relatorios": "Relatórios",
  "/configuracoes": "Configurações",
};

export default function Placeholder() {
  const { pathname } = useLocation();
  const title = titles[pathname] || "Página";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Construction className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Em desenvolvimento</h2>
          <p className="text-muted-foreground text-sm max-w-md">
            Este módulo será implementado nas próximas iterações. A estrutura já está preparada no banco de dados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
