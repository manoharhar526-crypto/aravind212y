import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Loader2, Key, Pencil, Shield, User, Mail,
  Clock, Calendar, CheckCircle2, ListTodo, Database,
  Save, X, Eye, EyeOff, Lock, Trash2,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserFullDetail {
  profile: any;
  backup: { habits: any[]; tasks: any[]; updated_at: string } | null;
  email: string | null;
  last_sign_in: string | null;
}

const AdminUserDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<UserFullDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);

  const adminAction = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-manage", { body });
    if (error || data?.error) throw new Error(data?.error || "Request failed");
    return data;
  }, []);

  const fetchDetail = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const userData = await adminAction({ action: "get_user_data", target_user_id: userId });
      setDetail(userData);
      setUsername(userData.profile?.username || "");
      setOriginalUsername(userData.profile?.username || "");
      setRoles(userData.roles || []);
    } catch {
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  }, [userId, adminAction]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // Real-time: refresh user detail when their profile or backup changes
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`admin-user-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${userId}` },
        () => fetchDetail()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_backups", filter: `user_id=eq.${userId}` },
        () => fetchDetail()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchDetail]);

  const handleSaveUsername = async () => {
    if (!username.trim() || /\s/.test(username)) {
      toast.error("Invalid username");
      return;
    }
    setSaving(true);
    try {
      await adminAction({ action: "update_username", target_user_id: userId, new_username: username });
      toast.success("Username updated");
      setOriginalUsername(username);
      setEditingUsername(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to update username");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      await adminAction({ action: "update_password", target_user_id: userId, new_password: newPassword });
      toast.success("Password updated");
      setNewPassword("");
      setShowPasswordField(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    setSaving(true);
    try {
      await adminAction({ action: "delete_user", target_user_id: userId });
      toast.success("User deleted");
      navigate("/admin");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete user");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">User not found</p>
        <Button variant="outline" onClick={() => navigate("/admin")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  const isAdmin = roles.includes("admin");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <User className="w-6 h-6 text-primary" />
                {originalUsername}
                {isAdmin && <Badge variant="default" className="text-xs ml-1">Admin</Badge>}
              </h1>
              <p className="text-sm text-muted-foreground">Full user profile & data</p>
            </div>
          </div>
          {!isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-1" /> Delete User
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {originalUsername}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this user and all their data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete Permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Account & Credentials */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4" /> Account & Credentials
          </h2>

          {/* Username */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" /> Username
            </Label>
            {editingUsername ? (
              <div className="flex gap-2">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                  maxLength={30}
                  className="text-sm"
                />
                <Button size="sm" onClick={handleSaveUsername} disabled={saving}>
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingUsername(false); setUsername(originalUsername); }}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{originalUsername}</p>
                <Button size="sm" variant="ghost" onClick={() => setEditingUsername(true)}>
                  <Pencil className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="w-3 h-3" /> Password
            </Label>
            <div className="flex items-center gap-2">
              <p className="text-sm font-mono text-muted-foreground italic">••••••••  (encrypted — cannot be viewed)</p>
            </div>
            {showPasswordField ? (
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="text-sm pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-10"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                </div>
                <Button size="sm" onClick={handleSavePassword} disabled={saving}>
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowPasswordField(false); setNewPassword(""); }}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowPasswordField(true)} className="mt-1">
                <Key className="w-3 h-3 mr-1" /> Change Password
              </Button>
            )}
          </div>

          <Separator />

          {/* Account Meta */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-0.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3" /> Internal Email
              </Label>
              <p className="font-mono text-xs break-all">{detail.email || "—"}</p>
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Last Sign In
              </Label>
              <p className="text-xs">{detail.last_sign_in ? new Date(detail.last_sign_in).toLocaleString() : "Never"}</p>
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Account Created
              </Label>
              <p className="text-xs">{detail.profile?.created_at ? new Date(detail.profile.created_at).toLocaleString() : "—"}</p>
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Last Updated
              </Label>
              <p className="text-xs">{detail.profile?.updated_at ? new Date(detail.profile.updated_at).toLocaleString() : "—"}</p>
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="w-3 h-3" /> Roles
              </Label>
              <div className="flex gap-1 flex-wrap">
                {roles.length ? roles.map(r => (
                  <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="text-xs">{r}</Badge>
                )) : <span className="text-xs text-muted-foreground">No roles</span>}
              </div>
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Database className="w-3 h-3" /> User ID
              </Label>
              <p className="font-mono text-[10px] break-all text-muted-foreground">{userId}</p>
            </div>
          </div>
        </Card>

        {/* Habits */}
        <Card className="p-5 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Habits ({detail.backup?.habits?.length || 0})
          </h2>
          {detail.backup?.habits?.length ? (() => {
            // Group habits by name across all months for a full history view
            const habitsByName: Record<string, { name: string; totalDays: number; months: { month: string; days: number; completedDays: string[] }[] }> = {};
            detail.backup.habits.forEach((habit: any) => {
              const name = habit.name || "Unnamed";
              const days = Array.isArray(habit.completedDays) ? habit.completedDays : [];
              if (!habitsByName[name]) {
                habitsByName[name] = { name, totalDays: 0, months: [] };
              }
              habitsByName[name].totalDays += days.length;
              habitsByName[name].months.push({
                month: habit.month || "Unknown",
                days: days.length,
                completedDays: days,
              });
            });
            // Sort months within each habit
            Object.values(habitsByName).forEach(h => {
              h.months.sort((a, b) => a.month.localeCompare(b.month));
            });
            const groupedHabits = Object.values(habitsByName).sort((a, b) => b.totalDays - a.totalDays);

            return (
              <div className="space-y-3">
                {/* Summary stats */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{detail.backup.habits.length} habit entries across {new Set(detail.backup.habits.map((h: any) => h.month)).size} months</span>
                  <span>•</span>
                  <span>{groupedHabits.length} unique habits</span>
                </div>

                {groupedHabits.map((group, i) => (
                  <Card key={i} className="p-3 text-sm space-y-2 border-muted">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{group.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {group.totalDays} total days
                      </Badge>
                    </div>
                    {/* Monthly breakdown */}
                    <div className="flex flex-wrap gap-1.5">
                      {group.months.map((m, j) => (
                        <Badge key={j} variant="outline" className="text-[10px] font-normal">
                          {m.month}: {m.days}d
                        </Badge>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            );
          })() : (
            <p className="text-sm text-muted-foreground">No habits data</p>
          )}
        </Card>

        {/* Tasks */}
        <Card className="p-5 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-primary" />
            Tasks ({detail.backup?.tasks?.length || 0})
          </h2>
          {detail.backup?.tasks?.length ? (
            <div className="space-y-2">
              {detail.backup.tasks.map((task: any, i: number) => (
                <Card key={i} className="p-3 text-sm space-y-1 border-muted">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{task.title || task.name || `Task ${i + 1}`}</span>
                    {task.completed !== undefined && (
                      <Badge variant={task.completed ? "default" : "secondary"} className="text-xs">
                        {task.completed ? "Done" : "Pending"}
                      </Badge>
                    )}
                  </div>
                  {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                  {task.date && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{task.date}
                    </p>
                  )}
                  {task.category && (
                    <Badge variant="outline" className="text-[10px]">{task.category}</Badge>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tasks data</p>
          )}
        </Card>

        {/* Backup Info */}
        {detail.backup && (
          <Card className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Database className="w-3 h-3" />
              Backup last synced: {new Date(detail.backup.updated_at).toLocaleString()}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminUserDetail;
