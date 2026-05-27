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

  // Redirect authenticated users — use user_roles table (same as App.tsx)
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        navigate(data ? "/admin" : "/", { replace: true });
      });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Habit Tracker</h1>
          {isLogin ? (
            <p className="text-muted-foreground text-sm">
              Welcome back! Log in to continue.
            </p>
          ) : (
            <>
              <p className="text-base font-semibold text-primary">
                Please create an account by signing up
              </p>
            </>
          )}
        </div>

        <Card className="p-6">
          {isLogin ? (
            <LoginForm onSwitchToSignup={() => setIsLogin(false)} />
          ) : (
            <SignupForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </Card>

        <div className="flex justify-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 font-semibold"
            onClick={() => navigate("/admin-login")}
          >
            <Shield className="w-4 h-4" />
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
