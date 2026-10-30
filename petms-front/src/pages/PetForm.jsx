import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Info, PawPrint } from "lucide-react";
import { getPet, references, savePet } from "../api/pets";
import { errorMessage } from "../api/axios";
import { useAuth } from "../context/auth";
import {
  ActionForm,
  Feedback,
  Field,
  PageHeading,
  Select,
  Spinner,
} from "../components/UI";
import OwnerSelect from "../components/OwnerSelect";
export default function PetForm() {
  const { id } = useParams();
  const [today] = useState(() => new Date().toLocaleDateString("en-CA"));
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    Promise.all([
      references(controller.signal),
      id ? getPet(id, controller.signal) : Promise.resolve(null),
    ])
      .then(([refs, pet]) => {
        if (active) setData({ refs, pet });
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);
  return (
    <>
      <Link to={id ? "/app/pets/" + id : "/app/pets"} className="back-link">
        <ArrowLeft size={16} /> Back to {id ? "pet details" : "pet records"}
      </Link>
      <PageHeading
        eyebrow="THE START OF SOMETHING LOVELY"
        title={
          id
            ? "The details that make them, them."
            : "Meet your newest family member."
        }
      >
        {id
          ? "Keep their basic profile up to date."
          : "Start with the essentials. Their health history will grow from here."}
      </PageHeading>
      <Feedback error={error} />
      {!data && !error ? (
        <Spinner />
      ) : (
        data && (
          <div className="form-page-grid">
            <section className="panel">
              <div className="panel-heading">
                <PawPrint size={21} />
                <h2>{id ? "Edit pet profile" : "Pet information"}</h2>
              </div>
              <ActionForm
                submitLabel={id ? "Save pet profile" : "Register pet"}
                onSubmit={(values) => {
                  const payload = {
                    ...values,
                    species_id: Number(values.species_id),
                    breed_id: values.breed_id ? Number(values.breed_id) : null,
                    birth_date: values.birth_date || null,
                    birth_date_estimated: Boolean(
                      values.birth_date && values.birth_date_estimated,
                    ),
                  };
                  return savePet(id, payload);
                }}
                onSuccess={(pet) => navigate("/app/pets/" + pet.id)}
                initial={{
                  name: data.pet?.name || "",
                  species_id: data.pet?.species_id || "",
                  breed_id: data.pet?.breed_id || "",
                  breed_description: data.pet?.breed_description || "",
                  birth_date: data.pet?.birth_date || "",
                  birth_date_estimated: data.pet?.birth_date_estimated || false,
                  sex: data.pet?.sex || "unknown",
                  ...(!id && user.role !== "client"
                    ? { owner_profile_id: "" }
                    : {}),
                }}
              >
                {(v, set) => (
                  <>
                    <Field
                      label="Pet name"
                      placeholder="What do you call them?"
                      required
                      maxLength={150}
                      value={v.name}
                      onChange={(e) => set("name", e.target.value)}
                    />
                    <div className="form-grid">
                      <Select
                        label="Species"
                        required
                        value={v.species_id}
                        onChange={(e) => {
                          set("species_id", e.target.value);
                          set("breed_id", "");
                        }}
                      >
                        <option value="">Select species</option>
                        {data.refs.species.map((s) => (
                          <option value={s.id} key={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </Select>
                      <Select
                        label="Breed"
                        value={v.breed_id}
                        onChange={(e) => set("breed_id", e.target.value)}
                      >
                        <option value="">Mixed / unknown / other</option>
                        {data.refs.species
                          .find((s) => s.id === Number(v.species_id))
                          ?.breeds.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                      </Select>
                    </div>
                    {!v.breed_id && (
                      <Field
                        label="Breed details"
                        placeholder="e.g. mixed breed, if known"
                        maxLength={150}
                        value={v.breed_description}
                        onChange={(e) =>
                          set("breed_description", e.target.value)
                        }
                      />
                    )}
                    <div className="form-grid">
                      <Field
                        label="Birth date"
                        type="date"
                        max={today}
                        value={v.birth_date}
                        onChange={(e) => set("birth_date", e.target.value)}
                        hint="Leave blank if birth information is unknown."
                      />
                      <Select
                        label="Sex"
                        required
                        value={v.sex}
                        onChange={(e) => set("sex", e.target.value)}
                      >
                        <option value="unknown">Unknown</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                      </Select>
                    </div>
                    <label className="check-field">
                      <input
                        type="checkbox"
                        checked={v.birth_date_estimated}
                        disabled={!v.birth_date}
                        onChange={(e) =>
                          set("birth_date_estimated", e.target.checked)
                        }
                      />{" "}
                      This birth date is estimated
                    </label>
                    {!id && user.role !== "client" && (
                      <div className="form-section">
                        <h3>Link to an owner</h3>
                        <p>
                          Choose an existing owner record. Administrators can
                          register new owners from Pet owners.
                        </p>
                        <OwnerSelect
                          value={v.owner_profile_id}
                          onChange={(value) => set("owner_profile_id", value)}
                        />
                      </div>
                    )}
                    {!id && user.role === "client" && (
                      <p className="inline-note">
                        <Info size={17} /> This pet will be registered under
                        your owner profile.
                      </p>
                    )}
                  </>
                )}
              </ActionForm>
            </section>
            <aside className="soft-panel form-note">
              <PawPrint size={29} />
              <h2>A place for their whole story.</h2>
              <p>
                You can update these details as you learn more about your pet.
              </p>
              <hr />
              <h3>About health records</h3>
              <p>
                Your clinic team records weight, medical history, allergies, and
                vaccinations. Owners can view those records and request
                corrections.
              </p>
              <h3>Not sure of their birthday?</h3>
              <p>
                Use an estimated birth date, or leave it unknown. Their age will
                always be clearly labeled.
              </p>
            </aside>
          </div>
        )
      )}
    </>
  );
}
