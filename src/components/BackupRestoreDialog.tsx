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
import { Shield, Copy, Download, Upload, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Habit } from "@/types/habit";
import type { Task } from "@/types/task";

interface BackupRestoreDialogProps {
  habits: Habit[];
  tasks: Task[];
  onRestore: (habits: Habit[], tasks: Task[]) => void;
}

const generatePin = (): string => {
  // Generate a 6-digit numeric PIN
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const BackupRestoreDialog = ({
  habits,
  tasks,
  onRestore,
}: BackupRestoreDialogProps) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("backup");
  const [pin, setPin] = useState("");
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [restorePin, setRestorePin] = useState("");

  const handleBackup = async () => {
    setLoading(true);
    try {
      const newPin = generatePin();

      const { error } = await supabase.from("user_backups" as any).insert({
        pin_code: newPin,
        habits: JSON.parse(JSON.stringify(habits)),
        tasks: JSON.parse(JSON.stringify(tasks)),
      } as any);

      if (error) {
        // If PIN collision, retry once
        if (error.code === "23505") {
          const retryPin = generatePin();
          const { error: retryError } = await supabase
            .from("user_backups" as any)
            .insert({
              pin_code: retryPin,
              habits: JSON.parse(JSON.stringify(habits)),
              tasks: JSON.parse(JSON.stringify(tasks)),
            } as any);

          if (retryError) throw retryError;
          setGeneratedPin(retryPin);
        } else {
          throw error;
        }
      } else {
        setGeneratedPin(newPin);
      }

      toast.success("Backup created successfully!");
    } catch (err) {
      console.error("Backup error:", err);
      toast.error("Failed to create backup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBackup = async () => {
    if (!generatedPin) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_backups" as any)
        .update({
          habits: JSON.parse(JSON.stringify(habits)),
          tasks: JSON.parse(JSON.stringify(tasks)),
        } as any)
        .eq("pin_code", generatedPin);

      if (error) throw error;
      toast.success("Backup updated with latest data!");
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Failed to update backup.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (restorePin.length !== 6) {
      toast.error("Please enter a valid 6-digit PIN");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_backups" as any)
        .select("habits, tasks")
        .eq("pin_code", restorePin)
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

  const handleCopyPin = async () => {
    if (!generatedPin) return;
    try {
      await navigator.clipboard.writeText(generatedPin);
      setCopied(true);
      toast.success("PIN copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy. Please copy manually.");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setGeneratedPin(null);
      setCopied(false);
      setRestorePin("");
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
            Save your data with a unique PIN code. Use it to restore your data anytime.
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
            {!generatedPin ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium">What gets backed up:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ {habits.length} habit(s) with all completion data</li>
                    <li>✓ {tasks.length} task(s) with status</li>
                  </ul>
                </div>
                <Button
                  onClick={handleBackup}
                  disabled={loading}
                  className="w-full gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Generate Backup Code
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/50 p-6 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">Your unique backup PIN:</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-mono font-bold tracking-[0.3em]">
                      {generatedPin}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopyPin}
                      className="h-8 w-8"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-destructive font-medium">
                    ⚠️ Save this PIN! You'll need it to restore your data.
                  </p>
                </div>
                <Button
                  onClick={handleUpdateBackup}
                  disabled={loading}
                  variant="outline"
                  className="w-full gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Update Backup with Latest Data
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="restore" className="space-y-4 mt-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter your 6-digit backup PIN to restore your habits and tasks.
              </p>
              <Input
                placeholder="Enter 6-digit PIN..."
                value={restorePin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setRestorePin(val);
                }}
                className="text-center text-xl font-mono tracking-[0.3em]"
                maxLength={6}
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground text-center">
                ⚠️ This will replace your current data
              </p>
              <Button
                onClick={handleRestore}
                disabled={loading || restorePin.length !== 6}
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
