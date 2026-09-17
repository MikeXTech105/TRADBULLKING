import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  Snackbar,
  TextField,
} from "@mui/material";
import { ArrowRight, LogIn } from "lucide-react";
import AuthLayout from "../../components/AuthLayout";
import PasswordField from "../../components/PasswordField";
import { loginUser, validateLogin } from "../../services/authService";
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const busy = useRef(false);
  const [values, setValues] = useState({
    identifier: "",
    password: "",
    remember: false,
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(
    location.state?.signupSuccess
      ? "Signup complete in demo mode. Sign in with the demo user account."
      : "",
  );
  const change = (event) => {
    setValues({ ...values, [event.target.name]: event.target.value });
    setErrors({ ...errors, [event.target.name]: "" });
    setError("");
  };
  async function submit(event) {
    event.preventDefault();
    if (busy.current) return;
    const next = validateLogin(values);
    setErrors(next);
    if (Object.keys(next).length) return;
    busy.current = true;
    setSubmitting(true);
    setError("");
    try {
      await loginUser(values);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  }
  return (
    <AuthLayout>
      <div className="form-symbol">
        <LogIn size={23} />
      </div>
      <span className="form-eyebrow">WELCOME TO TRADBULLKING</span>
      <h2>Welcome back.</h2>
      <p className="form-description">Sign in to take your next step.</p>
      <form onSubmit={submit} noValidate>
        <div className="fields">
          <TextField
            label="Email or Mobile Number"
            name="identifier"
            value={values.identifier}
            onChange={change}
            autoComplete="username"
            error={Boolean(errors.identifier)}
            helperText={errors.identifier}
          />
          <PasswordField
            label="Password"
            name="password"
            value={values.password}
            onChange={change}
            autoComplete="current-password"
            error={errors.password}
          />
        </div>
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
          <button
            className="text-button"
            type="button"
            onClick={() =>
              setNotice(
                "Password recovery will be available when backend authentication is connected.",
              )
            }
          >
            Forgot password?
          </button>
        </div>
        {error && (
          <Alert severity="error" className="form-alert">
            {error}
          </Alert>
        )}
        <Button
          fullWidth
          type="submit"
          variant="contained"
          disabled={submitting}
          endIcon={<ArrowRight size={18} />}
        >
          {submitting ? "Signing in…" : "Login"}
        </Button>
      </form>
      <p className="switch-form">
        Don't have an account? <Link to="/signup">Sign Up</Link>
      </p>
      <div className="demo-note">
        Authentication preview · Backend connection coming soon
      </div>
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={6500}
        onClose={() => {
          setNotice("");
          if (location.state?.signupSuccess)
            navigate("/login", { replace: true, state: null });
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={location.state?.signupSuccess ? "success" : "info"}
          onClose={() => setNotice("")}
        >
          {notice}
        </Alert>
      </Snackbar>
    </AuthLayout>
  );
}
