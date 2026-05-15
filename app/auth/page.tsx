"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (isLogin) {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (authError) {
        setError(authError.message);
        return;
      }
    } else {
      const { data, error: authError } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (authError) {
        setError(authError.message);
        return;
      }
      if (data.user && !data.session) {
        setSuccess("Revisá tu email y confirmá tu cuenta para poder ingresar.");
        return;
      }
      // Immediate session (e.g. email confirmation disabled)
      if (data.session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .single();
        router.push(profile?.onboarding_completed ? "/dashboard" : "/onboarding");
        return;
      }
    }

    if (isLogin) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .single();
      router.push(profile?.onboarding_completed ? "/dashboard" : "/onboarding");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 gap-8">
      <Card className="w-full max-w-md card-revolut">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            Signal<span className="text-primary">AI</span>
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            {isLogin ? "Ingresá a tu cuenta" : "Creá tu cuenta"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {success && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
                {success}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Cargando..."
                : isLogin
                  ? "Iniciar sesión"
                  : "Crear cuenta"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">o</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full opacity-40 cursor-not-allowed"
            disabled
          >
            Continuar con Google
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Próximamente
            </span>
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "¿No tenés cuenta?" : "¿Ya tenés cuenta?"}{" "}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null); setSuccess(null); }}
              className="text-primary underline-offset-4 hover:underline"
            >
              {isLogin ? "Registrate" : "Iniciá sesión"}
            </button>
          </p>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="hidden lg:flex w-full max-w-xs flex-col gap-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6">
        <div className="flex items-center gap-2 text-yellow-400">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-sm font-semibold">Aviso Legal</span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          SignalAI es una herramienta educativa y de análisis. La información presentada <strong className="text-foreground">no constituye asesoramiento financiero</strong>, recomendación de inversión, ni oferta de compra o venta de valores.
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Las decisiones de inversión son responsabilidad exclusiva del usuario. Rentabilidades pasadas no garantizan resultados futuros. Consultá a un asesor financiero matriculado antes de invertir.
        </p>
      </div>
    </div>
  );
}
