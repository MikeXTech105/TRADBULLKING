import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import { Maximize2, Share, SquarePlus, X, Zap } from "lucide-react";

function InstallSheetHeader({ ios, onClose }) {
  return (
    <div className="sheet-header">
      <span className="install-sheet-title">
        <img
          src="/icons/icon-192.png"
          width={36}
          height={36}
          alt=""
          className="install-sheet-icon"
        />
        {ios ? "Add TRADBULLKING to your Home Screen" : "Install TRADBULLKING"}
      </span>
      <IconButton aria-label="Close" onClick={onClose}>
        <X size={17} />
      </IconButton>
    </div>
  );
}

function InstallSheetBody({ ios, onInstall, onDismiss }) {
  return (
    <div className="sheet-body install-sheet-body">
      {ios ? (
        <>
          <p>Install TRADBULLKING for a full-screen app experience.</p>
          <ol className="install-steps">
            <li>
              <Share size={16} />
              Tap the Share icon in Safari
            </li>
            <li>
              <SquarePlus size={16} />
              Choose &ldquo;Add to Home Screen&rdquo;
            </li>
            <li>
              <Zap size={16} />
              Tap &ldquo;Add&rdquo;
            </li>
          </ol>
          <Button
            variant="contained"
            fullWidth
            className="order-submit buy"
            onClick={onDismiss}
          >
            Got It
          </Button>
        </>
      ) : (
        <>
          <p>
            Trade faster with an app-like experience directly from your Home
            Screen.
          </p>
          <ul className="install-benefits">
            <li>
              <Maximize2 size={15} /> Full-screen experience
            </li>
            <li>
              <Zap size={15} /> One-tap access
            </li>
            <li>
              <SquarePlus size={15} /> App icon on Home Screen
            </li>
          </ul>
          <div className="install-actions">
            <Button variant="outlined" onClick={onDismiss}>
              Not Now
            </Button>
            <Button
              variant="contained"
              className="order-submit buy"
              onClick={onInstall}
            >
              Install App
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function InstallAppPrompt({
  open,
  variant = "android",
  onInstall,
  onDismiss,
  onClose,
}) {
  const ios = variant === "ios";
  const mobile = useMediaQuery("(max-width: 767px)");
  if (mobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        className="order-sheet install-sheet"
        slotProps={{ paper: { className: "mobile-bottom-sheet" } }}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <InstallSheetHeader ios={ios} onClose={onClose} />
        <InstallSheetBody ios={ios} onInstall={onInstall} onDismiss={onDismiss} />
      </Drawer>
    );
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      className="order-sheet install-sheet"
    >
      <DialogTitle sx={{ p: 0 }}>
        <InstallSheetHeader ios={ios} onClose={onClose} />
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <InstallSheetBody ios={ios} onInstall={onInstall} onDismiss={onDismiss} />
      </DialogContent>
    </Dialog>
  );
}
