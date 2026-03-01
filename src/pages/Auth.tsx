import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Setup admin on first load
  useEffect(() => {
    supabase.functions.invoke("admin-setup").catch(() => {});
  }, []);

  // Redirect admin to admin panel after login
  useEffect(() => {
    if (user) {
      supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            navigate("/admin", { replace: true });
          }
        });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Habit Tracker</h1>
          <p className="text-muted-foreground text-sm">
            {isLogin
              ? "Welcome back! Log in to continue."
              : "Create an account to start tracking."}
          </p>
        </div>

        <Card className="p-6">
          {isLogin ? (
            <LoginForm onSwitchToSignup={() => setIsLogin(false)} />
          ) : (
            <SignupForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </Card>

        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground gap-1"
            onClick={() => navigate("/admin-login")}
          >
            <Shield className="w-3 h-3" />
            Admin Access
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Build better habits, one day at a time.
        </p>
      </div>
    </div>
  );
};

export default Auth;
