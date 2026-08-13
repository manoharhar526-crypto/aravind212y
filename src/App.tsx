import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Widgets from "./pages/Widgets";

import AdminPanel from "./pages/AdminPanel";
import AdminGate from "./pages/AdminGate";
import AdminUserDetail from "./pages/AdminUserDetail";
import NotFound from "./pages/NotFound";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

const queryClient = new QueryClient();

// Loading spinner component
const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// Only redirects if NOT logged in
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

import { STORAGE_KEYS, ADMIN_GATE_SESSION_KEY } from "@/lib/constants";
const ADMIN_KEY = STORAGE_KEYS.IS_ADMIN;
const ADMIN_SESSION_KEY = "admin_session_active";

// Auto-logout admin when app is closed and reopened.
// sessionStorage clears on tab/app close, so a missing marker = fresh launch.
const useAdminAutoLogout = () => {
  const { user, signOut } = useAuth();
  useEffect(() => {
    if (!user) return;
    const wasAdmin = localStorage.getItem(ADMIN_KEY) === "true";
    const hasSession = sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
    if (wasAdmin && !hasSession) {
      // Fresh app open for a previously-admin user → force re-login
      localStorage.removeItem(ADMIN_KEY);
      sessionStorage.removeItem(ADMIN_GATE_SESSION_KEY);
      signOut();
    } else {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
    }
  }, [user, signOut]);
};

// Only redirects if NOT admin
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  // Always start as null (loading). Never trust localStorage as the source of
  // truth for privilege gating — it is user-writable from DevTools.
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setIsAdmin(false); localStorage.removeItem(ADMIN_KEY); return; }
    setIsAdmin(null);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { setIsAdmin(false); localStorage.removeItem(ADMIN_KEY); return; }
        const admin = !!data;
        setIsAdmin(admin);
        if (admin) {
          // localStorage is only a UX hint for redirect destination; never a gate.
          localStorage.setItem(ADMIN_KEY, "true");
          sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
        } else {
          localStorage.removeItem(ADMIN_KEY);
        }
      });
  }, [user]);

  if (loading || isAdmin === null) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  // Admins must additionally pass the secret-code gate once per session.
  if (sessionStorage.getItem(ADMIN_GATE_SESSION_KEY) !== "true")
    return <Navigate to="/admin-gate" replace />;
  return <>{children}</>;
};

// Admin-only route for the secret-code gate itself (no gate check).
const AdminGateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    setIsAdmin(null);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data, error }) => setIsAdmin(!error && !!data));
  }, [user]);

  if (loading || isAdmin === null) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  if (sessionStorage.getItem(ADMIN_GATE_SESSION_KEY) === "true")
    return <Navigate to="/admin" replace />;
  return <>{children}</>;
};


// Redirects logged-in users away from auth page
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);


  useEffect(() => {
    if (loading) return;
    if (!user) { setIsAdmin(false); setChecked(true); return; }

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          // Keep cached state on error — don't bounce admin users to /
          setChecked(true);
          return;
        }
        const admin = !!data;
        setIsAdmin(admin);
        setChecked(true);
        if (admin) localStorage.setItem(ADMIN_KEY, "true");
        else localStorage.removeItem(ADMIN_KEY);
      });
  }, [user, loading]);

  if (loading || (user && !checked)) return <LoadingScreen />;

  if (user && checked) {
    return <Navigate to={isAdmin ? "/admin-gate" : "/"} replace />;
  }

  return <>{children}</>;
};


// Remounts Index whenever the logged-in user changes,
// so useState initializers re-run and load the correct user's data.
const IndexWithKey = () => {
  const { user } = useAuth();
  return <Index key={user?.id ?? "guest"} />;
};

const AdminPanelWrapper = () => {
  const navigate = useNavigate();

  // Leaving the admin panel signs the admin out instead of dropping
  // them into the regular habit tracker page.
  const handleBack = async () => {
    localStorage.removeItem(ADMIN_KEY);
    sessionStorage.removeItem(ADMIN_GATE_SESSION_KEY);
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return <AdminPanel onBack={handleBack} />;
};

const AppRoutes = () => {
  useAdminAutoLogout();
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><IndexWithKey /></ProtectedRoute>} />
      <Route path="/widgets" element={<ProtectedRoute><Widgets key="widgets" /></ProtectedRoute>} />
      <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
      <Route path="/admin-login" element={<Navigate to="/auth" replace />} />
      <Route path="/admin-gate" element={<AdminGateRoute><AdminGate /></AdminGateRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminPanelWrapper /></AdminRoute>} />
      <Route path="/admin/user/:userId" element={<AdminRoute><AdminUserDetail /></AdminRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
