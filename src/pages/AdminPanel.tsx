import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ArrowLeft, Pencil, Trash2, Key, Shield } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserData {
  user_id: string;
  username: string;
  created_at: string;
  updated_at: string;
  roles: string[];
}

const AdminPanel = ({ onBack }: { onBack: () => void }) => {
  const { signOut } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPassword, setEditingPassword] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage", {
        body: { action: "list_users" },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Failed to fetch users");
        return;
      }
      setUsers(data.users || []);
    } catch {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdatePassword = async (userId: string) => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage", {
        body: { action: "update_password", target_user_id: userId, new_password: newPassword },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Failed to update password");
        return;
      }
      toast.success("Password updated");
      setEditingPassword(null);
      setNewPassword("");
    } catch {
      toast.error("Failed to update password");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUsername = async (userId: string) => {
    if (!newUsername.trim() || /\s/.test(newUsername)) {
      toast.error("Username cannot be empty or contain spaces");
      return;
    }
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage", {
        body: { action: "update_username", target_user_id: userId, new_username: newUsername },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Failed to update username");
        return;
      }
      toast.success("Username updated");
      setEditingUsername(null);
      setNewUsername("");
      fetchUsers();
    } catch {
      toast.error("Failed to update username");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage", {
        body: { action: "delete_user", target_user_id: userId },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Failed to delete user");
        return;
      }
      toast.success("User deleted");
      fetchUsers();
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    onBack();
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
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
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No users found</p>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <Card key={user.user_id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">{user.username}</span>
                      {user.roles.includes("admin") && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingUsername(editingUsername === user.user_id ? null : user.user_id);
                        setNewUsername(user.username);
                        setEditingPassword(null);
                      }}
                      title="Edit username"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingPassword(editingPassword === user.user_id ? null : user.user_id);
                        setNewPassword("");
                        setEditingUsername(null);
                      }}
                      title="Change password"
                    >
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
                              This will permanently delete this user and all their data. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteUser(user.user_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
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
                      <Input
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value.replace(/\s/g, ""))}
                        maxLength={30}
                        className="text-sm"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateUsername(user.user_id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                )}

                {editingPassword === user.user_id && (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">New Password</Label>
                      <Input
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        maxLength={128}
                        placeholder="Min 6 characters"
                        className="text-sm"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleUpdatePassword(user.user_id)}
                      disabled={actionLoading}
                    >
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
