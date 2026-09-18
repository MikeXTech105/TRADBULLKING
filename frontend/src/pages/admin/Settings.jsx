import { useRef, useState } from "react";
import { Alert, Button, TextField } from "@mui/material";
import { adminService } from "../../services/adminService";
import { errorMessage } from "../../services/api";
import PasswordField from "../../components/PasswordField";
import Profile from "../user/Profile";
export default function Settings() {
  const lock = useRef(false);
  const [values, setValues] = useState({
    clientId: "",
    password: "",
    totp: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (lock.current) return;
    if (!/^\d{6}$/.test(values.totp.trim())) {
      setError("Enter a 6-digit authenticator code.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await adminService.angelSession({
        clientId: values.clientId.trim() || undefined,
        password: values.password || undefined,
        totp: values.totp.trim(),
      });
      setSuccess(
        "AngelOne session initialized. Check Dashboard for connection status.",
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setValues((previous) => ({ ...previous, password: "", totp: "" }));
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Profile admin />
      <section className="surface angel-session">
        <div className="section-heading">
          <h2>AngelOne session</h2>
          <span>Market data provider</span>
        </div>
        <p className="subtle-label">
          Initialize the server-managed market data connection. Credentials are
          submitted directly and are never saved in browser storage.
        </p>
        <form onSubmit={submit} noValidate>
          <div className="fields">
            <TextField
              label="Client ID (optional)"
              value={values.clientId}
              onChange={(e) =>
                setValues({ ...values, clientId: e.target.value })
              }
              autoComplete="off"
            />
            <PasswordField
              label="Provider Password (optional)"
              value={values.password}
              onChange={(e) =>
                setValues({ ...values, password: e.target.value })
              }
              autoComplete="off"
            />
            <TextField
              label="Authenticator TOTP"
              inputProps={{ inputMode: "numeric", maxLength: 6 }}
              value={values.totp}
              onChange={(e) => setValues({ ...values, totp: e.target.value })}
              autoComplete="off"
            />
          </div>
          {error && (
            <Alert severity="error" className="form-alert">
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" className="form-alert">
              {success}
            </Alert>
          )}
          <Button
            className="admin-submit"
            type="submit"
            variant="contained"
            disabled={busy}
          >
            {busy ? "Connecting…" : "Initialize session"}
          </Button>
        </form>
      </section>
    </>
  );
}
