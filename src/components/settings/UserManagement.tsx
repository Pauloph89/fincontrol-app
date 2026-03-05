import { useState } from "react";
import { useUserRole, roleLabels, AppRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, ShieldAlert, UserPlus, Mail } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export function UserManagement() {
  const { user } = useAuth();
  const { allUsersQuery, updateUserRole, toggleUserActive, inviteUser, role: myRole } = useUserRole();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "visualizador" as AppRole });

  if (myRole !== "admin") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg mb-1">Acesso Restrito</h3>
          <p className="text-muted-foreground text-sm">Apenas administradores podem gerenciar usuários.</p>
        </CardContent>
      </Card>
    );
  }

  if (allUsersQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando usuários...
      </div>
    );
  }

  const users = allUsersQuery.data || [];

  const handleInvite = async () => {
    if (!inviteForm.email) return;
    await inviteUser.mutateAsync({
      email: inviteForm.email,
      role: inviteForm.role,
      name: inviteForm.name,
    });
    setInviteOpen(false);
    setInviteForm({ name: "", email: "", role: "visualizador" });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5" />
              Usuários & Permissões
            </CardTitle>
            <CardDescription>Gerencie os perfis de acesso dos usuários da empresa</CardDescription>
          </div>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <UserPlus className="h-4 w-4" />
                Adicionar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Novo Usuário</DialogTitle>
                <DialogDescription>
                  O usuário receberá um e-mail para criar sua senha e acessar o sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Nome do usuário"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="usuario@email.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Perfil de Acesso</Label>
                  <Select
                    value={inviteForm.role}
                    onValueChange={(v) => setInviteForm((p) => ({ ...p, role: v as AppRole }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(roleLabels) as AppRole[]).map((r) => (
                        <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
                <Button onClick={handleInvite} disabled={inviteUser.isPending || !inviteForm.email}>
                  {inviteUser.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                  ) : (
                    "Enviar Convite"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Desde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isMe = u.user_id === user?.id;
                return (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">
                      {u.email || "—"}
                      {isMe && <Badge variant="secondary" className="ml-2 text-[10px]">Você</Badge>}
                    </TableCell>
                    <TableCell>
                      {isMe ? (
                        <Badge variant="outline">{roleLabels[u.role]}</Badge>
                      ) : (
                        <Select
                          value={u.role}
                          onValueChange={(v) => updateUserRole.mutate({ userId: u.user_id, role: v as AppRole })}
                        >
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(roleLabels) as AppRole[]).map((r) => (
                              <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {isMe ? (
                        <Badge className="bg-success/10 text-success border-success/20 text-[10px]">Ativo</Badge>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <div className="flex items-center gap-2 cursor-pointer">
                              <Switch checked={u.active} />
                              <span className="text-xs">{u.active ? "Ativo" : "Inativo"}</span>
                            </div>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{u.active ? "Desativar" : "Ativar"} usuário?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {u.active
                                  ? "O usuário perderá acesso ao sistema até ser reativado."
                                  : "O usuário recuperará o acesso ao sistema."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => toggleUserActive.mutate({ userId: u.user_id, active: !u.active })}>
                                Confirmar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                );
              })}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
