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

// Permissions map per role
const permissionsMap: Record<AppRole, {
  modules: string[];
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
}> = {
  admin: {
    modules: ["dashboard", "comissoes", "despesas", "conciliacao", "fluxo-caixa", "projecoes", "relatorios", "configuracoes", "usuarios"],
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
  const { user } = useAuth();
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
    queryKey: ["all-users-roles"],
    queryFn: async () => {
      // Only admins can see all users
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Get profile emails
      const userIds = (data || []).map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", userIds);

      const emailMap = (profiles || []).reduce((acc: Record<string, string>, p: any) => {
        acc[p.user_id] = p.email || "";
        return acc;
      }, {});

      return (data || []).map((r: any) => ({
        user_id: r.user_id,
        email: emailMap[r.user_id] || "—",
        role: r.role as AppRole,
        active: r.active,
        created_at: r.created_at,
      })) as UserWithRole[];
    },
    enabled: !!user && roleQuery.data === "admin",
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
  };
}

export const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  financeiro: "Financeiro",
  comercial: "Comercial",
  visualizador: "Visualizador",
};
