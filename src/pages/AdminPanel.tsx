import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  Loader2, ArrowLeft, Pencil, Trash2, Key, Shield, Eye, X,
  Database, Calendar, CheckCircle2, ListTodo, Search,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface UserData {
  user_id: string;
  username: string;
  created_at: string;
  updated_at: string;
  roles: string[];
}

interface UserDetail {
  profile: any;
  backup: { habits: any[]; tasks: any[]; updated_at: string } | null;
  email: string | null;
  last_sign_in: string | null;
}

const AdminPanel = ({ onBack }: { onBack: () => void }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPassword, setEditingPassword] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const [viewingUser, setViewingUser] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const adminAction = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-manage", { body });
    if (error || data?.error) throw new Error(data?.error || "Request failed");
    return data;
  }, []);

  const fetchUsers = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const data = await adminAction({ action: "list_users" });
      setUsers(data.users || []);
    } catch {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [adminAction]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const viewUserData = async (userId: string) => {
    setViewingUser(userId);
    setDetailLoading(true);
    try {
      const data = await adminAction({ action: "get_user_data", target_user_id: userId });
      setUserDetail(data);
    } catch {
      toast.error("Failed to load user data");
      setViewingUser(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdatePassword = async (userId: string) => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setActionLoading(true);
    try {
      await adminAction({ action: "update_password", target_user_id: userId, new_password: newPassword });
      toast.success("Password updated");
      setEditingPassword(null);
      setNewPassword("");
    } catch (e: any) {
      toast.error(e.message || "Failed to update password");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUsername = async (userId: string) => {
    if (!newUsername.trim() || /\s/.test(newUsername)) { toast.error("Invalid username"); return; }
    setActionLoading(true);
    try {
      await adminAction({ action: "update_username", target_user_id: userId, new_username: newUsername });
      toast.success("Username updated");
      setEditingUsername(null);
      // Optimistic local update instead of refetching
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, username: newUsername.trim() } : u));
      setNewUsername("");
    } catch (e: any) {
      toast.error(e.message || "Failed to update username");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setActionLoading(true);
    try {
      await adminAction({ action: "delete_user", target_user_id: userId });
      toast.success("User deleted");
      // Optimistic local removal instead of refetching
      setUsers(prev => prev.filter(u => u.user_id !== userId));
    } catch (e: any) {
      toast.error(e.message || "Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => { await signOut(); onBack(); };

  const getUsernameForId = (id: string) => users.find(u => u.user_id === id)?.username || "User";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Admin Panel</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">{users.length} users</Badge>
            <Button variant="outline" size="sm" onClick={() => fetchUsers()} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        {/* Users List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            {searchQuery ? "No users match your search" : "No users found"}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <Card key={user.user_id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">{user.username}</span>
                      {user.roles.includes("admin") && (
                        <Badge variant="default" className="text-xs">Admin</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/user/${user.user_id}`)} title="View full profile">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingUsername(editingUsername === user.user_id ? null : user.user_id);
                      setNewUsername(user.username);
                      setEditingPassword(null);
                    }} title="Edit username">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingPassword(editingPassword === user.user_id ? null : user.user_id);
                      setNewPassword("");
                      setEditingUsername(null);
                    }} title="Change password">
                      <Key className="w-4 h-4" />
                    </Button>
                    {!user.roles.includes("admin") && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Delete user">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {user.username}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this user and all their data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(user.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>

                {editingUsername === user.user_id && (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">New Username</Label>
                      <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value.replace(/\s/g, ""))} maxLength={30} className="text-sm" />
                    </div>
                    <Button size="sm" onClick={() => handleUpdateUsername(user.user_id)} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                )}

                {editingPassword === user.user_id && (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">New Password</Label>
                      <Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} maxLength={128} placeholder="Min 6 characters" className="text-sm" />
                    </div>
                    <Button size="sm" onClick={() => handleUpdatePassword(user.user_id)} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
