import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { toast } from "sonner";

const BANNER_DISMISSED_KEY = "install_banner_dismissed";

export const InstallBanner = () => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Show banner if not installed and not previously dismissed (within 7 days)
    const dismissedAt = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      // Re-show after 7 days
      if (elapsed > 7 * 24 * 60 * 60 * 1000) {
        setDismissed(false);
      }
    } else {
      setDismissed(false);
    }
  }, []);

  if (isInstalled || dismissed) return null;

  const handleInstall = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        toast.success("App installed successfully!");
        setDismissed(true);
      }
    } else {
      const ua = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(ua);
      const isAndroid = /Android/.test(ua);

      if (isIOS) {
        toast.info("Tap the Share button (⬆) at the bottom of Safari, then tap 'Add to Home Screen'.", { duration: 6000 });
      } else if (isAndroid) {
        toast.info("Tap the menu (⋮) in Chrome, then tap 'Install app' or 'Add to Home Screen'.", { duration: 6000 });
      } else {
        toast.info("In your browser menu, look for 'Install app' or 'Add to Home Screen'.", { duration: 6000 });
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(BANNER_DISMISSED_KEY, Date.now().toString());
  };

  return (
    <div className="w-full bg-primary text-primary-foreground px-4 py-2.5 flex items-center justify-between gap-3 animate-in slide-in-from-top duration-300 z-50">
      <div className="flex items-center gap-2 min-w-0">
        {isInstallable ? (
          <Download className="h-4 w-4 shrink-0" />
        ) : (
          <Smartphone className="h-4 w-4 shrink-0" />
        )}
        <span className="text-sm font-medium truncate">
          Install HabitTracker for a better experience!
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="secondary"
          className="h-7 px-3 text-xs font-semibold"
          onClick={handleInstall}
        >
          Install
        </Button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
