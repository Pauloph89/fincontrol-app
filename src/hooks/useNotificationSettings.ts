import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface NotificationSettings {
  id?: string;
  company_id?: string;
  notify_commission_overdue: boolean;
  notify_expense_due_soon: boolean;
  notify_expense_overdue: boolean;
  notify_lead_inactive: boolean;
}

const defaults: NotificationSettings = {
  notify_commission_overdue: true,
  notify_expense_due_soon: true,
  notify_expense_overdue: true,
  notify_lead_inactive: true,
};

export function useNotificationSettings() {
  const { user, companyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notification_settings", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_settings" as any)
        .select("*")
        .eq("company_id", companyId!)
        .maybeSingle();
      if (error) throw error;
      return (data as any as NotificationSettings | null) || defaults;
    },
    enabled: !!user && !!companyId,
  });

  const update = useMutation({
    mutationFn: async (settings: Partial<NotificationSettings>) => {
      if (!companyId) throw new Error("No company");

      // Try upsert
      const { error } = await supabase
        .from("notification_settings" as any)
        .upsert(
          { company_id: companyId, ...settings } as any,
          { onConflict: "company_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification_settings"] });
      toast({ title: "Preferências de notificação salvas!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar preferências", description: err.message, variant: "destructive" });
    },
  });

  return { settings: query.data || defaults, isLoading: query.isLoading, update };
}
