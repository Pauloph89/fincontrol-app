import { useState, useMemo } from "react";
import { useFactories, Factory, FactoryFormData } from "@/hooks/useFactories";
import { useOrders } from "@/hooks/useOrders";
import { useCommissions } from "@/hooks/useCommissions";
import { useUserRole } from "@/hooks/useUserRole";
import { formatCurrency } from "@/lib/financial-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, Loader2, Factory as FactoryIcon, Eye } from "lucide-react";

const emptyForm: FactoryFormData = {
  nome: "", comissao_padrao: 8, prazo_pagamento: "", contato_comercial: "",
  email_financeiro: "", politica_comissao: "", observacoes: "", telefone: "",
};

function PaymentTermBadges({ term }: { term: string | null }) {
  if (!term) return <span>—</span>;
  const parts = term.split("/").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return <span>{term}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {parts.map((p, i) => (
        <Badge key={i} variant="secondary" className="text-[10px] h-5">{p}</Badge>
      ))}
    </div>
  );
}

export default function Factories() {
  const { factoriesQuery, createFactory, updateFactory, deleteFactory } = useFactories();
  const { ordersQuery } = useOrders();
  const { commissionsQuery } = useCommissions();
  const { canEdit, canDelete } = useUserRole();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null);
  const [detailFactory, setDetailFactory] = useState<Factory | null>(null);
  const [form, setForm] = useState<FactoryFormData>({ ...emptyForm });

  const factories = (factoriesQuery.data || []).filter((f) => {
    if (!search) return true;
    return f.nome.toLowerCase().includes(search.toLowerCase());
  });

  // Compute total commission per factory
  const factoryCommissionTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    (commissionsQuery.data || []).forEach((c: any) => {
      if (c.status === "deleted" || c.status === "cancelada") return;
      const key = c.factory.toLowerCase();
      totals[key] = (totals[key] || 0) + Number(c.commission_total);
    });
    return totals;
  }, [commissionsQuery.data]);

  const openCreate = () => { setEditingFactory(null); setForm({ ...emptyForm }); setFormOpen(true); };
  const openEdit = (f: Factory) => {
    setEditingFactory(f);
    setForm({
      nome: f.nome, comissao_padrao: f.comissao_padrao, prazo_pagamento: f.prazo_pagamento || "",
      contato_comercial: f.contato_comercial || "", email_financeiro: f.email_financeiro || "",
      politica_comissao: f.politica_comissao || "", observacoes: f.observacoes || "",
      telefone: (f as any).telefone || "",
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nome.trim()) return;
    if (editingFactory) {
      await updateFactory.mutateAsync({ id: editingFactory.id, data: form });
    } else {
      await createFactory.mutateAsync(form);
    }
    setFormOpen(false);
  };

  const update = (field: keyof FactoryFormData, value: string | number) => setForm((p) => ({ ...p, [field]: value }));

  const getFactoryOrders = (factoryName: string) => {
    return (ordersQuery.data || []).filter((o: any) => o.factory.toLowerCase() === factoryName.toLowerCase());
  };

  if (factoriesQuery.isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground gap-2"><Loader2 className="h-5 w-5 animate-spin" />Carregando fábricas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fábricas Representadas</h1>
          <p className="text-muted-foreground text-sm">Cadastro de fábricas e políticas de comissão</p>
        </div>
        {canEdit && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nova Fábrica</Button>}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar fábrica..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {factories.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <FactoryIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg mb-1">Nenhuma fábrica cadastrada</h3>
          <p className="text-muted-foreground text-sm">Clique em "Nova Fábrica" para começar.</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0"><div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>% Comissão</TableHead>
              <TableHead className="hidden sm:table-cell">Prazo Pagamento</TableHead>
              <TableHead className="hidden md:table-cell">Contato</TableHead>
              <TableHead className="hidden lg:table-cell">Pedidos</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Total Comissão</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {factories.map((f) => {
                const orders = getFactoryOrders(f.nome);
                const totalComm = factoryCommissionTotals[f.nome.toLowerCase()] || 0;
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium text-sm">{f.nome}</TableCell>
                    <TableCell><Badge variant="outline">{f.comissao_padrao}%</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell text-xs">
                      <PaymentTermBadges term={f.prazo_pagamento} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{f.contato_comercial || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">{orders.length}</TableCell>
                    <TableCell className="hidden lg:table-cell text-right text-xs font-semibold">
                      {totalComm > 0 ? formatCurrency(totalComm) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetailFactory(f)}><Eye className="h-3.5 w-3.5" /></Button>
                        {canEdit && <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(f)}><Pencil className="h-3.5 w-3.5" /></Button>}
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Excluir fábrica {f.nome}?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteFactory.mutate(f.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div></CardContent></Card>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingFactory ? "Editar Fábrica" : "Nova Fábrica"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nome da Fábrica *</Label><Input value={form.nome} onChange={(e) => update("nome", e.target.value)} /></div>
              <div className="space-y-2"><Label>% Comissão Padrão</Label><Input type="number" step="0.01" min="0" max="100" value={form.comissao_padrao} onChange={(e) => update("comissao_padrao", parseFloat(e.target.value) || 0)} /></div>
            </div>
            <div className="space-y-2"><Label>Prazo de Pagamento</Label><Input value={form.prazo_pagamento || ""} onChange={(e) => update("prazo_pagamento", e.target.value)} placeholder="Ex: 30/60/90 DDL" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Contato Comercial</Label><Input value={form.contato_comercial || ""} onChange={(e) => update("contato_comercial", e.target.value)} /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input value={(form as any).telefone || ""} onChange={(e) => update("telefone" as any, e.target.value)} placeholder="(11) 99999-9999" /></div>
            </div>
            <div className="space-y-2"><Label>E-mail Financeiro</Label><Input type="email" value={form.email_financeiro || ""} onChange={(e) => update("email_financeiro", e.target.value)} /></div>
            <div className="space-y-2"><Label>Política de Comissão</Label><Textarea value={form.politica_comissao || ""} onChange={(e) => update("politica_comissao", e.target.value)} rows={2} /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes || ""} onChange={(e) => update("observacoes", e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createFactory.isPending || updateFactory.isPending || !form.nome.trim()}>
              {(createFactory.isPending || updateFactory.isPending) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingFactory ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailFactory} onOpenChange={() => setDetailFactory(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detailFactory?.nome}</DialogTitle></DialogHeader>
          {detailFactory && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Comissão Padrão:</span> {detailFactory.comissao_padrao}%</div>
                <div><span className="text-muted-foreground">Prazo:</span> {detailFactory.prazo_pagamento || "—"}</div>
                <div><span className="text-muted-foreground">Contato:</span> {detailFactory.contato_comercial || "—"}</div>
                <div><span className="text-muted-foreground">E-mail Financeiro:</span> {detailFactory.email_financeiro || "—"}</div>
              </div>
              {detailFactory.politica_comissao && <div className="text-sm"><span className="text-muted-foreground">Política:</span> {detailFactory.politica_comissao}</div>}
              {detailFactory.observacoes && <div className="text-sm"><span className="text-muted-foreground">Observações:</span> {detailFactory.observacoes}</div>}
              <div>
                <h3 className="font-semibold text-sm mb-2">Pedidos desta Fábrica</h3>
                {(() => {
                  const orders = getFactoryOrders(detailFactory.nome);
                  if (orders.length === 0) return <p className="text-muted-foreground text-sm">Nenhum pedido.</p>;
                  const totalVendas = orders.reduce((s: number, o: any) => s + Number(o.commission_base_value), 0);
                  const totalComissao = orders.reduce((s: number, o: any) => s + Number(o.commission_total_rep), 0);
                  return (
                    <div className="space-y-2">
                      <div className="flex gap-4 text-xs">
                        <Badge variant="outline">{orders.length} pedidos</Badge>
                        <Badge variant="outline">Vendas: {formatCurrency(totalVendas)}</Badge>
                        <Badge variant="outline">Comissões: {formatCurrency(totalComissao)}</Badge>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
