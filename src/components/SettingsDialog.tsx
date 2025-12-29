import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings, Bell, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  requestNotificationPermission,
  sendNotification,
  getNotificationStatus,
} from "@/lib/notificationUtils";

interface SettingsDialogProps {
  onResetData: () => void;
  reminderEnabled: boolean;
  reminderTime: string;
  onReminderEnabledChange: (enabled: boolean) => void;
  onReminderTimeChange: (time: string) => void;
}

export const SettingsDialog = ({
  onResetData,
  reminderEnabled,
  reminderTime,
  onReminderEnabledChange,
  onReminderTimeChange,
}: SettingsDialogProps) => {
  const [notificationStatus, setNotificationStatus] = useState(getNotificationStatus());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setNotificationStatus(getNotificationStatus());
  }, [open]);

  const handleEnableReminders = async () => {
    const granted = await requestNotificationPermission();
    setNotificationStatus(getNotificationStatus());

    if (granted) {
      onReminderEnabledChange(true);
      toast.success("Reminders enabled!");
      sendNotification("Habit Tracker", "Reminders are now enabled!");
    } else {
      toast.error("Please allow notifications in your browser settings");
    }
  };

  const handleToggleReminder = (checked: boolean) => {
    if (checked && notificationStatus !== "granted") {
      handleEnableReminders();
    } else {
      onReminderEnabledChange(checked);
    }
  };

  const handleTestNotification = () => {
    if (notificationStatus === "granted") {
      sendNotification("Test Reminder", "Don't forget to check your habits today!");
      toast.success("Test notification sent!");
    } else {
      toast.error("Enable notifications first");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure reminders and manage your data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Reminders Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Daily Reminders</h3>
            </div>

            {notificationStatus === "unsupported" ? (
              <p className="text-sm text-muted-foreground">
                Your browser doesn't support notifications
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="reminder-toggle" className="text-sm">
                    Enable daily reminder
                  </Label>
                  <Switch
                    id="reminder-toggle"
                    checked={reminderEnabled}
                    onCheckedChange={handleToggleReminder}
                  />
                </div>

                {reminderEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Label htmlFor="reminder-time" className="text-sm min-w-24">
                        Reminder time
                      </Label>
                      <Input
                        id="reminder-time"
                        type="time"
                        value={reminderTime}
                        onChange={(e) => onReminderTimeChange(e.target.value)}
                        className="w-32"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestNotification}
                      className="w-full"
                    >
                      Test Notification
                    </Button>
                  </div>
                )}

                {notificationStatus === "denied" && (
                  <p className="text-sm text-destructive">
                    Notifications are blocked. Please enable them in browser settings.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Reset Data Section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              <h3 className="font-medium">Reset Data</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              This will permanently delete all your habits, tasks, and settings.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  Reset All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all
                    your habits, tasks, and settings from this device.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onResetData();
                      setOpen(false);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Reset Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
