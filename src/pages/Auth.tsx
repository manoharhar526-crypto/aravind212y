import { useState } from "react";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);

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

        <p className="text-xs text-center text-muted-foreground">
          Build better habits, one day at a time.
        </p>
      </div>
    </div>
  );
};

export default Auth;
