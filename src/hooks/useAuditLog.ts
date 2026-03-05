import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAuditLog(tableName?: string, recordId?: string) {
  const { user, companyId } = useAuth();

  const logsQuery = useQuery({
    queryKey: ["audit_log", tableName, recordId],
    queryFn: async () => {
      let query = supabase.from("audit_log").select("*").order("created_at", { ascending: false });
      if (tableName) query = query.eq("table_name", tableName);
      if (recordId) query = query.eq("record_id", recordId);
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!companyId,
  });

  const logAction = useMutation({
    mutationFn: async (entry: { table_name: string; record_id: string; action: string; old_data?: any; new_data?: any }) => {
      if (!user || !companyId) return;
      const { error } = await supabase.from("audit_log").insert({
        user_id: user.id,
        company_id: companyId,
        ...entry,
      } as any);
      if (error) throw error;
    },
  });

  return { logsQuery, logAction };
}
