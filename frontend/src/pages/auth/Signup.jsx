import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Checkbox, FormHelperText, TextField } from "@mui/material";
import { ArrowRight, UserPlus } from "lucide-react";
import AuthLayout from "../../components/AuthLayout";
import PasswordField from "../../components/PasswordField";
import { SlowNotice } from "../../components/Feedback";
import {
  signupFailure,
  signupUser,
  validateSignup,
} from "../../services/authService";
import { normalizeUserName } from "../../utils/identity";
import { toastError, toastSuccess } from "../../services/toastService";
import {
  clearSignupDraft,
  readSignupDraft,
  saveSignupDraft,
} from "../../services/signupDraft";
export default function Signup() {
  const navigate = useNavigate();
  const busy = useRef(false);
  const fieldRefs = useRef({});
  const [values, setValues] = useState(() => {
    const draft = readSignupDraft();
    return {
      name: draft.name || "",
      userName: draft.userName || "",
      email: draft.email || "",
      phone: draft.phone || "",
      password: "",
      confirmPassword: "",
      referralCode: draft.referralCode || "",
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
      const failure = signupFailure(err);
      setErrors((previous) => ({ ...previous, ...failure.fieldErrors }));
      const input = fieldRefs.current[failure.focus];
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      toastError(failure.message, { id: "account-created" });
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
          <TextField
            label="Username"
            name="userName"
            required
            autoComplete="username"
            placeholder="Choose a unique username"
            value={values.userName}
            onChange={change}
            onBlur={() =>
              setValues((previous) => ({
                ...previous,
                userName: normalizeUserName(previous.userName),
              }))
            }
            inputRef={(input) => {
              fieldRefs.current.userName = input;
            }}
            error={Boolean(errors.userName)}
            helperText={
              errors.userName ||
              "Your public identity · 3–30 lowercase letters, numbers, or underscores"
            }
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={values.email}
            onChange={change}
            inputRef={(input) => {
              fieldRefs.current.email = input;
            }}
            error={Boolean(errors.email)}
            helperText={errors.email}
          />
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
          <TextField
            label="Referral Code (optional)"
            name="referralCode"
            autoComplete="off"
            value={values.referralCode}
            onChange={change}
            error={Boolean(errors.referralCode)}
            helperText={errors.referralCode}
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
    </AuthLayout>
  );
}
