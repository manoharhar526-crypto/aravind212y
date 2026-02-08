import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export const SignupForm = ({ onSwitchToLogin }: SignupFormProps) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const validateUsername = (value: string) => {
    return /^[a-z0-9_]{3,30}$/.test(value);
  };

  const checkUsernameAvailability = async (value: string) => {
    if (!validateUsername(value)) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", value)
        .maybeSingle();

      if (error) {
        setUsernameAvailable(null);
        return;
      }

      setUsernameAvailable(!data);
    } catch {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(cleaned);
    setUsernameAvailable(null);

    if (cleaned.length >= 3) {
      // Debounce the check
      const timeoutId = setTimeout(() => checkUsernameAvailability(cleaned), 500);
      return () => clearTimeout(timeoutId);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateUsername(username)) {
      toast.error("Username must be 3-30 characters (lowercase letters, numbers, underscores)");
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (usernameAvailable === false) {
      toast.error("This username is already taken");
      return;
    }

    setLoading(true);
    try {
      // Final availability check
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      if (existing) {
        toast.error("This username was just taken! Please choose another.");
        setUsernameAvailable(false);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { username },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("This email is already registered. Try logging in instead.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Account created! Please check your email to verify your account.", {
        duration: 6000,
      });
      onSwitchToLogin();
    } catch (err) {
      console.error("Signup error:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-username">Username</Label>
        <div className="relative">
          <Input
            id="signup-username"
            placeholder="Choose a unique username"
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            maxLength={30}
            autoComplete="username"
            className="text-base pr-10"
          />
          {username.length >= 3 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {checkingUsername ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : usernameAvailable === true ? (
                <Check className="w-4 h-4 text-primary" />
              ) : usernameAvailable === false ? (
                <X className="w-4 h-4 text-destructive" />
              ) : null}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Lowercase letters, numbers, and underscores only (3-30 chars)
        </p>
        {usernameAvailable === false && (
        <p className="text-xs text-destructive">This username is already taken</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={255}
          autoComplete="email"
          className="text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={128}
            autoComplete="new-password"
            className="text-base pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading || usernameAvailable === false}
        className="w-full"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Create Account
      </Button>

      <p className="text-sm text-center text-muted-foreground">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-primary hover:underline font-medium"
        >
          Log in
        </button>
      </p>
    </form>
  );
};
