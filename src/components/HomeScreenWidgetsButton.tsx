import { useState } from "react";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Capacitor } from "@capacitor/core";

/**
 * Button + dialog explaining how to put Habitracker widgets/shortcuts
 * on the home screen on both PWA installs and the native Android app.
 */
export const HomeScreenWidgetsButton = ({ compact = false }: { compact?: boolean }) => {
  const [open, setOpen] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button variant="outline" size="icon" className="h-8 w-8" title="Home-screen widgets">
            <LayoutGrid className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5">
            <LayoutGrid className="w-4 h-4" />
            <span>Widgets</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Home-Screen Widgets</DialogTitle>
          <DialogDescription>
            Access Habitracker without opening the app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {isNative ? (
            <>
              <p className="font-medium">📱 Native App — 16 widgets available</p>
              <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                <li>Long-press an empty area of your home screen.</li>
                <li>Tap <b>Widgets</b>.</li>
                <li>Scroll to <b>Habitracker</b>.</li>
                <li>Drag any of the 16 widgets to your home screen.</li>
              </ol>
              <ul className="text-xs text-muted-foreground list-disc pl-5">
                <li>Today's Habits, Tasks, Streak, Progress, Note</li>
                <li>Monthly Grid, Skip Days, Analytics, Calendar</li>
                <li>All-Time Stats, Habit & Task Reports, Quick Open</li>
              </ul>
            </>
          ) : (
            <>
              <p className="font-medium">🌐 Installed Web App — 6 quick shortcuts</p>
              <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                <li>Install Habitracker to your home screen first.</li>
                <li>Long-press the Habitracker app icon.</li>
                <li>Pick any shortcut: Monthly Grid, Skip Days, Analytics, Calendar, All-Time Stats, Habit Report.</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                For full home-screen widgets (live data tiles like Google Calendar), install the Android app version.
                Browser-installed PWAs only support shortcuts, not live widgets.
              </p>
            </>
          )}
        </div>

        <Button onClick={() => setOpen(false)} className="w-full">Got it</Button>
      </DialogContent>
    </Dialog>
  );
};
