import { useCommissions } from "@/hooks/useCommissions";
import { formatCurrency, formatDate, getInstallmentAlertClass, getInstallmentStatus, statusLabels } from "@/lib/financial-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ChevronDown, ChevronRight, Pencil, Search, XCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { CommissionEditDialog } from "./CommissionEditDialog";

export function CommissionsList() {
  const { commissionsQuery, updateInstallmentStatus } = useCommissions();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editCommission, setEditCommission] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterFactory, setFilterFactory] = useState("all");

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const allCommissions = commissionsQuery.data || [];
  const factories = [...new Set(allCommissions.map((c) => c.factory))].sort();

  const commissions = useMemo(() => {
    return allCommissions.filter((c) => {
      if (filterFactory !== "all" && c.factory !== filterFactory) return false;
      if (search) {
        const s = search.toLowerCase();
        return c.factory.toLowerCase().includes(s) || c.client.toLowerCase().includes(s) || c.order_number.toLowerCase().includes(s);
      }
      return true;
    });
  }, [allCommissions, search, filterFactory]);

  if (commissionsQuery.isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando comissões...</div>;
  }

  if (allCommissions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma comissão cadastrada. Clique em "Nova Comissão" para começar.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Comissões Cadastradas</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 w-48" />
              </div>
              <Select value={filterFactory} onValueChange={setFilterFactory}>
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="Fábrica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {factories.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
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
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((c) => {
                const isOpen = expanded.has(c.id);
                const installments = (c as any).commission_installments || [];
                const commStatus = (c as any).status || "ativa";
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
                      <TableCell>
                        <Badge variant={commStatus === "cancelada" ? "destructive" : "outline"} className="text-[10px]">
                          {statusLabels[commStatus] || commStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setEditCommission(c); }} title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isOpen && installments.length > 0 && (
                      <TableRow key={`${c.id}-inst`}>
                        <TableCell colSpan={9} className="bg-muted/30 p-4">
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
                                    {inst.status !== "recebido" && inst.status !== "cancelado" && (
                                      <div className="flex gap-1 mt-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-xs flex-1"
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
                                          Recebido
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 text-xs px-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateInstallmentStatus.mutate({ id: inst.id, status: "cancelado" });
                                          }}
                                        >
                                          <XCircle className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                          {c.observations && (
                            <p className="mt-3 text-xs text-muted-foreground italic">Obs: {c.observations}</p>
                          )}
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
      <CommissionEditDialog commission={editCommission} open={!!editCommission} onOpenChange={(open) => !open && setEditCommission(null)} />
    </>
  );
}
