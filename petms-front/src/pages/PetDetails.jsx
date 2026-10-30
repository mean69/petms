import { dateLabel } from "../utils/format";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Edit3,
  Info,
  Plus,
  RotateCcw,
  Scale,
  ShieldCheck,
  Syringe,
  Users,
} from "lucide-react";
import { archivePet, getPet, references } from "../api/pets";
import { saveWeight } from "../api/weightRecords";
import { saveMedical } from "../api/medicalHistory";
import { saveAllergy, setAllergyStatus } from "../api/allergies";
import { saveVaccination } from "../api/vaccinations";
import { createCorrection } from "../api/correctionRequests";
import { ownershipHistory, transferOwnership } from "../api/ownershipRecords";
import { errorMessage } from "../api/axios";
import { useAuth } from "../context/auth";
import {
  ActionForm,
  Badge,
  Empty,
  Feedback,
  Field,
  Modal,
  PetAvatar,
  Select,
  Spinner,
} from "../components/UI";
import HealthFields from "../components/HealthForm";
import { cleanHealth, healthInitial, healthKinds } from "../utils/health";
import OwnerSelect from "../components/OwnerSelect";
const saveHealth = {
  weight: saveWeight,
  medical: saveMedical,
  allergy: saveAllergy,
  vaccination: saveVaccination,
};
const targets = {
  weight: "weight_record_id",
  medical: "medical_entry_id",
  allergy: "allergy_record_id",
  vaccination: "vaccination_record_id",
  ownership: "pet_ownership_id",
};
export default function PetDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const clinic = user.role !== "client";
  const admin = user.role === "administrator";
  const [pet, setPet] = useState(null);
  const [vaccines, setVaccines] = useState([]);
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [history, setHistory] = useState(null);
  const load = useCallback(
    async (signal, includeReferences = false) => {
      try {
        const [record, refs] = await Promise.all([
          getPet(id, signal),
          includeReferences ? references(signal) : Promise.resolve(null),
        ]);
        setPet(record);
        setHistory(null);
        if (refs) setVaccines(refs.vaccines);
        setError("");
      } catch (e) {
        if (!signal?.aborted) setError(errorMessage(e));
      }
    },
    [id],
  );
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal, true);
    return () => controller.abort();
  }, [load]);
  const changed = (message) => {
    setModal(null);
    setSuccess(message);
    setHistory(null);
    load();
  };
  const actions = (kind, record) => (
    <div className="record-actions">
      {clinic ? (
        <button
          className="btn text-btn small"
          onClick={() => setModal({ type: "health", kind, record })}
        >
          <Edit3 size={14} /> Edit record
        </button>
      ) : (
        <button
          className="btn text-btn small"
          onClick={() => setModal({ type: "correction", kind, record })}
        >
          Request correction <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
  const notes = (record) => (
    <>
      {record.notes && <p className="record-notes">{record.notes}</p>}
      <div className="record-footnote">
        Recorded by {record.recorder?.name || "clinic personnel"} · Updated{" "}
        {dateLabel(record.updated_at)}
      </div>
    </>
  );
  const section = (title, kind, description) => (
    <div className="section-heading health-heading">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {clinic && (
        <button
          className="btn primary small"
          onClick={() => setModal({ type: "health", kind })}
        >
          <Plus size={16} /> Add {kind === "medical" ? "entry" : "record"}
        </button>
      )}
    </div>
  );
  if (!pet || pet.id !== Number(id))
    return (
      <>
        <Feedback error={error} />
        {error ? (
          <button
            className="btn secondary"
            onClick={() => load(undefined, true)}
          >
            Try again
          </button>
        ) : (
          <Spinner />
        )}
      </>
    );
  return (
    <>
      <Link className="back-link" to="/app/pets">
        <ArrowLeft size={16} /> Back to pet records
      </Link>
      <Feedback error={error} success={success} />
      <section className="pet-detail-heading">
        <div className="pet-identity">
          <PetAvatar pet={pet} large />
          <div>
            <div className="identity-kicker">
              PET PROFILE <span>#{String(pet.id).padStart(4, "0")}</span>
            </div>
            <h1>
              {pet.name}{" "}
              <Badge tone={pet.archived_at ? "gray" : ""}>
                {pet.archived_at ? "Archived" : "Active"}
              </Badge>
            </h1>
            <p>
              {pet.species?.name} <span>·</span>{" "}
              {pet.breed?.name ||
                pet.breed_description ||
                "Mixed / unknown breed"}{" "}
              <span>·</span> {pet.sex}
            </p>
          </div>
        </div>
        <div className="detail-actions">
          <Link
            className="btn secondary small"
            to={"/app/pets/" + id + "/edit"}
          >
            <Edit3 size={15} /> Edit profile
          </Link>
          {user.role !== "staff" && (
            <button
              className="btn secondary small"
              onClick={() => setModal({ type: "archive" })}
            >
              {pet.archived_at ? (
                <RotateCcw size={15} />
              ) : (
                <Archive size={15} />
              )}
              {pet.archived_at ? "Restore pet" : "Archive pet"}
            </button>
          )}
        </div>
      </section>
      {pet.archived_at && (
        <p className="archive-notice">
          <Archive size={17} /> This pet is archived. Their complete health
          history is preserved.
        </p>
      )}
      <div className="detail-facts">
        <div>
          <CalendarDays size={19} />
          <span>
            AGE<strong>{pet.age_label}</strong>
          </span>
        </div>
        <div>
          <Scale size={19} />
          <span>
            LATEST WEIGHT
            <strong>
              {pet.current_weight
                ? Number(pet.current_weight.weight_kg) + " kg"
                : "Not recorded"}
            </strong>
          </span>
        </div>
        <div>
          <Users size={19} />
          <span>
            CURRENT OWNER<strong>{pet.owner?.name || "Not linked"}</strong>
          </span>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Pet record sections">
        {[
          ["overview", "Overview"],
          ["weight", "Weight history"],
          ["medical", "Medical history"],
          ["allergy", "Allergies"],
          ["vaccination", "Vaccinations"],
          ...(admin ? [["ownership", "Ownership"]] : []),
        ].map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              if (key === "ownership" && !history)
                ownershipHistory(id)
                  .then(setHistory)
                  .catch((e) => setError(errorMessage(e)));
            }}
          >
            {label}
            {key === "allergy" &&
              pet.allergies.filter((a) => a.status === "active").length > 0 && (
                <span className="tab-count">
                  {pet.allergies.filter((a) => a.status === "active").length}
                </span>
              )}
          </button>
        ))}
      </div>
      <div className="tab-content" role="tabpanel" aria-label={tab}>
        {tab === "overview" && (
          <div className="details-grid">
            <div>
              <section className="panel">
                <div className="section-heading">
                  <h2>The little details</h2>
                  <ClipboardList size={19} />
                </div>
                <dl className="detail-list">
                  <div>
                    <dt>Pet name</dt>
                    <dd>{pet.name}</dd>
                  </div>
                  <div>
                    <dt>Species</dt>
                    <dd>{pet.species?.name}</dd>
                  </div>
                  <div>
                    <dt>Breed</dt>
                    <dd>
                      {pet.breed?.name ||
                        pet.breed_description ||
                        "Mixed / unknown"}
                    </dd>
                  </div>
                  <div>
                    <dt>Birth date</dt>
                    <dd>
                      {pet.birth_date
                        ? dateLabel(pet.birth_date) +
                          (pet.birth_date_estimated ? " (estimated)" : "")
                        : "Unknown"}
                    </dd>
                  </div>
                  <div>
                    <dt>Sex</dt>
                    <dd className="capitalize">{pet.sex}</dd>
                  </div>
                  <div>
                    <dt>Registered</dt>
                    <dd>{dateLabel(pet.created_at)}</dd>
                  </div>
                </dl>
              </section>
              <section className="panel">
                <div className="section-heading">
                  <h2>Recent medical history</h2>
                  <button
                    className="btn text-btn small"
                    onClick={() => setTab("medical")}
                  >
                    View all <ArrowRight size={14} />
                  </button>
                </div>
                {pet.medical_history[0] ? (
                  <>
                    <span className="record-date">
                      {dateLabel(pet.medical_history[0].event_date)}
                    </span>
                    <p className="preserve-lines">
                      {pet.medical_history[0].summary}
                    </p>
                  </>
                ) : (
                  <p className="small-empty">
                    No medical history has been recorded yet.
                  </p>
                )}
              </section>
            </div>
            <aside>
              <section className="panel">
                <div className="section-heading">
                  <h2>Owner information</h2>
                  <Users size={19} />
                </div>
                <div className="owner-summary">
                  <span className="user-avatar">
                    {pet.owner?.name?.[0] || "?"}
                  </span>
                  <div>
                    <strong>{pet.owner?.name}</strong>
                    <small>Current registered owner</small>
                  </div>
                </div>
                <dl className="detail-list">
                  <div>
                    <dt>Contact</dt>
                    <dd>{pet.owner?.contact_number || "Not recorded"}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{pet.owner?.email || "Not recorded"}</dd>
                  </div>
                  <div>
                    <dt>Address</dt>
                    <dd>{pet.owner?.address || "Not recorded"}</dd>
                  </div>
                </dl>
                {!clinic && (
                  <button
                    className="btn text-btn small"
                    onClick={() =>
                      setModal({
                        type: "correction",
                        kind: "ownership",
                        record: { id: pet.current_ownership_id },
                      })
                    }
                  >
                    Request ownership correction <ArrowRight size={14} />
                  </button>
                )}
              </section>
              <section className="soft-panel">
                <ShieldCheck size={23} />
                <h3>Allergy information</h3>
                <p>
                  {pet.allergy_information_status === "unknown"
                    ? "Allergy information has not yet been recorded."
                    : pet.allergy_information_status === "no_known_allergies"
                      ? "No known allergies are recorded."
                      : pet.allergies.filter((a) => a.status === "active")
                          .length + " active allergy record(s)."}
                </p>
                <button
                  className="btn text-btn small"
                  onClick={() => setTab("allergy")}
                >
                  View allergy information <ArrowRight size={14} />
                </button>
              </section>
            </aside>
          </div>
        )}
        {tab === "weight" && (
          <section className="panel">
            {section(
              "A little perspective on their growth.",
              "weight",
              "Measurements in kilograms, recorded over time.",
            )}
            {pet.weights.length ? (
              <>
                <WeightChart records={pet.weights} />
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Measured</th>
                        <th>Weight</th>
                        <th>Notes</th>
                        <th>Record</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pet.weights.map((record) => (
                        <tr key={record.id}>
                          <td>{dateLabel(record.measured_at)}</td>
                          <td>
                            <strong>{Number(record.weight_kg)} kg</strong>
                          </td>
                          <td>
                            {record.notes || "—"}
                            <small className="table-note">
                              {record.recorder?.name || "Clinic personnel"}
                            </small>
                          </td>
                          <td>{actions("weight", record)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <Empty title="A fresh start.">
                Your clinic team can add the first weight measurement here.
              </Empty>
            )}
          </section>
        )}
        {tab === "medical" && (
          <section className="panel">
            {section(
              "Their health story.",
              "medical",
              "Dated historical entries and relevant supporting notes.",
            )}
            {pet.medical_history.length ? (
              <div className="record-timeline">
                {pet.medical_history.map((record) => (
                  <article className="history-record" key={record.id}>
                    <div className="timeline-dot" />
                    <span className="record-date">
                      {dateLabel(record.event_date)}
                    </span>
                    <h3 className="preserve-lines">{record.summary}</h3>
                    {notes(record)}
                    {actions("medical", record)}
                  </article>
                ))}
              </div>
            ) : (
              <Empty title="No history entries yet.">
                Clinic personnel can add dated information as it becomes
                available.
              </Empty>
            )}
          </section>
        )}
        {tab === "allergy" && (
          <section className="panel">
            {section(
              "The things to be aware of.",
              "allergy",
              "Allergens, reactions, severity, and historical status.",
            )}
            <div className="allergy-state">
              <div>
                <Info size={20} />
                <span>
                  {pet.allergy_information_status === "unknown"
                    ? "Allergy information not yet recorded"
                    : pet.allergy_information_status === "no_known_allergies"
                      ? "No known allergies"
                      : "Allergy records available below"}
                </span>
              </div>
              {clinic && (
                <button
                  className="btn secondary small"
                  onClick={() => setModal({ type: "allergy-status" })}
                >
                  Update information status
                </button>
              )}
            </div>
            {pet.allergies.length ? (
              <div className="record-grid">
                {pet.allergies.map((record) => (
                  <article className="clinical-card" key={record.id}>
                    <div className="section-heading">
                      <h3>{record.allergen}</h3>
                      <Badge
                        tone={record.status === "active" ? "amber" : "gray"}
                      >
                        {record.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <dl className="detail-list">
                      <div>
                        <dt>Reaction</dt>
                        <dd>{record.reaction || "Not recorded"}</dd>
                      </div>
                      <div>
                        <dt>Severity</dt>
                        <dd>{record.severity || "Unknown"}</dd>
                      </div>
                      <div>
                        <dt>Identified</dt>
                        <dd>{dateLabel(record.identified_at)}</dd>
                      </div>
                    </dl>
                    {notes(record)}
                    {actions("allergy", record)}
                  </article>
                ))}
              </div>
            ) : (
              <p className="small-empty">
                No individual allergy records have been added.
              </p>
            )}
          </section>
        )}
        {tab === "vaccination" && (
          <section className="panel">
            {section(
              "Every recorded vaccination.",
              "vaccination",
              "Administration details and due dates provided by your clinic.",
            )}
            <p className="inline-note">
              <Info size={16} /> Due dates reflect recorded information. PetFave
              does not generate vaccination schedules.
            </p>
            {pet.vaccinations.length ? (
              <div className="record-grid">
                {pet.vaccinations.map((record) => (
                  <article className="clinical-card" key={record.id}>
                    <div className="section-heading">
                      <span className="feature-icon">
                        <Syringe size={20} />
                      </span>
                      <Badge tone="gray">Recorded</Badge>
                    </div>
                    <h3>{record.vaccine?.name}</h3>
                    <dl className="detail-list">
                      <div>
                        <dt>Administered</dt>
                        <dd>{dateLabel(record.administered_at)}</dd>
                      </div>
                      <div>
                        <dt>Next due</dt>
                        <dd>{dateLabel(record.next_due_at)}</dd>
                      </div>
                      <div>
                        <dt>Dose</dt>
                        <dd>{record.dose || "Not recorded"}</dd>
                      </div>
                      <div>
                        <dt>Batch / lot</dt>
                        <dd>{record.batch_number || "Not recorded"}</dd>
                      </div>
                      <div>
                        <dt>Vet / clinic</dt>
                        <dd>{record.administering_clinic || "Not recorded"}</dd>
                      </div>
                    </dl>
                    {notes(record)}
                    {actions("vaccination", record)}
                  </article>
                ))}
              </div>
            ) : (
              <Empty title="No vaccinations recorded yet.">
                Your clinic team can add vaccination information here.
              </Empty>
            )}
          </section>
        )}
        {tab === "ownership" && admin && (
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>Ownership, with a clear history.</h2>
                <p>Only verified administrators can transfer ownership.</p>
              </div>
              <button
                className="btn primary small"
                onClick={() => setModal({ type: "transfer" })}
              >
                <Users size={16} /> Transfer ownership
              </button>
            </div>
            <p className="inline-note">
              <ShieldCheck size={18} /> Transfers preserve health history and
              immediately revoke the former owner’s access.
            </p>
            {history ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Owner</th>
                      <th>Started</th>
                      <th>Ended</th>
                      <th>Verification reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record) => (
                      <tr key={record.id}>
                        <td>{record.owner?.name}</td>
                        <td>{dateLabel(record.started_at)}</td>
                        <td>
                          {record.ended_at ? (
                            dateLabel(record.ended_at)
                          ) : (
                            <Badge>Current</Badge>
                          )}
                        </td>
                        <td>{record.verification_reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Spinner />
            )}
          </section>
        )}
      </div>
      {modal?.type === "health" && (
        <Modal
          title={
            (modal.record ? "Update " : "Add ") +
            healthKinds[modal.kind].toLowerCase()
          }
          onClose={() => setModal(null)}
          wide
        >
          <ActionForm
            initial={healthInitial(modal.kind, modal.record)}
            onCancel={() => setModal(null)}
            onSubmit={(v) =>
              saveHealth[modal.kind](id, modal.record?.id, cleanHealth(v))
            }
            onSuccess={() =>
              changed(
                "Health record saved. The change has been recorded in the activity log.",
              )
            }
          >
            {(v, set) => (
              <>
                <p className="form-intro">
                  Historical records are preserved. Changes include the
                  recording user and timestamps.
                </p>
                <HealthFields
                  kind={modal.kind}
                  values={v}
                  set={set}
                  vaccines={vaccines}
                />
              </>
            )}
          </ActionForm>
        </Modal>
      )}
      {modal?.type === "correction" && (
        <Modal title="Request a correction" onClose={() => setModal(null)}>
          <p className="form-intro">
            Tell your administrator what needs to change in this{" "}
            {modal.kind === "ownership"
              ? "ownership record"
              : healthKinds[modal.kind].toLowerCase()}
            . Include the correct information and how it can be verified.
          </p>
          <ActionForm
            initial={{ description: "" }}
            submitLabel="Submit request"
            onCancel={() => setModal(null)}
            onSubmit={(v) =>
              createCorrection({
                ...v,
                pet_id: Number(id),
                target_type: modal.kind,
                [targets[modal.kind]]: modal.record.id,
              })
            }
            onSuccess={() => {
              setModal(null);
              setSuccess(
                "Correction request submitted for administrator review.",
              );
            }}
          >
            {(v, set) => (
              <Field
                label="What needs correcting?"
                type="textarea"
                required
                minLength={5}
                maxLength={10000}
                value={v.description}
                onChange={(e) => set("description", e.target.value)}
              />
            )}
          </ActionForm>
        </Modal>
      )}
      {modal?.type === "archive" && (
        <Modal
          title={pet.archived_at ? "Restore this pet?" : "Archive this pet?"}
          onClose={() => setModal(null)}
        >
          <p className="form-intro">
            {pet.archived_at
              ? "This pet will appear in the active pet list again."
              : "This hides the pet from the active list. All health records and ownership history stay preserved, and authorized clinic personnel can still retrieve them."}
          </p>
          <ActionForm
            initial={{}}
            submitLabel={pet.archived_at ? "Restore pet" : "Archive pet"}
            onCancel={() => setModal(null)}
            onSubmit={() => archivePet(id, Boolean(pet.archived_at))}
            onSuccess={() =>
              changed(
                pet.archived_at
                  ? "Pet restored."
                  : "Pet archived. All history has been preserved.",
              )
            }
          />
        </Modal>
      )}
      {modal?.type === "allergy-status" && (
        <Modal
          title="Update allergy information status"
          onClose={() => setModal(null)}
        >
          <ActionForm
            initial={{ status: pet.allergy_information_status }}
            onCancel={() => setModal(null)}
            onSubmit={(v) => setAllergyStatus(id, v.status)}
            onSuccess={() => changed("Allergy information status updated.")}
          >
            {(v, set) => (
              <Select
                label="Information status"
                value={v.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option value="unknown">Not yet recorded</option>
                <option value="no_known_allergies">No known allergies</option>
                <option value="recorded">Allergy records available</option>
              </Select>
            )}
          </ActionForm>
        </Modal>
      )}
      {modal?.type === "transfer" && (
        <Modal
          title="Verified ownership transfer"
          onClose={() => setModal(null)}
        >
          <p className="form-intro">
            Confirm ownership using verified documentation before submitting.
            The new owner receives access to this pet’s entire health history;
            former-owner access ends immediately.
          </p>
          <ActionForm
            initial={{ owner_profile_id: "", verification_reference: "" }}
            submitLabel="Confirm verified transfer"
            onCancel={() => setModal(null)}
            onSubmit={(v) => transferOwnership(id, v)}
            onSuccess={() => {
              setTab("overview");
              changed("Verified ownership transfer completed.");
            }}
          >
            {(v, set) => (
              <>
                <OwnerSelect
                  value={v.owner_profile_id}
                  onChange={(value) => set("owner_profile_id", value)}
                />
                <Field
                  label="Verification reference"
                  required
                  minLength={5}
                  maxLength={255}
                  placeholder="e.g. signed transfer form reference"
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
function WeightChart({ records }) {
  if (records.length < 2) return null;
  const points = [...records].reverse();
  const values = points.map((r) => Number(r.weight_kg));
  const min = Math.min(...values) * 0.9;
  const max = Math.max(...values) * 1.1;
  const span = max - min || 1;
  const path = points
    .map(
      (r, i) =>
        (i ? "L" : "M") +
        (25 + (i * 650) / (points.length - 1)) +
        "," +
        (145 - ((Number(r.weight_kg) - min) / span) * 120),
    )
    .join(" ");
  return (
    <figure className="weight-chart">
      <figcaption>
        <span>WEIGHT OVER TIME</span>
        <strong>
          {values.at(-1)} <small>kg · latest recorded</small>
        </strong>
      </figcaption>
      <svg
        viewBox="0 0 700 175"
        role="img"
        aria-label={
          "Weight history, from " +
          values[0] +
          " to " +
          values.at(-1) +
          " kilograms"
        }
      >
        <path
          d="M25 45H675M25 100H675M25 155H675"
          stroke="#dfebe5"
          fill="none"
        />
        <path
          d={path}
          fill="none"
          stroke="#287966"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {points.map((r, i) => (
          <circle
            key={r.id}
            cx={25 + (i * 650) / (points.length - 1)}
            cy={145 - ((Number(r.weight_kg) - min) / span) * 120}
            r="4"
            fill="#287966"
          >
            <title>
              {dateLabel(r.measured_at) + ": " + r.weight_kg + " kg"}
            </title>
          </circle>
        ))}
      </svg>
      <div>
        <span>{dateLabel(points[0].measured_at)}</span>
        <span>{dateLabel(points.at(-1).measured_at)}</span>
      </div>
    </figure>
  );
}
