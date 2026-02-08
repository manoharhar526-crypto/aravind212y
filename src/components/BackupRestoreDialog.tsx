import { useState } from "react";
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
import { Shield, Download, Upload, Loader2, AlertCircle } from "lucide-react";
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
  const [pinError, setPinError] = useState("");

  const handleBackup = async () => {
    const pin = backupPin.trim();
    if (pin.length < 4) {
      setPinError("PIN must be at least 4 characters");
      return;
    }

    setLoading(true);
    setPinError("");
    try {
      // Check if this PIN already exists
      const { data: existing, error: checkError } = await supabase
        .from("user_backups" as any)
        .select("id")
        .eq("pin_code", pin)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        // PIN exists — update the backup
        const { error: updateError } = await supabase
          .from("user_backups" as any)
          .update({
            habits: JSON.parse(JSON.stringify(habits)),
            tasks: JSON.parse(JSON.stringify(tasks)),
          } as any)
          .eq("pin_code", pin);

        if (updateError) throw updateError;
        toast.success("Backup updated successfully!");
      } else {
        // New PIN — create backup
        const { error: insertError } = await supabase
          .from("user_backups" as any)
          .insert({
            pin_code: pin,
            habits: JSON.parse(JSON.stringify(habits)),
            tasks: JSON.parse(JSON.stringify(tasks)),
          } as any);

        if (insertError) throw insertError;
        toast.success("Backup created successfully!");
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
      const { data, error } = await supabase
        .from("user_backups" as any)
        .select("habits, tasks")
        .eq("pin_code", pin)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error("No backup found for this PIN. Please check and try again.");
        return;
      }

      const restoredData = data as any;
      const restoredHabits = restoredData.habits as Habit[];
      const restoredTasks = restoredData.tasks as Task[];

      onRestore(restoredHabits, restoredTasks);
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

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setBackupPin("");
      setRestorePin("");
      setPinError("");
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
            Choose a unique PIN to save and restore your data across devices.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="backup" className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Backup
            </TabsTrigger>
            <TabsTrigger value="restore" className="gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              Restore
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
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Your unique PIN</label>
                <Input
                  placeholder="Enter your PIN (min 4 chars)..."
                  value={backupPin}
                  onChange={(e) => {
                    setBackupPin(e.target.value);
                    setPinError("");
                  }}
                  className="text-center text-lg font-mono tracking-wider"
                />
                {pinError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {pinError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Use the same PIN to update your backup anytime. Remember it to restore later.
                </p>
              </div>
              <Button
                onClick={handleBackup}
                disabled={loading || backupPin.trim().length < 4}
                className="w-full gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Save Backup
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="restore" className="space-y-4 mt-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter your backup PIN to restore your habits and tasks.
              </p>
              <Input
                placeholder="Enter your PIN..."
                value={restorePin}
                onChange={(e) => setRestorePin(e.target.value)}
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
