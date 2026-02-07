import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, PlusCircle } from "lucide-react";

interface CopyHabitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previousMonthName: string;
  currentMonthName: string;
  previousHabitNames: string[];
  onCopy: () => void;
  onSkip: () => void;
}

export const CopyHabitsDialog = ({
  open,
  onOpenChange,
  previousMonthName,
  currentMonthName,
  previousHabitNames,
  onCopy,
  onSkip,
}: CopyHabitsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Up {currentMonthName}</DialogTitle>
          <DialogDescription>
            You had {previousHabitNames.length} habit{previousHabitNames.length !== 1 ? "s" : ""} in {previousMonthName}. Would you like to keep the same habits?
          </DialogDescription>
        </DialogHeader>

        {previousHabitNames.length > 0 && (
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Previous habits:</p>
            {previousHabitNames.map((name, i) => (
              <div key={i} className="text-sm text-foreground">• {name}</div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={onCopy} className="gap-2">
            <Copy className="w-4 h-4" />
            Yes, copy habits
          </Button>
          <Button variant="outline" onClick={onSkip} className="gap-2">
            <PlusCircle className="w-4 h-4" />
            No, I'll add new ones
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
