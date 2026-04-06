import { Download, CheckCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { toast } from "sonner";

export const InstallButton = () => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  if (isInstalled) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2 opacity-60">
        <CheckCircle className="h-4 w-4" />
        Installed
      </Button>
    );
  }

  const handleInstall = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        toast.success("App installed successfully!");
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

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleInstall}
    >
      {isInstallable ? <Download className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
      Install App
    </Button>
  );
};