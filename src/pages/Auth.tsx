import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, Mail, Lock, ArrowRight, ArrowLeft } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [forgotSent, setForgotSent] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Erro ao enviar e-mail", description: error.message, variant: "destructive" });
    } else {
      setForgotSent(true);
      toast({ title: "E-mail enviado!", description: "Verifique sua caixa de entrada para redefinir a senha." });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 financial-gradient items-center justify-center p-12">
        <div className="max-w-md text-primary-foreground">
          <div className="flex items-center gap-3 mb-8">
            <Building2 className="h-10 w-10" />
            <h1 className="text-3xl font-bold tracking-tight">FinControl</h1>
          </div>
          <h2 className="text-2xl font-semibold mb-4">
            Sistema Financeiro Empresarial
          </h2>
          <p className="text-primary-foreground/80 text-lg leading-relaxed">
            Controle completo de comissões, despesas e fluxo de caixa para representação comercial.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-4 lg:hidden">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">FinControl</span>
            </div>
            {mode === "login" ? (
              <>
                <CardTitle className="text-2xl">Entrar</CardTitle>
                <CardDescription>Acesse seu painel financeiro</CardDescription>
              </>
            ) : (
              <>
                <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
                <CardDescription>
                  {forgotSent
                    ? "Verifique seu e-mail para redefinir a senha"
                    : "Informe seu e-mail para receber o link de recuperação"}
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent>
            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setForgotSent(false); }}
                      className="text-xs text-primary hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Aguarde..." : "Entrar"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            ) : forgotSent ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Um e-mail com instruções foi enviado para <strong>{email}</strong>.
                </p>
                <Button variant="outline" onClick={() => { setMode("login"); setForgotSent(false); }} className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar Link de Recuperação"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={() => setMode("login")} className="w-full text-sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao Login
                </Button>
              </form>
            )}
            {mode === "login" && (
              <p className="mt-6 text-center text-xs text-muted-foreground">
                Novos usuários são adicionados pelo administrador da empresa.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
