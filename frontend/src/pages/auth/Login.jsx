import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
} from "@mui/material";
import { ArrowRight, LogIn } from "lucide-react";
import AuthLayout from "../../components/AuthLayout";
import PasswordField from "../../components/PasswordField";
import { SlowNotice } from "../../components/Feedback";
import {
  loginUser,
  loginAdmin,
  validateLogin,
} from "../../services/authService";
import { errorMessage } from "../../services/api";
export default function Login({ admin = false }) {
  const navigate = useNavigate();
  const busy = useRef(false);
  const [values, setValues] = useState({
    email: "",
    password: "",
    remember: false,
  });
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
    const next = validateLogin(values);
    setErrors(next);
    if (Object.keys(next).length) return;
    busy.current = true;
    setSubmitting(true);
    setError("");
    try {
      await (admin ? loginAdmin : loginUser)(values);
      navigate(admin ? "/admin/dashboard" : "/dashboard", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  }
  return (
    <AuthLayout admin={admin}>
      <div className="form-symbol">
        <LogIn size={23} />
      </div>
      <span className="form-eyebrow">
        {admin ? "TRADBULLKING ADMIN" : "WELCOME TO TRADBULLKING"}
      </span>
      <h2>{admin ? "Administrator login." : "Welcome back."}</h2>
      <p className="form-description">
        {admin
          ? "Sign in with your administrator account."
          : "Your market. Your next move."}
      </p>
      <form onSubmit={submit} noValidate>
        <div className="fields">
          <TextField
            label={admin ? "Admin Email" : "Email"}
            name="email"
            type="email"
            required
            value={values.email}
            onChange={change}
            autoComplete="username"
            error={Boolean(errors.email)}
            helperText={errors.email}
          />
          <PasswordField
            label="Password"
            name="password"
            required
            value={values.password}
            onChange={change}
            autoComplete="current-password"
            error={errors.password}
          />
        </div>
        {!admin && (
          <div className="form-options">
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={values.remember}
                  onChange={(e) =>
                    setValues({ ...values, remember: e.target.checked })
                  }
                />
              }
              label="Remember me"
            />
          </div>
        )}
        {error && (
          <Alert severity="error" className="form-alert">
            {error}
          </Alert>
        )}
        <SlowNotice busy={submitting} />
        <Button
          className={admin ? "admin-submit" : ""}
          fullWidth
          type="submit"
          variant="contained"
          disabled={submitting}
          endIcon={<ArrowRight size={18} />}
        >
          {submitting ? "Signing in…" : "Login"}
        </Button>
      </form>
      {!admin && (
        <p className="switch-form">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>
      )}
      {admin && (
        <div className="access-note">
          <p>
            Reserved for authorized administrators.
            <br />
            Account access is verified by TRADBULLKING.
          </p>
        </div>
      )}
      <div className="demo-note">Paper trading. Real market perspective.</div>
    </AuthLayout>
  );
}
