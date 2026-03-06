import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type AppRole = "admin" | "financeiro" | "comercial" | "visualizador";

export interface UserWithRole {
  user_id: string;
  email: string;
  role: AppRole;
  active: boolean;
  created_at: string;
}

const permissionsMap: Record<AppRole, {
  modules: string[];
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
}> = {
  admin: {
    modules: ["dashboard", "pedidos", "comissoes", "despesas", "conciliacao", "fluxo-caixa", "projecoes", "relatorios", "configuracoes", "usuarios"],
    canEdit: true,
    canDelete: true,
    canManageUsers: true,
  },
  financeiro: {
    modules: ["dashboard", "despesas", "conciliacao", "fluxo-caixa", "projecoes", "relatorios", "configuracoes"],
    canEdit: true,
    canDelete: false,
    canManageUsers: false,
  },
  comercial: {
    modules: ["dashboard", "comissoes", "projecoes", "relatorios"],
    canEdit: false,
    canDelete: false,
    canManageUsers: false,
  },
  visualizador: {
    modules: ["dashboard", "relatorios"],
    canEdit: false,
    canDelete: false,
    canManageUsers: false,
  },
};

export function useUserRole() {
  const { user, companyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const roleQuery = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_role", { _user_id: user!.id });
      if (error) throw error;
      return (data as AppRole) || "visualizador";
    },
    enabled: !!user,
  });

  const allUsersQuery = useQuery({
    queryKey: ["all-users-roles", companyId],
    queryFn: async () => {
      // Get all profiles in same company
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("user_id, email, responsible_name")
        .eq("company_id", companyId!);
      if (profErr) throw profErr;

      const userIds = (profiles || []).map((p: any) => p.user_id);
      if (userIds.length === 0) return [];

      // Get roles for these users
      const { data: roles, error: roleErr } = await supabase
        .from("user_roles")
        .select("*")
        .in("user_id", userIds)
        .order("created_at", { ascending: true });
      if (roleErr) throw roleErr;

      const emailMap = (profiles || []).reduce((acc: Record<string, string>, p: any) => {
        acc[p.user_id] = p.email || p.responsible_name || "";
        return acc;
      }, {});

      return (roles || []).map((r: any) => ({
        user_id: r.user_id,
        email: emailMap[r.user_id] || "—",
        role: r.role as AppRole,
        active: r.active,
        created_at: r.created_at,
      })) as UserWithRole[];
    },
    enabled: !!user && !!companyId && roleQuery.data === "admin",
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role } as any)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users-roles"] });
      toast({ title: "Perfil atualizado com sucesso!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar perfil", description: err.message, variant: "destructive" });
    },
  });

  const toggleUserActive = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ active } as any)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users-roles"] });
      toast({ title: "Status do usuário atualizado!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar status", description: err.message, variant: "destructive" });
    },
  });

  const inviteUser = useMutation({
    mutationFn: async ({ email, role, name }: { email: string; role: AppRole; name?: string }) => {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email, role, name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users-roles"] });
      toast({ title: "Convite enviado!", description: "O usuário receberá um e-mail para criar a senha." });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao convidar", description: err.message, variant: "destructive" });
    },
  });

  const role = roleQuery.data || "visualizador";
  const permissions = permissionsMap[role];

  const hasAccess = (module: string) => permissions.modules.includes(module);
  const canEdit = permissions.canEdit;
  const canDelete = permissions.canDelete;
  const canManageUsers = permissions.canManageUsers;

  return {
    role,
    roleQuery,
    permissions,
    hasAccess,
    canEdit,
    canDelete,
    canManageUsers,
    allUsersQuery,
    updateUserRole,
    toggleUserActive,
    inviteUser,
  };
}

export const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  financeiro: "Financeiro",
  comercial: "Comercial",
  visualizador: "Visualizador",
};
