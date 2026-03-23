import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/financial-utils";
import { Factory } from "@/hooks/useFactories";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileSpreadsheet } from "lucide-react";

interface MonthlyClosingByFactoryProps {
  factories: Factory[];
  commissions: any[];
  orders: any[];
}

type FactoryStatus = "aguardando_planilha" | "planilha_recebida" | "nf_emitida" | "pago";

const statusConfig: Record<FactoryStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  aguardando_planilha: { label: "Aguardando planilha", variant: "outline" },
  planilha_recebida: { label: "Planilha recebida", variant: "secondary" },
  nf_emitida: { label: "NF Emitida", variant: "default" },
  pago: { label: "Pago", variant: "default" },
};

export function MonthlyClosingByFactory({ factories, commissions, orders }: MonthlyClosingByFactoryProps) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthLabel = format(now, "MMMM yyyy", { locale: ptBR });

  const rows = useMemo(() => {
    return factories.map((factory) => {
      // Get all commission installments for this factory in current month
      const factoryCommissions = commissions.filter(
        (c: any) => c.status !== "deleted" && c.status !== "cancelada" && c.factory?.toLowerCase() === factory.nome.toLowerCase()
      );

      const allInstallments = factoryCommissions.flatMap((c: any) =>
        (c.commission_installments || []).map((i: any) => ({ ...i, commissionFactory: c.factory }))
      );

      const monthInstallments = allInstallments.filter((i: any) => {
        const due = new Date(i.due_date);
        return due >= monthStart && due <= monthEnd;
      });

      const totalMonth = monthInstallments.reduce((s: number, i: any) => s + Number(i.value), 0);
      const received = monthInstallments.filter((i: any) => i.status === "recebido").reduce((s: number, i: any) => s + Number(i.value), 0);
      const toReceive = monthInstallments.filter((i: any) => i.status !== "recebido" && i.status !== "cancelado").reduce((s: number, i: any) => s + Number(i.value), 0);

      // Determine status
      const hasAReceberInstallments = monthInstallments.some((i: any) => i.status === "a_receber");
      const allReceived = monthInstallments.length > 0 && monthInstallments.every((i: any) => i.status === "recebido" || i.status === "cancelado");

      let status: FactoryStatus = "aguardando_planilha";
      if (allReceived && monthInstallments.length > 0) {
        status = "pago";
      } else if (hasAReceberInstallments) {
        status = "planilha_recebida";
      }

      // Previsão de recebimento
      const diaRecebimento = (factory as any).dia_recebimento;
      let previsaoRecebimento: string | null = null;
      if (diaRecebimento) {
        const day = Math.min(diaRecebimento, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
        const previsaoDate = new Date(now.getFullYear(), now.getMonth(), day);
        previsaoRecebimento = format(previsaoDate, "dd/MM/yyyy");
      }

      return {
        factory,
        totalMonth,
        received,
        toReceive,
        status,
        previsaoRecebimento,
      };
    });
  }, [factories, commissions, monthStart, monthEnd, now]);

  if (factories.length === 0) return null;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Fechamento Mensal por Fábrica — {monthLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Fábrica</TableHead>
                <TableHead className="text-xs text-right">Total do Mês</TableHead>
                <TableHead className="text-xs">Previsão Receb.</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Recebido</TableHead>
                <TableHead className="text-xs text-right">A Receber</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const cfg = statusConfig[row.status];
                return (
                  <TableRow key={row.factory.id}>
                    <TableCell className="text-xs font-medium py-2">{row.factory.nome}</TableCell>
                    <TableCell className="text-xs text-right py-2 font-semibold">{row.totalMonth > 0 ? formatCurrency(row.totalMonth) : "—"}</TableCell>
                    <TableCell className="text-xs py-2">{row.previsaoRecebimento || "—"}</TableCell>
                    <TableCell className="py-2">
                      <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right py-2 text-green-600 font-semibold">{row.received > 0 ? formatCurrency(row.received) : "—"}</TableCell>
                    <TableCell className="text-xs text-right py-2 text-blue-600 font-semibold">{row.toReceive > 0 ? formatCurrency(row.toReceive) : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
