import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Heart, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/auth";
import { register, googleStart } from "../api/Auth";
import login from "../api/login";
import { errorMessage } from "../api/axios";
import { ActionForm, Brand, Feedback, Field, Spinner } from "../components/UI";
const googleErrors = {
  email_exists:
    "An account already uses this email. Sign in with your password, then link Google from My profile.",
  role_required:
    "Choose Pet Owner or Clinic Staff on the registration page before signing up with Google.",
  unverified: "Google must verify your email before you can register.",
  cancelled: "Google sign-in was cancelled.",
  linked: "This Google identity is already linked to another account.",
  link_failed: "Sign in again before linking your Google account.",
  failed: "Google sign-in could not be completed. Please try again.",
};
export default function Auth({ registration = false }) {
  const { user, setUser, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState("client");
  const [googleError, setGoogleError] = useState("");
  const [googleBusy, setGoogleBusy] = useState(false);
  if (loading)
    return (
      <div className="full-screen">
        <Spinner label="Checking your account…" />
      </div>
    );
  if (user) return <Navigate to="/app" replace />;
  const google = async () => {
    setGoogleBusy(true);
    setGoogleError("");
    try {
      await googleStart(registration ? role : null);
    } catch (error) {
      setGoogleError(errorMessage(error));
      setGoogleBusy(false);
    }
  };
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Brand light />
        <div>
          <span className="eyebrow light-text">A HOME FOR EVERY PET STORY</span>
          <h1>
            Good care starts
            <br />
            with knowing
            <br />
            <em>their story.</em>
          </h1>
          <p>
            From their very first record to the little things that matter. Keep
            it all together with PetFave.
          </p>
          <div className="auth-points">
            {[
              "Their health history, beautifully organized",
              "A clearer picture of their wellbeing",
              "Secure access for owners and clinic teams",
            ].map((text) => (
              <div key={text}>
                <span>
                  <Check size={15} />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>
        <div className="auth-story-footer">
          <Heart size={17} /> Made for the ones you call family.
        </div>
      </aside>
      <main className="auth-main">
        <Link className="back-link" to="/">
          <ArrowLeft size={16} /> Back to PetFave
        </Link>
        <div className="auth-form">
          <div className="eyebrow">
            {registration
              ? "LET’S GET TO KNOW YOU"
              : "A LITTLE CARE STARTS HERE"}
          </div>
          <h1>{registration ? "Join the PetFave family." : "Welcome back."}</h1>
          <p>
            {registration
              ? "Create your account and keep every pet story connected."
              : "Sign in to pick up where you and your pets left off."}
          </p>
          {registration && (
            <div className="role-picker" aria-label="Account type">
              {[
                ["client", "Pet Owner", "Care for my pets"],
                ["staff", "Clinic Staff", "Work with pet records"],
              ].map(([value, label, description]) => (
                <button
                  type="button"
                  key={value}
                  className={role === value ? "selected" : ""}
                  onClick={() => setRole(value)}
                >
                  <strong>{label}</strong>
                  <small>{description}</small>
                </button>
              ))}
            </div>
          )}
          <Feedback
            error={googleError || googleErrors[params.get("google_error")]}
          />
          <button
            className="btn google-btn"
            disabled={googleBusy}
            onClick={google}
          >
            <span className="google-g">G</span>
            {googleBusy ? "Connecting…" : "Continue with Google"}
          </button>
          <div className="divider">
            <span>or use your email</span>
          </div>
          <ActionForm
            initial={{
              name: "",
              email: "",
              contact_number: "",
              address: "",
              password: "",
              password_confirmation: "",
            }}
            submitLabel={registration ? "Create account" : "Sign in"}
            onSubmit={(values) =>
              registration
                ? register({ ...values, role })
                : login({ email: values.email, password: values.password })
            }
            onSuccess={(account) => {
              setUser(account);
              navigate("/app", { replace: true });
            }}
          >
            {(values, set) => (
              <>
                {registration && (
                  <Field
                    label="Full name"
                    required
                    autoComplete="name"
                    value={values.name}
                    onChange={(e) => set("name", e.target.value)}
                  />
                )}
                <Field
                  label="Email address"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={values.email}
                  onChange={(e) => set("email", e.target.value)}
                />
                {registration && (
                  <>
                    <Field
                      label="Contact number"
                      type="tel"
                      required
                      maxLength={40}
                      autoComplete="tel"
                      value={values.contact_number}
                      onChange={(e) => set("contact_number", e.target.value)}
                    />
                    <Field
                      label="Address"
                      required
                      autoComplete="street-address"
                      type="textarea"
                      value={values.address}
                      onChange={(e) => set("address", e.target.value)}
                    />
                  </>
                )}
                <Field
                  label="Password"
                  type="password"
                  required
                  minLength={registration ? 10 : undefined}
                  autoComplete={
                    registration ? "new-password" : "current-password"
                  }
                  hint={
                    registration
                      ? "At least 10 characters, including letters and numbers."
                      : undefined
                  }
                  value={values.password}
                  onChange={(e) => set("password", e.target.value)}
                />
                {registration && (
                  <Field
                    label="Confirm password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={values.password_confirmation}
                    onChange={(e) =>
                      set("password_confirmation", e.target.value)
                    }
                  />
                )}
                {registration && role === "staff" && (
                  <p className="inline-note">
                    <ShieldCheck size={17} /> Staff accounts require
                    administrator approval before accessing pet records.
                  </p>
                )}
              </>
            )}
          </ActionForm>
          <p className="auth-switch">
            {registration ? "Already part of the family?" : "New to PetFave?"}{" "}
            <Link to={registration ? "/login" : "/register"}>
              {registration ? "Sign in" : "Create an account"}{" "}
              <ArrowRight size={13} />
            </Link>
          </p>
          <p className="secure-note">
            <ShieldCheck size={14} /> Your information is kept private and
            secure.
          </p>
        </div>
      </main>
    </div>
  );
}
