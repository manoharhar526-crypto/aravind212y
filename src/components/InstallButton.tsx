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

  if (!isInstallable) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={async () => {
        const accepted = await install();
        if (accepted) {
          toast.success("App installed successfully!");
        }
      }}
    >
      <Download className="h-4 w-4" />
      Install App
    </Button>
  );
};
