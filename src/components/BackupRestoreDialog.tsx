import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Download, Upload, Loader2, AlertCircle, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Habit } from "@/types/habit";
import type { Task } from "@/types/task";

interface BackupRestoreDialogProps {
  habits: Habit[];
  tasks: Task[];
  onRestore: (habits: Habit[], tasks: Task[]) => void;
}

export const BackupRestoreDialog = ({
  habits,
  tasks,
  onRestore,
}: BackupRestoreDialogProps) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("backup");
  const [loading, setLoading] = useState(false);
  const [backupPin, setBackupPin] = useState("");
  const [restorePin, setRestorePin] = useState("");
  const [deletePin, setDeletePin] = useState("");
  const [pinError, setPinError] = useState("");
  const [hasBackup, setHasBackup] = useState(false);
  const [checkingBackup, setCheckingBackup] = useState(false);
  const [pinAvailable, setPinAvailable] = useState<boolean | null>(null);
  const [checkingPin, setCheckingPin] = useState(false);

  const callBackupManager = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("backup-manager", {
      body,
    });

    if (error) {
      throw new Error(error.message || "Request failed");
    }

    return data;
  };

  const checkBackupStatus = async () => {
    setCheckingBackup(true);
    try {
      const result = await callBackupManager({ action: "check" });
      setHasBackup(result.hasBackup);
    } catch {
      // Ignore
    } finally {
      setCheckingBackup(false);
    }
  };

  useEffect(() => {
    if (open) {
      checkBackupStatus();
    }
  }, [open]);

  const checkPinAvailability = async (pin: string) => {
    if (pin.length < 4) {
      setPinAvailable(null);
      return;
    }
    setCheckingPin(true);
    try {
      const result = await callBackupManager({ action: "check-pin-available", pin });
      setPinAvailable(result.available);
    } catch {
      setPinAvailable(null);
    } finally {
      setCheckingPin(false);
    }
  };

  const handlePinChange = (value: string) => {
    setBackupPin(value);
    setPinError("");
    setPinAvailable(null);
    if (value.trim().length >= 4) {
      const timeoutId = setTimeout(() => checkPinAvailability(value.trim()), 500);
      return () => clearTimeout(timeoutId);
    }
  };

  const handleBackup = async () => {
    const pin = backupPin.trim();
    if (pin.length < 4) {
      setPinError("PIN must be at least 4 characters");
      return;
    }
    if (pinAvailable === false) {
      setPinError("This PIN is already taken");
      return;
    }

    setLoading(true);
    setPinError("");
    try {
      const result = await callBackupManager({
        action: "backup",
        pin,
        habits: JSON.parse(JSON.stringify(habits)),
        tasks: JSON.parse(JSON.stringify(tasks)),
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          result.message === "Backup updated"
            ? "Backup updated successfully!"
            : "Backup created with your unique PIN!"
        );
        setHasBackup(true);
      }
    } catch (err) {
      console.error("Backup error:", err);
      toast.error("Failed to save backup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    const pin = restorePin.trim();
    if (pin.length < 4) {
      toast.error("Please enter a valid PIN (at least 4 characters)");
      return;
    }

    setLoading(true);
    try {
      const result = await callBackupManager({ action: "restore", pin });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      onRestore(result.habits as Habit[], result.tasks as Task[]);
      toast.success("Data restored successfully!");
      setOpen(false);
      setRestorePin("");
    } catch (err) {
      console.error("Restore error:", err);
      toast.error("Failed to restore data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const pin = deletePin.trim();
    if (pin.length < 4) {
      toast.error("Please enter your PIN to confirm deletion");
      return;
    }

    setLoading(true);
    try {
      const result = await callBackupManager({ action: "delete", pin });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Backup deleted successfully!");
      setHasBackup(false);
      setDeletePin("");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete backup.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setBackupPin("");
      setRestorePin("");
      setDeletePin("");
      setPinError("");
      setPinAvailable(null);
      setTab("backup");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Shield className="w-4 h-4" />
          <span className="hidden sm:inline">Backup</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Backup & Restore
          </DialogTitle>
          <DialogDescription>
            Choose a unique PIN (like a username) to save and restore your data across devices.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="backup" className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Backup
            </TabsTrigger>
            <TabsTrigger value="restore" className="gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              Restore
            </TabsTrigger>
            <TabsTrigger value="manage" className="gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              Manage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="backup" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium">What gets backed up:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ {habits.length} habit(s) with all completion data</li>
                  <li>✓ {tasks.length} task(s) with status</li>
                </ul>
                {hasBackup && (
                  <p className="text-xs text-primary font-medium mt-2">
                    ✓ You already have a backup. Saving will update it.
                  </p>
                )}
                {savedPin && hasBackup && (
                  <div className="mt-2 p-2 rounded bg-background border border-border">
                    <p className="text-xs text-muted-foreground">Your saved PIN:</p>
                    <p className="text-sm font-mono font-bold tracking-wider text-foreground">{savedPin}</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {hasBackup && savedPin ? "Your PIN (locked)" : hasBackup ? "Your PIN (enter to update)" : "Choose a unique PIN"}
                </label>
                <div className="relative">
                  <Input
                    placeholder="Enter your PIN (min 4 chars)..."
                    value={backupPin}
                    onChange={(e) => handlePinChange(e.target.value)}
                    maxLength={64}
                    readOnly={!!(hasBackup && savedPin)}
                    className="text-center text-lg font-mono tracking-wider pr-10"
                  />
                  {backupPin.trim().length >= 4 && !hasBackup && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingPin ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : pinAvailable === true ? (
                        <Check className="w-4 h-4 text-primary" />
                      ) : pinAvailable === false ? (
                        <X className="w-4 h-4 text-destructive" />
                      ) : null}
                    </div>
                  )}
                </div>
                {pinError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {pinError}
                  </p>
                )}
                {pinAvailable === false && !pinError && !hasBackup && (
                  <p className="text-xs text-destructive">This PIN is already taken by another user</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {hasBackup && savedPin
                    ? "Your PIN is locked. Use the Manage tab to delete and create a new one."
                    : "Your PIN is unique to you — like a username. Remember it to restore your data on any device."}
                </p>
              </div>
              <Button
                onClick={handleBackup}
                disabled={loading || backupPin.trim().length < 4 || pinAvailable === false}
                className="w-full gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {hasBackup ? "Update Backup" : "Save Backup"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="restore" className="space-y-4 mt-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter your unique backup PIN to restore your habits and tasks.
              </p>
              <Input
                placeholder="Enter your PIN..."
                value={restorePin}
                onChange={(e) => setRestorePin(e.target.value)}
                maxLength={64}
                className="text-center text-lg font-mono tracking-wider"
              />
              <p className="text-xs text-muted-foreground text-center">
                ⚠️ This will replace your current data
              </p>
              <Button
                onClick={handleRestore}
                disabled={loading || restorePin.trim().length < 4}
                className="w-full gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Restore Data
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="manage" className="space-y-4 mt-4">
            <div className="space-y-3">
              {checkingBackup ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : hasBackup ? (
                <>
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <p className="text-sm font-medium text-primary">✓ You have a backup saved</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter your PIN below to permanently delete your backup.
                    </p>
                  </div>
                  <Input
                    placeholder="Enter your PIN to confirm..."
                    value={deletePin}
                    onChange={(e) => setDeletePin(e.target.value)}
                    maxLength={64}
                    className="text-center text-lg font-mono tracking-wider"
                  />
                  <Button
                    onClick={handleDelete}
                    disabled={loading || deletePin.trim().length < 4}
                    variant="destructive"
                    className="w-full gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete Backup
                  </Button>
                </>
              ) : (
                <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">No backup found. Create one first in the Backup tab.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
