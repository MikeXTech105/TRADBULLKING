import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, TextField } from "@mui/material";
import { ArrowRight, ShieldCheck } from "lucide-react";
import AuthLayout from "../../components/AuthLayout";
import PasswordField from "../../components/PasswordField";
import { loginAdmin, validateLogin } from "../../services/authService";
export default function AdminLogin() {
  const navigate = useNavigate();
  const busy = useRef(false);
  const [values, setValues] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const change = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
    setError("");
  };
  async function submit(e) {
    e.preventDefault();
    if (busy.current) return;
    const next = validateLogin(values, true);
    setErrors(next);
    if (Object.keys(next).length) return;
    busy.current = true;
    setSubmitting(true);
    setError("");
    try {
      await loginAdmin(values);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  }
  return (
    <AuthLayout admin>
      <div className="form-symbol">
        <ShieldCheck size={23} />
      </div>
      <span className="form-eyebrow">TRADBULLKING ADMIN</span>
      <h2>Administrator login.</h2>
      <p className="form-description">
        Sign in with your administrator account.
      </p>
      <form onSubmit={submit} noValidate>
        <div className="fields">
          <TextField
            label="Admin Email"
            name="identifier"
            type="email"
            autoComplete="username"
            value={values.identifier}
            onChange={change}
            error={Boolean(errors.identifier)}
            helperText={errors.identifier}
          />
          <PasswordField
            label="Password"
            name="password"
            autoComplete="current-password"
            value={values.password}
            onChange={change}
            error={errors.password}
          />
        </div>
        {error && (
          <Alert severity="error" className="form-alert">
            {error}
          </Alert>
        )}
        <Button
          className="admin-submit"
          fullWidth
          type="submit"
          variant="contained"
          disabled={submitting}
          endIcon={<ArrowRight size={18} />}
        >
          {submitting ? "Signing in…" : "Login"}
        </Button>
      </form>
      <div className="access-note">
        <ShieldCheck size={18} />
        <p>
          Access is reserved for authorized administrators.
          <br />
          Contact your team for account assistance.
        </p>
      </div>
      <div className="demo-note">
        Authentication preview · Backend connection coming soon
      </div>
    </AuthLayout>
  );
}
