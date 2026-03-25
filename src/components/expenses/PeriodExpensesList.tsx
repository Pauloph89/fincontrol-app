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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle2, Paperclip, Search, Trash2, RefreshCw, Loader2, Ghost, ExternalLink, Replace } from "lucide-react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function parseMonthValue(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return new Date(year, month - 1, 1);
}

function parseIsoDateLocal(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) return new Date(dateValue);
  return new Date(year, month - 1, day);
}

/** Compute effective display status for an expense */
function computeDisplayStatus(status: string, dueDate: string, paymentDate: string | null): string {
  if (status === "pago" || paymentDate) return "pago";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseIsoDateLocal(dueDate);
  if (due < today) return "atrasado";
  return status; // a_vencer
}

const ITEMS_PER_PAGE = 20;

export function PeriodExpensesList() {
  const { expensesQuery, markExpensePaid, deleteExpense, uploadReceipt } = useExpenses();
  const { projections } = useExpenseProjection();
  const { user, companyId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const monthStart = startOfMonth(parseMonthValue(selectedMonth));
  const monthEnd = endOfMonth(monthStart);

  // Real expenses for the period
  const realExpenses = useMemo(() => {
    return (expensesQuery.data || []).filter((e) => {
      const dueDate = parseIsoDateLocal(e.due_date);
      return dueDate >= monthStart && dueDate <= monthEnd;
    });
  }, [expensesQuery.data, monthStart, monthEnd]);

  // Virtual projections: exclude if a real expense with same description exists in this month
  const virtualExpenses = useMemo(() => {
    // Build a set of keys: rule_id+date AND normalized description+month
    const realRuleKeys = new Set<string>();
    const realDescKeys = new Set<string>();
    realExpenses.forEach((e) => {
      if ((e as any).generated_from_rule_id) {
        realRuleKeys.add(`${(e as any).generated_from_rule_id}_${e.due_date}`);
      }
      // Normalize: lowercase description + YYYY-MM
      const monthKey = e.due_date.substring(0, 7);
      realDescKeys.add(`${e.description.trim().toLowerCase()}_${monthKey}`);
    });

    return projections.filter((p) => {
      const dueDate = parseIsoDateLocal(p.due_date);
      if (dueDate < monthStart || dueDate > monthEnd) return false;
      // Skip if real expense exists for same rule+date
      if (realRuleKeys.has(`${p.rule_id}_${p.due_date}`)) return false;
      // Skip if real expense with same description exists in same month
      const monthKey = p.due_date.substring(0, 7);
      if (realDescKeys.has(`${p.name.trim().toLowerCase()}_${monthKey}`)) return false;
      return true;
    });
  }, [projections, monthStart, monthEnd, realExpenses]);

  // Materialize a projected expense into a real one and mark as paid
  const materializeAndPay = async (exp: { description: string; category: string; value: number; account: string; due_date: string; rule_id?: string }) => {
    if (!user || !companyId) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        company_id: companyId,
        type: "fixa",
        category: exp.category,
        description: exp.description,
        value: exp.value,
        account: exp.account,
        due_date: exp.due_date,
        payment_date: today,
        status: "pago",
        generated_from_rule_id: exp.rule_id || null,
      } as any);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Despesa marcada como paga!" });
    } catch (err: any) {
      toast({ title: "Erro ao confirmar pagamento", description: err.message, variant: "destructive" });
    }
  };

  // Combine and filter
  const combined = useMemo(() => {
    const items = [
      ...realExpenses.map((e) => {
        const displayStatus = computeDisplayStatus(e.status, e.due_date, e.payment_date);
        return { ...e, displayStatus, is_virtual: false as const };
      }),
      ...virtualExpenses.map((v) => ({
        id: v.id,
        description: v.name,
        category: v.category,
        type: "fixa" as const,
        account: v.account,
        value: v.value,
        due_date: v.due_date,
        status: "projetado",
        displayStatus: "projetado",
        payment_date: null,
        receipt_url: null,
        recurrence: v.recurrence_type,
        is_virtual: true as const,
        rule_id: v.rule_id,
      })),
    ];

    return items.filter((e) => {
      if (filterAccount !== "all" && e.account !== filterAccount) return false;
      if (filterType !== "all" && e.type !== filterType) return false;
      if (search) {
        const s = search.toLowerCase();
        return e.description.toLowerCase().includes(s) || e.category.toLowerCase().includes(s);
      }
      return true;
    }).sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [realExpenses, virtualExpenses, search, filterAccount, filterType]);

  const totalPages = Math.max(1, Math.ceil(combined.length / ITEMS_PER_PAGE));
  const paginatedItems = combined.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Reset page on filter change
  useMemo(() => { setPage(1); }, [search, filterAccount, filterType, selectedMonth]);

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

  const totalFixa = realExpenses.filter((e) => e.type === "fixa").reduce((s, e) => s + Number(e.value), 0);
  const totalVariavel = realExpenses.filter((e) => e.type === "variavel" || e.type === "variável").reduce((s, e) => s + Number(e.value), 0);
  const totalVirtual = virtualExpenses.reduce((s, e) => s + e.value, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-medium">Custos Fixos</p>
            <p className="text-lg font-bold">{formatCurrency(totalFixa)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-medium">Custos Variáveis</p>
            <p className="text-lg font-bold">{formatCurrency(totalVariavel)}</p>
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
            <p className="text-lg font-bold">{formatCurrency(totalFixa + totalVariavel + totalVirtual)}</p>
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
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="fixa">Fixa</SelectItem>
                  <SelectItem value="variavel">Variável</SelectItem>
                </SelectContent>
              </Select>
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
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((exp) => {
                const alertClass = exp.is_virtual
                  ? "status-previsto"
                  : exp.displayStatus === "atrasado"
                    ? "status-vencido"
                    : getExpenseAlertClass(exp.due_date, exp.status);
                const statusLabel = exp.displayStatus === "atrasado"
                  ? "Atrasado"
                  : exp.displayStatus === "projetado"
                    ? "Projetado"
                    : (statusLabels[exp.status] || exp.status);

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
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {exp.type === "fixa" ? "Fixa" : "Variável"}
                      </Badge>
                    </TableCell>
                    <TableCell>{exp.category}</TableCell>
                    <TableCell className="text-xs uppercase">{exp.account}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(Number(exp.value))}</TableCell>
                    <TableCell>{formatDate(exp.due_date)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${alertClass}`}>
                        {statusLabel}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        {/* Pay button for virtual (projected) expenses */}
                        {exp.is_virtual && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => materializeAndPay(exp as any)}>
                                <CheckCircle2 className="h-4 w-4 text-success" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Confirmar pagamento</TooltipContent>
                          </Tooltip>
                        )}
                        {/* Pay button for real non-paid expenses */}
                        {!exp.is_virtual && exp.displayStatus !== "pago" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => markExpensePaid.mutate(exp.id)}>
                                <CheckCircle2 className="h-4 w-4 text-success" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Marcar como pago</TooltipContent>
                          </Tooltip>
                        )}
                        {/* Attachment and delete for ALL real expenses */}
                        {!exp.is_virtual && (
                          <>
                            {exp.receipt_url ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Paperclip className="h-4 w-4 text-primary" />
                                      </TooltipTrigger>
                                      <TooltipContent>Ver comprovante</TooltipContent>
                                    </Tooltip>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => window.open(exp.receipt_url!, "_blank")}>
                                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                                    Ver comprovante
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setUploadingId(exp.id); fileInputRef.current?.click(); }}>
                                    <Replace className="h-3.5 w-3.5 mr-2" />
                                    Substituir comprovante
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setUploadingId(exp.id); fileInputRef.current?.click(); }}>
                                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Anexar comprovante</TooltipContent>
                              </Tooltip>
                            )}
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
                          </>
                        )}
                      </div>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">Exibindo {((page - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(page * ITEMS_PER_PAGE, combined.length)} de {combined.length} registros</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                <span className="flex items-center px-3 text-xs">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
