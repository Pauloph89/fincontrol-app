import { useExpenses } from "@/hooks/useExpenses";
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
import { CheckCircle2, Paperclip, Search, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { useState, useMemo, useRef } from "react";

export function ExpensesList() {
  const { expensesQuery, markExpensePaid, deleteExpense, uploadReceipt } = useExpenses();
  const [search, setSearch] = useState("");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const allExpenses = expensesQuery.data || [];

  const expenses = useMemo(() => {
    return allExpenses.filter((e) => {
      if (filterAccount !== "all" && e.account !== filterAccount) return false;
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      if (search) {
        const s = search.toLowerCase();
        return e.description.toLowerCase().includes(s) || e.category.toLowerCase().includes(s);
      }
      return true;
    });
  }, [allExpenses, search, filterAccount, filterStatus]);

  if (expensesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando despesas...
      </div>
    );
  }

  if (allExpenses.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <div className="text-4xl mb-3">💰</div>
          <h3 className="font-semibold text-lg mb-1">Nenhuma despesa cadastrada</h3>
          <p className="text-muted-foreground text-sm">Clique em "Nova Despesa" para começar a controlar seus gastos.</p>
        </CardContent>
      </Card>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingId) {
      await uploadReceipt.mutateAsync({ expenseId: uploadingId, file });
      setUploadingId(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg">Despesas</CardTitle>
          <div className="flex items-center gap-2">
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
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="a_vencer">A vencer</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
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
              <TableHead>Tipo</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((exp) => {
              const alertClass = getExpenseAlertClass(exp.due_date, exp.status);
              const hasRecurrence = !!(exp as any).recurrence;
              const hasSeries = !!(exp as any).parent_expense_id;
              return (
                <TableRow key={exp.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      {exp.description}
                      {(hasRecurrence || hasSeries) && (
                        <Tooltip>
                          <TooltipTrigger>
                            <RefreshCw className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Despesa recorrente ({recurrenceLabels[(exp as any).recurrence] || "série"})
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{exp.category}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {exp.type === "fixa" ? "Fixa" : "Variável"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs uppercase">{exp.account}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(exp.value)}</TableCell>
                  <TableCell>{formatDate(exp.due_date)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${alertClass}`}>
                      {statusLabels[exp.status] || exp.status}
                    </span>
                  </TableCell>
                  <TableCell>
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
                      {exp.receipt_url && (
                        <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-info underline ml-1">Ver</a>
                      )}

                      {hasSeries ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir despesa recorrente</AlertDialogTitle>
                              <AlertDialogDescription>
                                O que deseja excluir?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteExpense.mutate({ id: exp.id })}>
                                Somente esta
                              </AlertDialogAction>
                              <AlertDialogAction
                                onClick={() => deleteExpense.mutate({ id: (exp as any).parent_expense_id || exp.id, deleteSeries: true })}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Toda a série
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir "{exp.description}"?
                                {(exp as any).recurrence && " Todas as despesas recorrentes vinculadas também serão excluídas."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteExpense.mutate({ id: exp.id, deleteSeries: !!(exp as any).recurrence })}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {expenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhuma despesa encontrada com os filtros aplicados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
