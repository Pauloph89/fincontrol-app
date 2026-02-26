import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface CompanySettings {
  id: string;
  user_id: string;
  company_name: string | null;
  company_logo_url: string | null;
  cnpj: string | null;
  responsible_name: string | null;
  email: string | null;
  phone: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  financial_day_start: number;
  default_account: string;
  alert_days: number;
  currency: string;
}

export function useCompanySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["company_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data as unknown as CompanySettings;
    },
    enabled: !!user,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<CompanySettings>) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update(updates as any)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_settings"] });
      toast({ title: "Configurações salvas!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not authenticated");
      // Upload to company-assets bucket (public)
      const filePath = `${user.id}/logo_${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from("company-assets")
        .getPublicUrl(filePath);
      // Cache bust
      const urlWithCacheBust = `${publicUrl}?v=${Date.now()}`;
      await supabase
        .from("profiles")
        .update({ company_logo_url: urlWithCacheBust } as any)
        .eq("user_id", user.id);
      return urlWithCacheBust;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_settings"] });
      toast({ title: "Logo atualizado!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao enviar logo", description: err.message, variant: "destructive" });
    },
  });

  return { settingsQuery, updateSettings, uploadLogo };
}
