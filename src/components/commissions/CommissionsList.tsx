import { useCommissions } from "@/hooks/useCommissions";
import { formatCurrency, formatDate, getInstallmentAlertClass, getInstallmentStatus, statusLabels } from "@/lib/financial-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

export function CommissionsList() {
  const { commissionsQuery, updateInstallmentStatus } = useCommissions();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  if (commissionsQuery.isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando comissões...</div>;
  }

  const commissions = commissionsQuery.data || [];

  if (commissions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma comissão cadastrada. Clique em "Nova Comissão" para começar.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Comissões Cadastradas</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Fábrica</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead className="text-right">Valor Venda</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commissions.map((c) => {
              const isOpen = expanded.has(c.id);
              const installments = (c as any).commission_installments || [];
              return (
                <>
                  <TableRow key={c.id} className="cursor-pointer hover:bg-accent/50" onClick={() => toggleExpand(c.id)}>
                    <TableCell>{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                    <TableCell className="font-medium">{c.factory}</TableCell>
                    <TableCell>{c.client}</TableCell>
                    <TableCell>{c.order_number}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c.sale_value)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(c.commission_total)}</TableCell>
                    <TableCell>{formatDate(c.sale_date)}</TableCell>
                  </TableRow>
                  {isOpen && installments.length > 0 && (
                    <TableRow key={`${c.id}-inst`}>
                      <TableCell colSpan={7} className="bg-muted/30 p-4">
                        <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Parcelas</div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {installments
                            .sort((a: any, b: any) => a.installment_number - b.installment_number)
                            .map((inst: any) => {
                              const realStatus = getInstallmentStatus(inst.due_date, inst.status);
                              const alertClass = getInstallmentAlertClass(inst.due_date, inst.status);
                              return (
                                <div key={inst.id} className={`rounded-lg border p-3 ${alertClass}`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium">Parcela {inst.installment_number}</span>
                                    <Badge variant="outline" className="text-[10px]">
                                      {statusLabels[realStatus] || realStatus}
                                    </Badge>
                                  </div>
                                  <div className="text-sm font-bold">{formatCurrency(inst.value)}</div>
                                  <div className="text-xs opacity-75">Venc.: {formatDate(inst.due_date)}</div>
                                  {inst.status !== "recebido" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="mt-2 h-7 text-xs w-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateInstallmentStatus.mutate({
                                          id: inst.id,
                                          status: "recebido",
                                          paid_date: new Date().toISOString().split("T")[0],
                                        });
                                      }}
                                    >
                                      <CheckCircle2 className="mr-1 h-3 w-3" />
                                      Marcar Recebido
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
