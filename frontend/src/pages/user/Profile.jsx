import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Alert,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { LogOut, KeyRound, Download, CheckCircle2 } from "lucide-react";
import {
  getProfile,
  updateProfile,
  changePassword,
  logoutUser,
  logoutAdmin,
} from "../../services/authService";
import { errorMessage } from "../../services/api";
import { PageHeader, StatCards } from "../../components/DataView";
import { Notice, SlowNotice } from "../../components/Feedback";
import PasswordField from "../../components/PasswordField";
import InstallAppPrompt from "../../components/InstallAppPrompt";
import { usePWAInstall } from "../../hooks/usePWAInstall";
import { formatDate } from "../../utils/format";
export default function Profile({ admin = false }) {
  const role = admin ? "admin" : "user";
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth[role]);
  const lock = useRef(false);
  const [values, setValues] = useState({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [open, setOpen] = useState(false);
  const [passwords, setPasswords] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [installOpen, setInstallOpen] = useState(false);
  const pwa = usePWAInstall();
  useEffect(() => {
    setValues({ name: user?.name ?? "", phone: user?.phone ?? "" });
  }, [user?.name, user?.phone]);
  async function save(e) {
    e.preventDefault();
    if (lock.current) return;
    const next = {};
    if (!values.name.trim()) next.name = "Enter your name.";
    if (values.phone && !/^\+?[\d\s-]{10,17}$/.test(values.phone))
      next.phone = "Enter a valid phone number.";
    setErrors(next);
    if (Object.keys(next).length) return;
    lock.current = true;
    setBusy(true);
    try {
      await updateProfile(values, role);
      setNotice({ message: "Profile updated." });
    } catch (err) {
      setNotice({ message: errorMessage(err), severity: "error" });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function passwordSubmit(e) {
    e.preventDefault();
    if (lock.current) return;
    if (
      !passwords.oldPassword ||
      passwords.newPassword.length < 6 ||
      passwords.newPassword !== passwords.confirmPassword
    ) {
      setPasswordError(
        "Enter your current password and matching new passwords of at least 6 characters.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setPasswordError("");
    try {
      await changePassword(passwords, role);
      setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setOpen(false);
      setNotice({ message: "Password changed successfully." });
    } catch (err) {
      setPasswordError(errorMessage(err));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title={admin ? "Administrator account" : "Account"}
        description="Your details. Your trading identity."
        action={
          <Button
            variant="outlined"
            disabled={busy}
            startIcon={<LogOut size={16} />}
            onClick={() => {
              (admin ? logoutAdmin : logoutUser)();
              navigate(admin ? "/admin/login" : "/login", { replace: true });
            }}
          >
            Logout
          </Button>
        }
      />
      <StatCards
        data={user}
        fields={[
          ["dummyBalance", "Dummy balance"],
          ["feeBalance", "Fee balance"],
          ["totalPnl", "Total P&L", "pnl"],
          ["totalTrades", "Total trades", "number"],
        ]}
      />
      <div className="profile-grid">
        {!admin && (
          <section className="surface account-shortcuts">
            <h2>Your account</h2>
            {[
              ["/membership", "Trial & membership"],
              ["/wallet", "Balances"],
              ["/payments", "Payments"],
              ["/portfolio", "Portfolio"],
              ["/orders", "Orders"],
              ["/dashboard", "Overview"],
            ].map(([to, label]) => (
              <Link key={to} to={to}>
                {label}
                <span aria-hidden="true">›</span>
              </Link>
            ))}
          </section>
        )}
        <section className="surface">
          <div className="section-heading">
            <h2>Personal details</h2>
            <span>{user?.role}</span>
          </div>
          <form onSubmit={save} noValidate>
            <div className="fields">
              <TextField
                label="Full name"
                value={values.name}
                onChange={(e) => setValues({ ...values, name: e.target.value })}
                error={Boolean(errors.name)}
                helperText={errors.name}
              />
              <TextField
                label="Email"
                value={user?.email ?? ""}
                disabled
                helperText="Email cannot be changed."
              />
              <TextField
                label="Phone"
                type="tel"
                value={values.phone}
                onChange={(e) =>
                  setValues({ ...values, phone: e.target.value })
                }
                error={Boolean(errors.phone)}
                helperText={errors.phone}
              />
            </div>
            <SlowNotice busy={busy} />
            <Button
              className="admin-submit"
              type="submit"
              variant="contained"
              disabled={busy}
            >
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </section>
        <section className="surface">
          <div className="section-heading">
            <h2>Account & access</h2>
          </div>
          <dl className="detail-list">
            <div>
              <dt>Membership</dt>
              <dd>
                {user?.isPremium === true
                  ? "Premium"
                  : user?.isPremium === false
                    ? "Standard"
                    : "—"}
              </dd>
            </div>
            <div>
              <dt>Trial</dt>
              <dd>
                {user?.isTrialActive === true
                  ? "Active"
                  : user?.isTrialActive === false
                    ? "Ended"
                    : "—"}
              </dd>
            </div>
            <div>
              <dt>Trial ends</dt>
              <dd>{formatDate(user?.trialEndDate)}</dd>
            </div>
            <div>
              <dt>Trading access</dt>
              <dd>
                {user?.canTrade === true
                  ? "Available"
                  : user?.canTrade === false
                    ? "Unavailable"
                    : "—"}
              </dd>
            </div>
          </dl>
          <Button
            onClick={() => {
              setPasswords({
                oldPassword: "",
                newPassword: "",
                confirmPassword: "",
              });
              setPasswordError("");
              setOpen(true);
            }}
            startIcon={<KeyRound size={16} />}
          >
            Change password
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              try {
                await getProfile(role);
                setNotice({ message: "Account refreshed." });
              } catch (err) {
                setNotice({ severity: "error", message: errorMessage(err) });
              }
            }}
          >
            Refresh account
          </Button>
          {!admin && pwa.status !== "unsupported" && (
            <Button
              disabled={pwa.status === "installed"}
              startIcon={
                pwa.status === "installed" ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Download size={16} />
                )
              }
              onClick={() => setInstallOpen(true)}
            >
              {pwa.status === "installed"
                ? "App Installed"
                : "Install TRADBULLKING App"}
            </Button>
          )}
        </section>
      </div>
      <Dialog
        open={open}
        onClose={
          busy
            ? undefined
            : () => {
                setOpen(false);
                setPasswords({
                  oldPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                });
              }
        }
        fullWidth
        maxWidth="xs"
      >
        <form onSubmit={passwordSubmit}>
          <DialogTitle>Change password</DialogTitle>
          <DialogContent>
            <div className="fields dialog-fields">
              {[
                ["oldPassword", "Current Password"],
                ["newPassword", "New Password"],
                ["confirmPassword", "Confirm New Password"],
              ].map(([name, label]) => (
                <PasswordField
                  key={name}
                  label={label}
                  value={passwords[name]}
                  autoComplete={
                    name === "oldPassword" ? "current-password" : "new-password"
                  }
                  onChange={(e) =>
                    setPasswords({ ...passwords, [name]: e.target.value })
                  }
                />
              ))}
            </div>
            {passwordError && (
              <Alert severity="error" className="form-alert">
                {passwordError}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setPasswords({
                  oldPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      {!admin && (
        <InstallAppPrompt
          open={installOpen}
          variant={pwa.isIos ? "ios" : "android"}
          onClose={() => setInstallOpen(false)}
          onDismiss={() => setInstallOpen(false)}
          onInstall={async () => {
            await pwa.install();
            setInstallOpen(false);
          }}
        />
      )}
      <Notice notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
