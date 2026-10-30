import { roleLabel } from "../utils/format";
import { useState } from "react";
import { Clock3, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/auth";
import { completeProfile, googleStart } from "../api/Auth";
import { errorMessage } from "../api/axios";
import {
  ActionForm,
  Badge,
  Brand,
  Feedback,
  Field,
  PageHeading,
} from "../components/UI";
export function ProfileForm({ onSuccess }) {
  const { user, setUser } = useAuth();
  return (
    <ActionForm
      initial={{
        name: user.name,
        contact_number: user.contact_number || "",
        address: user.address || "",
      }}
      onSubmit={completeProfile}
      onSuccess={(account) => {
        setUser(account);
        onSuccess?.();
      }}
    >
      {(v, set) => (
        <>
          <Field
            label="Full name"
            autoComplete="name"
            required
            value={v.name}
            onChange={(e) => set("name", e.target.value)}
          />
          <Field
            label="Contact number"
            type="tel"
            autoComplete="tel"
            required
            maxLength={40}
            value={v.contact_number}
            onChange={(e) => set("contact_number", e.target.value)}
          />
          <Field
            label="Address"
            type="textarea"
            autoComplete="street-address"
            required
            value={v.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </>
      )}
    </ActionForm>
  );
}
export function AccountStatus() {
  const { user, refresh, logout } = useAuth();
  const [error, setError] = useState("");
  const incomplete = !user.profile_complete && user.enabled;
  return (
    <div className="status-page">
      <Brand />
      <div className="status-card">
        <span className="status-icon">
          {incomplete ? <ShieldCheck size={30} /> : <Clock3 size={30} />}
        </span>
        <Badge tone={user.approval_status === "rejected" ? "red" : "amber"}>
          {!user.enabled
            ? "Account disabled"
            : incomplete
              ? "One more step"
              : user.approval_status}
        </Badge>
        <h1>
          {!user.enabled
            ? "Your account is unavailable."
            : incomplete
              ? "Complete your profile."
              : user.approval_status === "rejected"
                ? "Application not approved."
                : "You’re on the waiting list."}
        </h1>
        <p>
          {incomplete
            ? "Add your contact number and address to continue. Staff applications also need administrator approval."
            : !user.enabled
              ? "Contact your clinic administrator for help with your account."
              : user.approval_status === "rejected"
                ? "Your administrator has reviewed your staff application."
                : "An administrator will review your staff application. Pet and owner records will be available once you’re approved."}
        </p>
        {user.approval_note && <blockquote>{user.approval_note}</blockquote>}
        <Feedback error={error} />
        {incomplete && <ProfileForm />}
        <div className="status-actions">
          <button className="btn secondary" onClick={refresh}>
            <RefreshCw size={16} /> Check status
          </button>
          <button
            className="btn text-btn"
            onClick={async () => {
              try {
                await logout();
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
export default function Profile() {
  const { user } = useAuth();
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  return (
    <>
      <PageHeading eyebrow="YOUR ACCOUNT" title="A little about you.">
        Keep your contact information up to date.
      </PageHeading>
      <div className="profile-grid">
        <section className="panel">
          <h2>Contact details</h2>
          <Feedback success={success} />
          <ProfileForm
            onSuccess={() => setSuccess("Your profile has been updated.")}
          />
        </section>
        <aside className="panel profile-aside">
          <span className="user-avatar big">{user.name[0]}</span>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <Badge>{roleLabel(user.role)}</Badge>
          <hr />
          <h3>Google sign-in</h3>
          <p>
            Link your Google identity while signed in to this account. Use the
            same verified email address.
          </p>
          <Feedback error={error} />
          <button
            className="btn secondary"
            onClick={async () => {
              try {
                await googleStart(null);
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            Link Google account
          </button>
        </aside>
      </div>
    </>
  );
}
