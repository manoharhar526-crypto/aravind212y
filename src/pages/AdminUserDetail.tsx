import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Loader2, Key, Pencil, Shield, User, Mail,
  Clock, Calendar, CheckCircle2, ListTodo, Database,
  Save, X, Eye, EyeOff, Lock, Trash2, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Habit } from "@/types/habit";
import { Task } from "@/types/task";
import { HabitGrid } from "@/components/HabitGrid";
import { StatsOverview } from "@/components/StatsOverview";
import { CompletionLineChart } from "@/components/charts/CompletionLineChart";
import { HabitPieChart } from "@/components/charts/HabitPieChart";
import { HabitBarChart } from "@/components/charts/HabitBarChart";
import { IndividualHabitChart } from "@/components/charts/IndividualHabitChart";
import { TaskCompletionChart } from "@/components/charts/TaskCompletionChart";
import { TaskProgressChart } from "@/components/charts/TaskProgressChart";
import { HabitReportCard } from "@/components/HabitReportCard";
import { TaskReportCard } from "@/components/TaskReportCard";
import { GoalsOverview } from "@/components/GoalsOverview";
import { DailyTasksView } from "@/components/DailyTasksView";
import { getMonthName, getMonthKey, getHabitsForMonth } from "@/lib/habitUtils";

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
  const [viewMonth, setViewMonth] = useState<Date>(new Date());

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

  // Parse backup data into typed arrays for the user-facing components
  const allHabits: Habit[] = (detail.backup?.habits || []).map((h: any) => ({
    id: h.id || Math.random().toString(36).slice(2),
    name: h.name || "Unnamed",
    month: h.month || getMonthKey(viewMonth),
    completedDays: Array.isArray(h.completedDays) ? h.completedDays : [],
  }));

  const allTasks: Task[] = (detail.backup?.tasks || []).map((t: any) => ({
    id: t.id || Math.random().toString(36).slice(2),
    title: t.title || t.name || "Untitled",
    completed: !!t.completed,
    type: t.type || "general",
    day: t.day,
    weekNumber: t.weekNumber,
  }));

  const currentMonthHabits = getHabitsForMonth(allHabits, viewMonth);

  // Get all unique months from habits to show available months
  const availableMonths = [...new Set(allHabits.map(h => h.month))].sort();

  // No-op handlers for read-only view
  const noop = () => {};

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
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

        {/* User Data View — Same as user sees it */}
        {detail.backup ? (
          <div className="space-y-6">
            {/* Month navigation */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">User Data</h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-medium min-w-32 text-center text-sm">
                  {getMonthName(viewMonth)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Available months quick nav */}
            {availableMonths.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {availableMonths.map(m => (
                  <Badge
                    key={m}
                    variant={getMonthKey(viewMonth) === m ? "default" : "outline"}
                    className="text-xs cursor-pointer"
                    onClick={() => {
                      const [y, mo] = m.split("-").map(Number);
                      setViewMonth(new Date(y, mo - 1, 1));
                    }}
                  >
                    {m}
                  </Badge>
                ))}
              </div>
            )}

            <Tabs defaultValue="habits" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-3 mb-4">
                <TabsTrigger value="habits" className="text-xs sm:text-sm">Habits</TabsTrigger>
                <TabsTrigger value="goals" className="text-xs sm:text-sm">Goals</TabsTrigger>
                <TabsTrigger value="reports" className="text-xs sm:text-sm">Reports</TabsTrigger>
              </TabsList>

              <TabsContent value="habits" className="space-y-6">
                {/* Stats */}
                <StatsOverview habits={currentMonthHabits} currentMonth={viewMonth} />

                {/* Habit Grid */}
                <Card className="overflow-hidden border-border">
                  <div className="p-3 border-b border-border">
                    <h3 className="font-semibold text-sm">
                      Monthly Tracking Grid ({currentMonthHabits.length} habits)
                    </h3>
                  </div>
                  <HabitGrid
                    habits={currentMonthHabits}
                    tasks={allTasks}
                    currentMonth={viewMonth}
                    onToggleDay={noop}
                    onDeleteHabit={noop}
                  />
                  {currentMonthHabits.length === 0 && (
                    <p className="text-sm text-muted-foreground p-4">No habits for this month</p>
                  )}
                </Card>

                {/* Charts */}
                {currentMonthHabits.length > 0 && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <CompletionLineChart habits={currentMonthHabits} currentMonth={viewMonth} />
                    <HabitPieChart habits={currentMonthHabits} currentMonth={viewMonth} />
                    <HabitBarChart habits={currentMonthHabits} currentMonth={viewMonth} />
                    <IndividualHabitChart habits={currentMonthHabits} currentMonth={viewMonth} />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="goals" className="space-y-6">
                <GoalsOverview
                  tasks={allTasks}
                  currentMonth={viewMonth}
                  onToggleTask={noop}
                  onAddTask={noop}
                  onDeleteTask={noop}
                />
                <DailyTasksView
                  tasks={allTasks}
                  currentMonth={viewMonth}
                  onToggleTask={noop}
                  onAddTask={noop}
                  onDeleteTask={noop}
                />
              </TabsContent>

              <TabsContent value="reports" className="space-y-6">
                <HabitReportCard habits={currentMonthHabits} currentMonth={viewMonth} />
                <TaskReportCard tasks={allTasks} />
                <div className="grid md:grid-cols-2 gap-4">
                  <TaskCompletionChart tasks={allTasks} />
                  <TaskProgressChart tasks={allTasks} currentMonth={viewMonth} />
                </div>
              </TabsContent>
            </Tabs>

            {/* Backup Info */}
            <Card className="p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Database className="w-3 h-3" />
                Backup last synced: {new Date(detail.backup.updated_at).toLocaleString()}
              </p>
            </Card>
          </div>
        ) : (
          <Card className="p-6 text-center text-muted-foreground">
            <p>No backup data available for this user</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminUserDetail;
