import { useEffect, useState } from "react";
import { Edit3, Link2, Plus, Search } from "lucide-react";
import { listOwners, saveOwner, linkOwner } from "../api/ownerProfiles";
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
  Spinner,
} from "../components/UI";
export default function Owners() {
  const { user } = useAuth();
  const admin = user.role === "administrator";
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modal, setModal] = useState(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        listOwners({ search, page }, controller.signal)
          .then((data) => {
            if (active) {
              setResult(data);
              setError("");
            }
          })
          .catch((e) => {
            if (active) setError(errorMessage(e));
          }),
      200,
    );
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [search, page, version]);
  const done = (message) => {
    setModal(null);
    setSuccess(message);
    setVersion((v) => v + 1);
  };
  return (
    <>
      <PageHeading
        eyebrow="THE PEOPLE BEHIND THE PAWS"
        title="Pet owners."
        action={
          admin && (
            <button
              className="btn primary"
              onClick={() => setModal({ type: "owner" })}
            >
              <Plus size={17} /> Register owner
            </button>
          )
        }
      >
        Basic owner information, linked to the pets they care for.
      </PageHeading>
      <Feedback error={error} success={success} />
      <div className="filter-bar">
        <label className="search-box">
          <Search size={18} />
          <input
            placeholder="Search owners by name…"
            aria-label="Search owners"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <span className="result-count">{result?.total ?? "—"} owners</span>
      </div>
      {!result && !error ? (
        <Spinner />
      ) : result?.data.length ? (
        <section className="panel table-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Contact details</th>
                  <th>Address</th>
                  <th>Account</th>
                  {admin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {result.data.map((owner) => (
                  <tr key={owner.id}>
                    <td>
                      <strong>{owner.name}</strong>
                      <small className="table-note">Owner #{owner.id}</small>
                    </td>
                    <td>
                      {owner.contact_number}
                      <small className="table-note">
                        {owner.email || "No email recorded"}
                      </small>
                    </td>
                    <td className="address-cell">{owner.address}</td>
                    <td>
                      <Badge tone={owner.user_id ? "" : "gray"}>
                        {owner.user_id
                          ? "Linked #" + owner.user_id
                          : "No login account"}
                      </Badge>
                    </td>
                    {admin && (
                      <td>
                        <div className="table-actions">
                          <button
                            className="icon-btn"
                            title="Edit owner"
                            aria-label={"Edit " + owner.name}
                            onClick={() => setModal({ type: "owner", owner })}
                          >
                            <Edit3 size={17} />
                          </button>
                          {!owner.user_id && (
                            <button
                              className="icon-btn"
                              title="Link verified account"
                              aria-label={"Link account for " + owner.name}
                              onClick={() => setModal({ type: "link", owner })}
                            >
                              <Link2 size={17} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={result} onChange={setPage} />
        </section>
      ) : (
        !error && (
          <Empty title="No owners found.">
            Administrators can register owner details even before an owner
            creates an account.
          </Empty>
        )
      )}
      {modal?.type === "owner" && (
        <Modal
          title={
            modal.owner ? "Edit owner information" : "Register a pet owner"
          }
          onClose={() => setModal(null)}
        >
          <p className="form-intro">
            This records basic owner information. A login account can be linked
            later after verification.
          </p>
          <ActionForm
            initial={{
              name: modal.owner?.name || "",
              email: modal.owner?.email || "",
              contact_number: modal.owner?.contact_number || "",
              address: modal.owner?.address || "",
            }}
            onCancel={() => setModal(null)}
            onSubmit={(values) =>
              saveOwner(modal.owner?.id, {
                ...values,
                email: values.email || null,
              })
            }
            onSuccess={() => done("Owner information saved.")}
          >
            {(v, set) => (
              <>
                <Field
                  label="Full name"
                  required
                  maxLength={150}
                  value={v.name}
                  onChange={(e) => set("name", e.target.value)}
                />
                <Field
                  label="Email (contact only)"
                  type="email"
                  value={v.email}
                  onChange={(e) => set("email", e.target.value)}
                  hint="Changing this contact email does not change the login identity."
                />
                <Field
                  label="Contact number"
                  type="tel"
                  required
                  maxLength={40}
                  value={v.contact_number}
                  onChange={(e) => set("contact_number", e.target.value)}
                />
                <Field
                  label="Address"
                  type="textarea"
                  required
                  maxLength={2000}
                  value={v.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </>
            )}
          </ActionForm>
        </Modal>
      )}
      {modal?.type === "link" && (
        <Modal
          title="Link a verified client account"
          onClose={() => setModal(null)}
        >
          <p className="form-intro">
            Link {modal.owner.name} to an existing client account only after
            verifying their identity. Email matches alone do not establish
            ownership. An account with existing ownership history cannot be
            relinked here.
          </p>
          <ActionForm
            initial={{ user_id: "", verification_reference: "" }}
            submitLabel="Confirm verified link"
            onCancel={() => setModal(null)}
            onSubmit={(values) => linkOwner(modal.owner.id, values)}
            onSuccess={() => done("Verified owner account linked.")}
          >
            {(v, set) => (
              <>
                <Field
                  label="Client account ID"
                  type="number"
                  required
                  min={1}
                  hint="Find the account ID in Accounts & approvals."
                  value={v.user_id}
                  onChange={(e) => set("user_id", Number(e.target.value))}
                />
                <Field
                  label="Identity verification reference"
                  required
                  minLength={5}
                  maxLength={255}
                  value={v.verification_reference}
                  onChange={(e) =>
                    set("verification_reference", e.target.value)
                  }
                />
              </>
            )}
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
