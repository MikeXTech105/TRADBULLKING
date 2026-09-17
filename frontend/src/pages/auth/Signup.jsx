import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  FormHelperText,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { ArrowRight, UserPlus } from "lucide-react";
import AuthLayout from "../../components/AuthLayout";
import PasswordField from "../../components/PasswordField";
import { signupUser, validateSignup } from "../../services/authService";
export default function Signup() {
  const navigate = useNavigate();
  const busy = useRef(false);
  const [values, setValues] = useState({
    name: "",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const change = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
    setError("");
  };
  async function submit(e) {
    e.preventDefault();
    if (busy.current) return;
    const next = validateSignup(values);
    setErrors(next);
    if (Object.keys(next).length) return;
    busy.current = true;
    setSubmitting(true);
    try {
      await signupUser(values);
      navigate("/login", { replace: true, state: { signupSuccess: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  }
  return (
    <AuthLayout signup>
      <div className="form-symbol">
        <UserPlus size={23} />
      </div>
      <span className="form-eyebrow">YOUR NEXT CHAPTER</span>
      <h2>Create your account.</h2>
      <p className="form-description">Start your TRADBULLKING journey.</p>
      <form onSubmit={submit} noValidate>
        <div className="fields">
          <TextField
            label="Full Name"
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={change}
            error={Boolean(errors.name)}
            helperText={errors.name}
          />
          <div className="field-row">
            <TextField
              label="Mobile Number"
              name="mobile"
              type="tel"
              autoComplete="tel"
              value={values.mobile}
              onChange={change}
              error={Boolean(errors.mobile)}
              helperText={errors.mobile}
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={change}
              error={Boolean(errors.email)}
              helperText={errors.email}
            />
          </div>
          <PasswordField
            label="Password"
            name="password"
            autoComplete="new-password"
            value={values.password}
            onChange={change}
            error={errors.password}
            helperText={errors.password || "At least 6 characters"}
          />
          <PasswordField
            label="Confirm Password"
            name="confirmPassword"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={change}
            error={errors.confirmPassword}
          />
        </div>
        <div className="terms-row">
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={values.terms}
                onChange={(e) => {
                  setValues({ ...values, terms: e.target.checked });
                  setErrors({ ...errors, terms: "" });
                }}
                inputProps={{ "aria-label": "Accept Terms & Conditions" }}
              />
            }
            label="I agree to the"
          />
          <button
            type="button"
            className="text-button"
            onClick={() => setTermsOpen(true)}
          >
            Terms & Conditions
          </button>
        </div>
        {errors.terms && <FormHelperText error>{errors.terms}</FormHelperText>}
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
          {submitting ? "Creating account…" : "Create Account"}
        </Button>
      </form>
      <p className="switch-form">
        Already have an account? <Link to="/login">Login</Link>
      </p>
      <div className="demo-note">
        Demo signup only · Accounts are not saved yet
      </div>
      <Dialog open={termsOpen} onClose={() => setTermsOpen(false)}>
        <DialogTitle>Terms & Conditions — Demo preview</DialogTitle>
        <DialogContent>
          This frontend is an authentication prototype. Signup validates your
          details but does not create a persistent account. Passwords are not
          stored. Use the development demo account to sign in. Final service
          terms will be provided before launch.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTermsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </AuthLayout>
  );
}
