import { dateLabel } from "../utils/format";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import { listCorrections, resolveCorrection } from "../api/correctionRequests";
import { getPet, references } from "../api/pets";
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
import HealthFields from "../components/HealthForm";
import { cleanHealth, healthInitial } from "../utils/health";
export default function Corrections() {
  const { user } = useAuth();
  const admin = user.role === "administrator";
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modal, setModal] = useState(null);
  const [loadingReview, setLoadingReview] = useState(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    listCorrections(page, controller.signal)
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
  const review = async (request) => {
    setLoadingReview(request.id);
    try {
      const [pet, refs] = await Promise.all([
        getPet(request.pet_id),
        references(),
      ]);
      const record =
        request.target_type === "ownership"
          ? null
          : pet[
              {
                weight: "weights",
                medical: "medical_history",
                allergy: "allergies",
                vaccination: "vaccinations",
              }[request.target_type]
            ].find(
              (r) =>
                r.id ===
                request[
                  {
                    weight: "weight_record_id",
                    medical: "medical_entry_id",
                    allergy: "allergy_record_id",
                    vaccination: "vaccination_record_id",
                  }[request.target_type]
                ],
            );
      setModal({ request, record, vaccines: refs.vaccines });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoadingReview(null);
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="GETTING THE DETAILS RIGHT"
        title="Correction requests."
      >
        {admin
          ? "Review requested changes and keep the record accurate."
          : "Your clinic administrator reviews each request. Submit new requests from a pet’s record."}
      </PageHeading>
      <Feedback error={error} success={success} />
      {!result && !error ? (
        <Spinner />
      ) : result?.data.length ? (
        <section className="panel">
          <div className="request-list">
            {result.data.map((request) => (
              <article className="request-card" key={request.id}>
                <div className="request-icon">
                  <ClipboardCheck size={22} />
                </div>
                <div className="request-body">
                  <div className="section-heading">
                    <h3>
                      <Link to={"/app/pets/" + request.pet_id}>
                        {request.pet?.name || "Pet record"}
                      </Link>{" "}
                      <span>· {request.target_type} correction</span>
                    </h3>
                    <Badge
                      tone={
                        request.status === "pending"
                          ? "amber"
                          : request.status === "rejected"
                            ? "gray"
                            : ""
                      }
                    >
                      {request.status}
                    </Badge>
                  </div>
                  <p className="preserve-lines">{request.description}</p>
                  <small>
                    Requested {dateLabel(request.created_at)}
                    {admin && " by " + request.requester?.name} · #{request.id}
                  </small>
                  {request.resolution_note && (
                    <div className="resolution-note">
                      <strong>Administrator response</strong>
                      <p>{request.resolution_note}</p>
                      <small>Resolved {dateLabel(request.resolved_at)}</small>
                    </div>
                  )}
                  {admin && request.status === "pending" && (
                    <button
                      className="btn secondary small review-btn"
                      disabled={loadingReview === request.id}
                      onClick={() => review(request)}
                    >
                      {loadingReview === request.id
                        ? "Loading record…"
                        : "Review request"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          <Pagination page={result} onChange={setPage} />
        </section>
      ) : (
        !error && (
          <Empty title="Nothing waiting for a second look.">
            {admin
              ? "New correction requests will appear here for your review."
              : "When something looks incorrect, open a health record and select Request correction."}
          </Empty>
        )
      )}
      {modal && (
        <Modal
          title="Review correction request"
          onClose={() => setModal(null)}
          wide
        >
          <div className="request-summary">
            <strong>
              {modal.request.pet?.name} · {modal.request.target_type}
            </strong>
            <p>{modal.request.description}</p>
          </div>
          <ActionForm
            initial={{
              status: "rejected",
              resolution_note: "",
              changes: modal.record
                ? healthInitial(modal.request.target_type, modal.record)
                : {},
            }}
            submitLabel="Resolve request"
            onCancel={() => setModal(null)}
            onSubmit={(v) =>
              resolveCorrection(modal.request.id, {
                status: v.status,
                resolution_note: v.resolution_note,
                ...(v.status === "accepted" &&
                modal.request.target_type !== "ownership"
                  ? { changes: cleanHealth(v.changes) }
                  : {}),
              })
            }
            onSuccess={() => {
              setModal(null);
              setSuccess("Request resolved and recorded in the activity log.");
              setVersion((v) => v + 1);
            }}
          >
            {(v, set) => (
              <>
                <Select
                  label="Resolution"
                  value={v.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  <option value="rejected">Reject request</option>
                  <option value="accepted">Accept and apply correction</option>
                </Select>
                {v.status === "accepted" &&
                  modal.request.target_type === "ownership" && (
                    <p className="inline-note">
                      Complete the verified transfer in the pet’s Ownership
                      section first. This resolution records your response to
                      the request.{" "}
                      <Link to={"/app/pets/" + modal.request.pet_id}>
                        Open pet record
                      </Link>
                    </p>
                  )}
                {v.status === "accepted" && modal.record && (
                  <div className="form-section">
                    <h3>Corrected record values</h3>
                    <HealthFields
                      kind={modal.request.target_type}
                      values={v.changes}
                      set={(key, value) =>
                        set("changes", { ...v.changes, [key]: value })
                      }
                      vaccines={modal.vaccines}
                    />
                  </div>
                )}
                <Field
                  label="Resolution note"
                  type="textarea"
                  required
                  minLength={5}
                  maxLength={10000}
                  value={v.resolution_note}
                  onChange={(e) => set("resolution_note", e.target.value)}
                  hint="Explain the verification and decision. The requesting owner can read this response while they have pet access."
                />
              </>
            )}
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
