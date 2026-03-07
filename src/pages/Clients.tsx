import { useState } from "react";
import { useClients, Client, ClientFormData } from "@/hooks/useClients";
import { useOrders } from "@/hooks/useOrders";
import { useUserRole } from "@/hooks/useUserRole";
import { formatCurrency, formatDate } from "@/lib/financial-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, Loader2, Users, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BRAZILIAN_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const emptyForm: ClientFormData = {
  razao_social: "", nome_fantasia: "", cnpj_cpf: "", telefone: "",
  email: "", endereco: "", cidade: "", estado: "", observacoes: "", vendedor_responsavel: "",
};

export default function Clients() {
  const { clientsQuery, createClient, updateClient, deleteClient } = useClients();
  const { ordersQuery } = useOrders();
  const { canEdit, canDelete } = useUserRole();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientFormData>({ ...emptyForm });

  const clients = (clientsQuery.data || []).filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.razao_social.toLowerCase().includes(s) || (c.nome_fantasia || "").toLowerCase().includes(s) || (c.cnpj_cpf || "").includes(s);
  });

  const openCreate = () => { setEditingClient(null); setForm({ ...emptyForm }); setFormOpen(true); };
  const openEdit = (c: Client) => {
    setEditingClient(c);
    setForm({
      razao_social: c.razao_social, nome_fantasia: c.nome_fantasia || "", cnpj_cpf: c.cnpj_cpf || "",
      telefone: c.telefone || "", email: c.email || "", endereco: c.endereco || "",
      cidade: c.cidade || "", estado: c.estado || "", observacoes: c.observacoes || "",
      vendedor_responsavel: c.vendedor_responsavel || "",
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.razao_social.trim()) return;
    if (editingClient) {
      await updateClient.mutateAsync({ id: editingClient.id, data: form });
    } else {
      await createClient.mutateAsync(form);
    }
    setFormOpen(false);
  };

  const update = (field: keyof ClientFormData, value: string) => setForm((p) => ({ ...p, [field]: value }));

  // Get orders for a client (by name match)
  const getClientOrders = (clientName: string) => {
    return (ordersQuery.data || []).filter((o: any) =>
      o.client.toLowerCase() === clientName.toLowerCase() || o.client_cnpj === clientName
    );
  };

  if (clientsQuery.isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground gap-2"><Loader2 className="h-5 w-5 animate-spin" />Carregando clientes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM — Clientes</h1>
          <p className="text-muted-foreground text-sm">Cadastro e histórico de clientes</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Novo Cliente</Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* List */}
      {clients.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg mb-1">Nenhum cliente cadastrado</h3>
          <p className="text-muted-foreground text-sm">Clique em "Novo Cliente" para começar.</p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Razão Social</TableHead>
                    <TableHead className="hidden sm:table-cell">Nome Fantasia</TableHead>
                    <TableHead className="hidden md:table-cell">CNPJ/CPF</TableHead>
                    <TableHead className="hidden lg:table-cell">Cidade/UF</TableHead>
                    <TableHead className="hidden lg:table-cell">Vendedor</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-sm">{c.razao_social}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{c.nome_fantasia || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{c.cnpj_cpf || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">{c.cidade ? `${c.cidade}/${c.estado}` : "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">{c.vendedor_responsavel || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetailClient(c)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {canEdit && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(c)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Excluir cliente {c.razao_social}?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteClient.mutate(c.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Razão Social *</Label><Input value={form.razao_social} onChange={(e) => update("razao_social", e.target.value)} /></div>
              <div className="space-y-2"><Label>Nome Fantasia</Label><Input value={form.nome_fantasia || ""} onChange={(e) => update("nome_fantasia", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>CNPJ/CPF</Label><Input value={form.cnpj_cpf || ""} onChange={(e) => update("cnpj_cpf", e.target.value)} /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input value={form.telefone || ""} onChange={(e) => update("telefone", e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email || ""} onChange={(e) => update("email", e.target.value)} /></div>
            <div className="space-y-2"><Label>Endereço</Label><Input value={form.endereco || ""} onChange={(e) => update("endereco", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Cidade</Label><Input value={form.cidade || ""} onChange={(e) => update("cidade", e.target.value)} /></div>
              <div className="space-y-2"><Label>Estado</Label>
                <Select value={form.estado || ""} onValueChange={(v) => update("estado", v)}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>{BRAZILIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Vendedor Responsável</Label><Input value={form.vendedor_responsavel || ""} onChange={(e) => update("vendedor_responsavel", e.target.value)} /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes || ""} onChange={(e) => update("observacoes", e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createClient.isPending || updateClient.isPending || !form.razao_social.trim()}>
              {(createClient.isPending || updateClient.isPending) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingClient ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailClient} onOpenChange={() => setDetailClient(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detailClient?.razao_social}</DialogTitle></DialogHeader>
          {detailClient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Nome Fantasia:</span> {detailClient.nome_fantasia || "—"}</div>
                <div><span className="text-muted-foreground">CNPJ/CPF:</span> {detailClient.cnpj_cpf || "—"}</div>
                <div><span className="text-muted-foreground">Telefone:</span> {detailClient.telefone || "—"}</div>
                <div><span className="text-muted-foreground">E-mail:</span> {detailClient.email || "—"}</div>
                <div><span className="text-muted-foreground">Cidade/UF:</span> {detailClient.cidade ? `${detailClient.cidade}/${detailClient.estado}` : "—"}</div>
                <div><span className="text-muted-foreground">Vendedor:</span> {detailClient.vendedor_responsavel || "—"}</div>
              </div>
              {detailClient.observacoes && (
                <div className="text-sm"><span className="text-muted-foreground">Observações:</span> {detailClient.observacoes}</div>
              )}

              {/* Order history */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Histórico de Pedidos</h3>
                {(() => {
                  const orders = getClientOrders(detailClient.razao_social);
                  if (orders.length === 0) return <p className="text-muted-foreground text-sm">Nenhum pedido encontrado.</p>;
                  const totalVendas = orders.reduce((s: number, o: any) => s + Number(o.commission_base_value), 0);
                  const totalComissao = orders.reduce((s: number, o: any) => s + Number(o.commission_total_rep), 0);
                  return (
                    <div className="space-y-2">
                      <div className="flex gap-4 text-xs">
                        <Badge variant="outline">{orders.length} pedidos</Badge>
                        <Badge variant="outline">Vendas: {formatCurrency(totalVendas)}</Badge>
                        <Badge variant="outline">Comissões: {formatCurrency(totalComissao)}</Badge>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <Table>
                          <TableHeader><TableRow>
                            <TableHead className="text-xs">Pedido</TableHead>
                            <TableHead className="text-xs">Fábrica</TableHead>
                            <TableHead className="text-xs text-right">Valor</TableHead>
                            <TableHead className="text-xs">Data</TableHead>
                          </TableRow></TableHeader>
                          <TableBody>
                            {orders.map((o: any) => (
                              <TableRow key={o.id}>
                                <TableCell className="text-xs">{o.order_number}</TableCell>
                                <TableCell className="text-xs">{o.factory}</TableCell>
                                <TableCell className="text-xs text-right">{formatCurrency(o.commission_base_value)}</TableCell>
                                <TableCell className="text-xs">{formatDate(o.order_date)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
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
