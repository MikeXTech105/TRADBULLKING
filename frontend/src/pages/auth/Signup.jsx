import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Checkbox, FormHelperText, TextField } from "@mui/material";
import { ArrowRight, UserPlus } from "lucide-react";
import AuthLayout from "../../components/AuthLayout";
import PasswordField from "../../components/PasswordField";
import { SlowNotice } from "../../components/Feedback";
import { signupUser, validateSignup } from "../../services/authService";
import { errorMessage } from "../../services/api";
import { toastError, toastSuccess } from "../../services/toastService";
import {
  clearSignupDraft,
  readSignupDraft,
  saveSignupDraft,
} from "../../services/signupDraft";
export default function Signup() {
  const navigate = useNavigate();
  const busy = useRef(false);
  const [values, setValues] = useState(() => {
    const draft = readSignupDraft();
    return {
    name: draft.name || "",
    email: draft.email || "",
    phone: draft.phone || "",
    password: "",
    confirmPassword: "",
    acceptedTerms: draft.acceptedTerms === true,
    };
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const change = (e) => {
    const { name, value } = e.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
  };
  const preserveSafeDraft = () => {
    saveSignupDraft(values);
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
      clearSignupDraft();
      toastSuccess("Account created successfully.", { id: "account-created" });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message = errorMessage(err, "Unable to create account.");
      toastError(message, { id: "account-created" });
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
      <span className="form-eyebrow">BUILD YOUR TRADING EDGE</span>
      <h2>Create your account.</h2>
      <p className="form-description">
        Practice with purpose. Start your free trial.
      </p>
      <form onSubmit={submit} noValidate>
        <div className="fields">
          <TextField
            label="Full Name"
            name="name"
            required
            autoComplete="name"
            value={values.name}
            onChange={change}
            error={Boolean(errors.name)}
            helperText={errors.name}
          />
          <div className="field-row">
            <TextField
              label="Phone (optional)"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={values.phone}
              onChange={change}
              error={Boolean(errors.phone)}
              helperText={errors.phone}
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              required
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
            required
            autoComplete="new-password"
            value={values.password}
            onChange={change}
            error={errors.password}
            helperText={errors.password || "At least 6 characters"}
          />
          <PasswordField
            label="Confirm Password"
            name="confirmPassword"
            required
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={change}
            error={errors.confirmPassword}
          />
        </div>
        <div
          className={`terms-consent ${errors.acceptedTerms ? "has-error" : ""}`}
        >
          <Checkbox
            id="accepted-terms"
            checked={values.acceptedTerms}
            onChange={(e) => {
              const checked = e.target.checked;
              setValues((previous) => ({
                ...previous,
                acceptedTerms: checked,
              }));
              setErrors((previous) => ({
                ...previous,
                acceptedTerms: "",
              }));
            }}
            inputProps={{
              "aria-labelledby": "accepted-terms-label",
              "aria-describedby": errors.acceptedTerms
                ? "accepted-terms-error"
                : undefined,
            }}
          />
          <div>
            <span id="accepted-terms-label" className="terms-consent-label">
              I have read and agree to the{" "}
              <Link
                to="/terms-and-conditions"
                state={{ from: "/signup" }}
                onClick={preserveSafeDraft}
              >
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link
                to="/privacy-policy"
                state={{ from: "/signup" }}
                onClick={preserveSafeDraft}
              >
                Privacy Policy
              </Link>
              .
            </span>
            {errors.acceptedTerms && (
              <FormHelperText error id="accepted-terms-error">
                {errors.acceptedTerms}
              </FormHelperText>
            )}
          </div>
        </div>
        <SlowNotice busy={submitting} />
        <Button
          className="admin-submit"
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
        Paper trading only · No real securities are purchased
      </div>
    </AuthLayout>
  );
}
