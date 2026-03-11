import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, Lock, ArrowRight, CheckCircle, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [expired, setExpired] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const processRecovery = async () => {
      // Parse hash fragment for tokens
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");

      if (accessToken && refreshToken && (type === "recovery" || type === "invite")) {
        // Set session from URL tokens
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!mounted) return;

        if (error) {
          console.error("Recovery session error:", error);
          setExpired(true);
          setLoading(false);
          return;
        }

        setSessionReady(true);
        setLoading(false);
        // Clean up URL hash
        window.history.replaceState(null, "", window.location.pathname);
        return;
      }

      // Also listen for auth state change (e.g. if Supabase auto-processes the hash)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (!mounted) return;
        if (event === "PASSWORD_RECOVERY") {
          setSessionReady(true);
          setLoading(false);
        }
      });

      // Check if already in a session (e.g. recovery link already processed)
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) { subscription.unsubscribe(); return; }

      if (session) {
        setSessionReady(true);
        setLoading(false);
      } else if (!accessToken) {
        // No tokens, no session — expired or invalid link
        setExpired(true);
        setLoading(false);
      }

      return () => subscription.unsubscribe();
    };

    processRecovery();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Erro ao definir senha", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      toast({ title: "Senha definida com sucesso!" });
      // Sign out so user logs in with new password
      await supabase.auth.signOut();
      setTimeout(() => navigate("/"), 2000);
    }
    setSubmitting(false);
  };

  const PasswordInput = ({
    id, value, onChange, show, onToggle, placeholder = "••••••••",
  }: {
    id: string; value: string; onChange: (v: string) => void;
    show: boolean; onToggle: () => void; placeholder?: string;
  }) => (
    <div className="relative">
      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-10"
        required
        minLength={6}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">FinControl</span>
          </div>
          {loading ? (
            <>
              <CardTitle className="text-2xl">Verificando link...</CardTitle>
              <CardDescription>Aguarde enquanto validamos seu acesso</CardDescription>
            </>
          ) : expired ? (
            <>
              <div className="flex justify-center mb-2">
                <AlertTriangle className="h-12 w-12 text-warning" />
              </div>
              <CardTitle className="text-2xl">Link expirado</CardTitle>
              <CardDescription>Este link de redefinição expirou. Solicite um novo link na tela de login.</CardDescription>
            </>
          ) : success ? (
            <>
              <div className="flex justify-center mb-2">
                <CheckCircle className="h-12 w-12 text-success" />
              </div>
              <CardTitle className="text-2xl">Senha definida!</CardTitle>
              <CardDescription>Redirecionando para o login...</CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-2xl">Definir Nova Senha</CardTitle>
              <CardDescription>Crie uma senha segura para acessar o sistema</CardDescription>
            </>
          )}
        </CardHeader>

        {expired && !loading && (
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              Ir para o Login
            </Button>
          </CardContent>
        )}

        {sessionReady && !success && !loading && !expired && (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <PasswordInput id="password" value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <PasswordInput id="confirmPassword" value={confirmPassword} onChange={setConfirmPassword} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Salvando..." : "Definir Senha"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
