import { useMemo, useState, useRef } from "react";
import { useExpenses } from "@/hooks/useExpenses";
import { useExpenseProjection } from "@/hooks/useExpenseProjection";
import { formatCurrency, formatDate, getExpenseAlertClass, statusLabels, recurrenceLabels } from "@/lib/financial-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, Paperclip, Search, Trash2, RefreshCw, Loader2, Ghost } from "lucide-react";
import { startOfMonth, endOfMonth, format } from "date-fns";

export function PeriodExpensesList() {
  const { expensesQuery, markExpensePaid, deleteExpense, uploadReceipt } = useExpenses();
  const { projections } = useExpenseProjection();
  const [search, setSearch] = useState("");
  const [filterAccount, setFilterAccount] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
  const monthEnd = endOfMonth(monthStart);

  // Real expenses for the period
  const realExpenses = useMemo(() => {
    return (expensesQuery.data || []).filter((e) => {
      const dueDate = new Date(e.due_date);
      return dueDate >= monthStart && dueDate <= monthEnd;
    });
  }, [expensesQuery.data, monthStart, monthEnd]);

  // Virtual projections for the period (only if no real expense exists for same rule+date)
  const virtualExpenses = useMemo(() => {
    const realKeys = new Set(realExpenses.map((e) => `${(e as any).generated_from_rule_id}_${e.due_date}`));
    return projections.filter((p) => {
      const d = new Date(p.due_date);
      return d >= monthStart && d <= monthEnd && !realKeys.has(`${p.rule_id}_${p.due_date}`);
    });
  }, [projections, monthStart, monthEnd, realExpenses]);

  // Combine and filter
  const combined = useMemo(() => {
    const items = [
      ...realExpenses.map((e) => ({ ...e, is_virtual: false as const })),
      ...virtualExpenses.map((v) => ({
        id: v.id,
        description: v.name,
        category: v.category,
        type: "fixa" as const,
        account: v.account,
        value: v.value,
        due_date: v.due_date,
        status: "a_vencer",
        payment_date: null,
        receipt_url: null,
        recurrence: v.recurrence_type,
        is_virtual: true as const,
      })),
    ];

    return items.filter((e) => {
      if (filterAccount !== "all" && e.account !== filterAccount) return false;
      if (search) {
        const s = search.toLowerCase();
        return e.description.toLowerCase().includes(s) || e.category.toLowerCase().includes(s);
      }
      return true;
    }).sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [realExpenses, virtualExpenses, search, filterAccount]);

  // Month options
  const monthOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [];
    const now = new Date();
    for (let i = -6; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      opts.push({
        value: format(d, "yyyy-MM"),
        label: format(d, "MMMM yyyy", { locale: undefined }).replace(/^\w/, (c) => c.toUpperCase()),
      });
    }
    return opts;
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingId) {
      await uploadReceipt.mutateAsync({ expenseId: uploadingId, file });
      setUploadingId(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (expensesQuery.isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Carregando...</div>;
  }

  const totalReal = realExpenses.reduce((s, e) => s + Number(e.value), 0);
  const totalVirtual = virtualExpenses.reduce((s, e) => s + e.value, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-medium">Despesas Reais</p>
            <p className="text-lg font-bold">{formatCurrency(totalReal)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-medium">Projeção (regras)</p>
            <p className="text-lg font-bold text-info">{formatCurrency(totalVirtual)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-medium">Total do Mês</p>
            <p className="text-lg font-bold">{formatCurrency(totalReal + totalVirtual)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg">Despesas do Período</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {monthOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 w-40" />
              </div>
              <Select value={filterAccount} onValueChange={setFilterAccount}>
                <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Conta" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileChange} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combined.map((exp) => {
                const alertClass = exp.is_virtual ? "status-previsto" : getExpenseAlertClass(exp.due_date, exp.status);
                return (
                  <TableRow key={exp.id} className={exp.is_virtual ? "opacity-70" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {exp.description}
                        {exp.is_virtual && (
                          <Tooltip>
                            <TooltipTrigger><Ghost className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                            <TooltipContent>Projeção virtual (regra recorrente)</TooltipContent>
                          </Tooltip>
                        )}
                        {!exp.is_virtual && (exp as any).recurrence && (
                          <Tooltip>
                            <TooltipTrigger><RefreshCw className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                            <TooltipContent>Recorrente ({recurrenceLabels[(exp as any).recurrence] || "série"})</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{exp.category}</TableCell>
                    <TableCell className="text-xs uppercase">{exp.account}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(Number(exp.value))}</TableCell>
                    <TableCell>{formatDate(exp.due_date)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${alertClass}`}>
                        {exp.is_virtual ? "Projetado" : (statusLabels[exp.status] || exp.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {!exp.is_virtual && (
                        <div className="flex items-center gap-0.5">
                          {exp.status !== "pago" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => markExpensePaid.mutate(exp.id)}>
                                  <CheckCircle2 className="h-4 w-4 text-success" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Marcar como pago</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setUploadingId(exp.id); fileInputRef.current?.click(); }}>
                                <Paperclip className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Anexar comprovante</TooltipContent>
                          </Tooltip>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
                                <AlertDialogDescription>Tem certeza que deseja excluir "{exp.description}"?</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteExpense.mutate({ id: exp.id })} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {combined.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma despesa neste período.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
