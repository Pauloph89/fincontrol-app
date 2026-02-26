import { useState, useRef } from "react";
import { useBankEntries, BankEntryFormData } from "@/hooks/useBankEntries";
import { useCommissions } from "@/hooks/useCommissions";
import { useExpenses } from "@/hooks/useExpenses";
import { formatCurrency, formatDate, statusLabels } from "@/lib/financial-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Link2, Paperclip, CheckCircle2, AlertCircle, Clock, DollarSign } from "lucide-react";

function BankEntryForm({ onClose }: { onClose: () => void }) {
  const { createBankEntry } = useBankEntries();
  const [form, setForm] = useState<BankEntryFormData>({
    date: new Date().toISOString().split("T")[0],
    description: "",
    value: 0,
    type: "entrada",
    account: "cnpj",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBankEntry.mutateAsync(form);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data *</Label>
          <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label>Tipo *</Label>
          <Select value={form.type} onValueChange={(v: any) => setForm((p) => ({ ...p, type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Descrição *</Label>
        <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Valor *</Label>
          <Input type="number" step="0.01" min="0" value={form.value || ""} onChange={(e) => setForm((p) => ({ ...p, value: parseFloat(e.target.value) || 0 }))} required />
        </div>
        <div className="space-y-2">
          <Label>Conta *</Label>
          <Select value={form.account} onValueChange={(v: any) => setForm((p) => ({ ...p, account: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cnpj">CNPJ</SelectItem>
              <SelectItem value="pessoal">Pessoal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={createBankEntry.isPending}>
        {createBankEntry.isPending ? "Salvando..." : "Registrar Entrada"}
      </Button>
    </form>
  );
}

function ReconcileDialog({ bankEntry, onClose }: { bankEntry: any; onClose: () => void }) {
  const { reconcileWithCommission, reconcileWithExpense } = useBankEntries();
  const { commissionsQuery } = useCommissions();
  const { expensesQuery } = useExpenses();
  const [tab, setTab] = useState<"comissao" | "despesa">(bankEntry.type === "entrada" ? "comissao" : "despesa");

  const pendingInstallments = (commissionsQuery.data || []).flatMap((c: any) =>
    (c.commission_installments || [])
      .filter((i: any) => i.status !== "recebido" && i.status !== "cancelado")
      .map((i: any) => ({ ...i, factory: c.factory, client: c.client }))
  );

  const pendingExpenses = (expensesQuery.data || []).filter((e) => e.status !== "pago");

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-accent p-3">
        <p className="text-sm font-medium">{bankEntry.description}</p>
        <p className="text-lg font-bold">{formatCurrency(bankEntry.value)}</p>
        <p className="text-xs text-muted-foreground">{formatDate(bankEntry.date)} — {bankEntry.account.toUpperCase()}</p>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "comissao" ? "default" : "outline"} size="sm" onClick={() => setTab("comissao")} className="flex-1">
          Comissões
        </Button>
        <Button variant={tab === "despesa" ? "default" : "outline"} size="sm" onClick={() => setTab("despesa")} className="flex-1">
          Despesas
        </Button>
      </div>

      <div className="max-h-[300px] overflow-y-auto space-y-2">
        {tab === "comissao" && pendingInstallments.map((inst: any) => (
          <div key={inst.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 cursor-pointer" onClick={async () => {
            await reconcileWithCommission.mutateAsync({ bankEntryId: bankEntry.id, installmentId: inst.id });
            onClose();
          }}>
            <div>
              <p className="text-sm font-medium">{inst.factory} - {inst.client}</p>
              <p className="text-xs text-muted-foreground">P{inst.installment_number} — Venc.: {formatDate(inst.due_date)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">{formatCurrency(inst.value)}</p>
              {Math.abs(inst.value - bankEntry.value) > 0.01 && (
                <p className="text-[10px] text-warning">Divergência: {formatCurrency(Math.abs(inst.value - bankEntry.value))}</p>
              )}
            </div>
          </div>
        ))}
        {tab === "despesa" && pendingExpenses.map((exp) => (
          <div key={exp.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 cursor-pointer" onClick={async () => {
            await reconcileWithExpense.mutateAsync({ bankEntryId: bankEntry.id, expenseId: exp.id });
            onClose();
          }}>
            <div>
              <p className="text-sm font-medium">{exp.description}</p>
              <p className="text-xs text-muted-foreground">{exp.category} — Venc.: {formatDate(exp.due_date)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">{formatCurrency(exp.value)}</p>
              {Math.abs(exp.value - bankEntry.value) > 0.01 && (
                <p className="text-[10px] text-warning">Divergência: {formatCurrency(Math.abs(exp.value - bankEntry.value))}</p>
              )}
            </div>
          </div>
        ))}
        {tab === "comissao" && pendingInstallments.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">Nenhuma parcela pendente.</p>}
        {tab === "despesa" && pendingExpenses.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">Nenhuma despesa pendente.</p>}
      </div>
    </div>
  );
}

export default function Reconciliation() {
  const { bankEntriesQuery, uploadReceipt } = useBankEntries();
  const [formOpen, setFormOpen] = useState(false);
  const [reconcileEntry, setReconcileEntry] = useState<any>(null);
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const entries = bankEntriesQuery.data || [];

  const filtered = entries.filter((e: any) => {
    if (filterAccount !== "all" && e.account !== filterAccount) return false;
    if (filterStatus === "conciliado" && !e.reconciled) return false;
    if (filterStatus === "pendente" && e.reconciled) return false;
    return true;
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingId) {
      await uploadReceipt.mutateAsync({ bankEntryId: uploadingId, file });
      setUploadingId(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conciliação Financeira</h1>
          <p className="text-muted-foreground text-sm">Compare entradas bancárias com registros do sistema</p>
        </div>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nova Entrada</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Entrada Bancária</DialogTitle></DialogHeader>
            <BankEntryForm onClose={() => setFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <div>
              <p className="text-xs text-muted-foreground">Conciliados</p>
              <p className="text-xl font-bold">{entries.filter((e: any) => e.reconciled).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground">Pendentes</p>
              <p className="text-xl font-bold">{entries.filter((e: any) => !e.reconciled).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-info" />
            <div>
              <p className="text-xs text-muted-foreground">Total Registrado</p>
              <p className="text-xl font-bold">{formatCurrency(entries.reduce((s: number, e: any) => s + (e.type === "entrada" ? Number(e.value) : -Number(e.value)), 0))}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Entradas Bancárias</CardTitle>
            <div className="flex gap-2">
              <Select value={filterAccount} onValueChange={setFilterAccount}>
                <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="conciliado">Conciliados</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
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
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma entrada bancária. Clique em "Nova Entrada" para começar.
                  </TableCell>
                </TableRow>
              ) : filtered.map((entry: any) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell className="font-medium">{entry.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {entry.type === "entrada" ? "Entrada" : "Saída"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs uppercase">{entry.account}</TableCell>
                  <TableCell className={`text-right font-semibold ${entry.type === "entrada" ? "text-success" : "text-destructive"}`}>
                    {formatCurrency(entry.value)}
                  </TableCell>
                  <TableCell>
                    {entry.reconciled ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3 w-3" /> Conciliado</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-warning"><Clock className="h-3 w-3" /> Pendente</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      {!entry.reconciled && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setReconcileEntry(entry)} title="Conciliar">
                          <Link2 className="h-4 w-4 text-info" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setUploadingId(entry.id); fileInputRef.current?.click(); }} title="Comprovante">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      {entry.receipt_url && (
                        <a href={entry.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-info underline">Ver</a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reconcile dialog */}
      <Dialog open={!!reconcileEntry} onOpenChange={(open) => !open && setReconcileEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Conciliar Entrada</DialogTitle></DialogHeader>
          {reconcileEntry && <ReconcileDialog bankEntry={reconcileEntry} onClose={() => setReconcileEntry(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
