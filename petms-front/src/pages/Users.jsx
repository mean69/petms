import { roleLabel } from "../utils/format";
import { useEffect, useState } from "react";
import { Check, Edit3, ShieldCheck, X } from "lucide-react";
import { listUsers, updateUser, decideStaff } from "../api/staffApprovals";
import { errorMessage } from "../api/axios";
import { useAuth } from "../context/auth";
import {
  ActionForm,
  Badge,
  Empty,
  Feedback,
  Field,
  Modal,
  PageHeading,
  Pagination,
  Select,
  Spinner,
} from "../components/UI";
export default function Users() {
  const { user } = useAuth();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [modal, setModal] = useState(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    listUsers(page, controller.signal)
      .then((data) => {
        if (active) {
          setResult(data);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [page, version]);
  const done = () => {
    setModal(null);
    setSuccess("Account updated. This action is recorded in the activity log.");
    setVersion((v) => v + 1);
  };
  return (
    <>
      <PageHeading eyebrow="A TRUSTED TEAM" title="Accounts & approvals.">
        Review staff applications and manage role permissions.
      </PageHeading>
      <Feedback error={error} success={success} />
      <div className="permission-note">
        <ShieldCheck size={21} />
        <p>
          <strong>Clear roles. Thoughtful access.</strong> Administrators manage
          access. Approved staff maintain clinic records. Clients access only
          their own pets.
        </p>
      </div>
      {!result && !error ? (
        <Spinner />
      ) : result?.data.length ? (
        <section className="panel table-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Role</th>
                  <th>Application</th>
                  <th>Access</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <strong>{account.name}</strong>
                      <small className="table-note">
                        {account.email} · ID #{account.id}
                      </small>
                    </td>
                    <td>{roleLabel(account.role)}</td>
                    <td>
                      <Badge
                        tone={
                          account.approval_status === "approved"
                            ? ""
                            : account.approval_status === "pending"
                              ? "amber"
                              : "red"
                        }
                      >
                        {account.approval_status}
                      </Badge>
                      {!account.profile_complete && (
                        <small className="table-note">Profile incomplete</small>
                      )}
                    </td>
                    <td>{account.enabled ? "Enabled" : "Disabled"}</td>
                    <td>
                      {account.id === user.id ? (
                        <small>Current account</small>
                      ) : (
                        <div className="table-actions">
                          {account.role === "staff" &&
                            account.approval_status !== "approved" && (
                              <>
                                <button
                                  className="btn secondary small"
                                  aria-label={"Approve " + account.name}
                                  onClick={() =>
                                    setModal({
                                      type: "decision",
                                      account,
                                      status: "approved",
                                    })
                                  }
                                >
                                  <Check size={14} /> Approve
                                </button>
                                {account.approval_status !== "rejected" && (
                                  <button
                                    className="icon-btn danger-text"
                                    aria-label={"Reject " + account.name}
                                    onClick={() =>
                                      setModal({
                                        type: "decision",
                                        account,
                                        status: "rejected",
                                      })
                                    }
                                  >
                                    <X size={16} />
                                  </button>
                                )}
                              </>
                            )}
                          <button
                            className="icon-btn"
                            aria-label={"Manage " + account.name}
                            onClick={() => setModal({ type: "edit", account })}
                          >
                            <Edit3 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={result} onChange={setPage} />
        </section>
      ) : (
        !error && <Empty title="No accounts found." />
      )}
      {modal?.type === "decision" && (
        <Modal
          title={
            modal.status === "approved"
              ? "Approve staff application"
              : "Reject staff application"
          }
          onClose={() => setModal(null)}
        >
          <p className="form-intro">
            Review {modal.account.name}’s credentials before confirming.
            Contact: {modal.account.contact_number || "Not completed"} ·{" "}
            {modal.account.address || "Address not completed"}.
          </p>
          <ActionForm
            initial={{ note: "" }}
            submitLabel={
              modal.status === "approved"
                ? "Confirm approval"
                : "Confirm rejection"
            }
            onCancel={() => setModal(null)}
            onSubmit={(v) =>
              decideStaff(modal.account.id, { ...v, status: modal.status })
            }
            onSuccess={done}
          >
            {(v, set) => (
              <Field
                label="Review note"
                required
                minLength={5}
                type="textarea"
                maxLength={2000}
                value={v.note}
                onChange={(e) => set("note", e.target.value)}
                hint="This note is visible to the applicant."
              />
            )}
          </ActionForm>
        </Modal>
      )}
      {modal?.type === "edit" && (
        <Modal
          title="Manage account permissions"
          onClose={() => setModal(null)}
        >
          <ActionForm
            initial={{
              name: modal.account.name,
              role: modal.account.role,
              enabled: modal.account.enabled,
              reason: "",
            }}
            onCancel={() => setModal(null)}
            onSubmit={(v) => updateUser(modal.account.id, v)}
            onSuccess={done}
          >
            {(v, set) => (
              <>
                <Field
                  label="Full name"
                  required
                  value={v.name}
                  onChange={(e) => set("name", e.target.value)}
                />
                <Select
                  label="Assigned role"
                  value={v.role}
                  onChange={(e) => set("role", e.target.value)}
                >
                  {["administrator", "staff", "client"].map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </Select>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={v.enabled}
                    onChange={(e) => set("enabled", e.target.checked)}
                  />{" "}
                  Account enabled
                </label>
                <Field
                  label="Reason for change"
                  type="textarea"
                  required
                  minLength={5}
                  maxLength={2000}
                  value={v.reason}
                  onChange={(e) => set("reason", e.target.value)}
                />
              </>
            )}
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
