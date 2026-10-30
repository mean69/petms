import { dateLabel, roleLabel } from "../utils/format";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Archive,
  ClipboardCheck,
  PawPrint,
  Plus,
  ShieldCheck,
} from "lucide-react";
import api, { errorMessage } from "../api/axios";
import { useAuth } from "../context/auth";
import {
  Badge,
  Empty,
  Feedback,
  PageHeading,
  PetAvatar,
  Spinner,
} from "../components/UI";
import PetIllustration from "../components/PetIllustration";
export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    api
      .get("/api/v1/dashboard", { signal: controller.signal })
      .then(({ data }) => {
        if (active)
          setData({ pets: data.pets, archived: data.archived, overview: data });
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);
  return (
    <>
      <PageHeading
        eyebrow="A GOOD DAY TO CARE"
        title={"Hello, " + user.name.split(" ")[0] + "."}
      >
        A little overview of the pets and records that matter to you.
      </PageHeading>
      <Feedback error={error} />
      <section className="welcome-banner">
        <div>
          <Badge tone="white">
            <HeartIcon /> THE PETFAVE FAMILY
          </Badge>
          <h2>
            Little details.
            <br />A lifetime of better care.
          </h2>
          <p>Every record helps tell their story. Let’s keep it growing.</p>
          <Link className="btn white-btn" to="/app/pets/new">
            <Plus size={17} /> Register a pet
          </Link>
        </div>
        <PetIllustration />
      </section>
      {!data && !error ? (
        <Spinner />
      ) : (
        data && (
          <>
            <div className="stats-grid">
              <article>
                <span className="stat-icon">
                  <PawPrint />
                </span>
                <div>
                  <small>Active pets</small>
                  <strong>
                    {data.pets.total}
                    <span>
                      {" "}
                      {user.role === "client" ? "in your family" : "registered"}
                    </span>
                  </strong>
                </div>
              </article>
              <article>
                <span className="stat-icon amber">
                  <Archive />
                </span>
                <div>
                  <small>Archived pets</small>
                  <strong>
                    {data.archived.total}
                    <span> records preserved</span>
                  </strong>
                </div>
              </article>
              <article>
                <span className="stat-icon blue">
                  <ShieldCheck />
                </span>
                <div>
                  <small>Your workspace</small>
                  <strong className="stat-role">{roleLabel(user.role)}</strong>
                </div>
              </article>
            </div>
            <div className="dashboard-grid">
              <section>
                <div className="section-heading">
                  <h2>
                    {user.role === "client"
                      ? "Meet your little family"
                      : "Recently registered pets"}
                  </h2>
                  <Link to="/app/pets">
                    View all <ArrowRight size={15} />
                  </Link>
                </div>
                {data.pets.data.length ? (
                  <div className="pet-grid dashboard-pets">
                    {data.pets.data.slice(0, 4).map((pet) => (
                      <Link
                        className="pet-card"
                        to={"/app/pets/" + pet.id}
                        key={pet.id}
                      >
                        <div className="pet-card-top">
                          <PetAvatar pet={pet} />
                          <ArrowRight size={18} />
                        </div>
                        <h3>{pet.name}</h3>
                        <p>
                          {pet.breed?.name ||
                            pet.breed_description ||
                            "Mixed / unknown breed"}
                        </p>
                        <div className="pet-card-meta">
                          <span>{pet.species?.name}</span>
                          <span>{pet.sex}</span>
                        </div>
                        <div className="pet-card-bottom">
                          <span>{pet.age_label}</span>
                          <strong>
                            {pet.current_weight
                              ? Number(pet.current_weight.weight_kg) + " kg"
                              : "No weight recorded"}
                          </strong>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="Their story starts here."
                    action={
                      <Link className="btn primary small" to="/app/pets/new">
                        <Plus size={16} /> Add your first pet
                      </Link>
                    }
                  >
                    Register a pet to give their records a home.
                  </Empty>
                )}
              </section>
              <aside>
                <section className="panel due-panel">
                  <div className="section-heading">
                    <h2>Dates to remember</h2>
                    <span className="calendar-tile">↗</span>
                  </div>
                  <p className="muted">
                    Vaccination due dates recorded by your clinic.
                  </p>
                  {data.overview.due_dates.length ? (
                    data.overview.due_dates.map((record) => (
                      <Link
                        key={record.id}
                        to={"/app/pets/" + record.pet_id}
                        className="due-item"
                      >
                        <span className="due-date">
                          {dateLabel(record.next_due_at)}
                        </span>
                        <strong>{record.pet.name}</strong>
                        <span>{record.vaccine.name}</span>
                      </Link>
                    ))
                  ) : (
                    <p className="small-empty">
                      No vaccination due dates on record.
                    </p>
                  )}
                  <p className="fine-print">
                    Shown from recorded information. No schedules are generated.
                  </p>
                </section>
                <div className="soft-panel">
                  <ClipboardCheck size={23} />
                  <h3>Something doesn’t look right?</h3>
                  <p>
                    {user.role === "client"
                      ? "Open a pet’s record to request a correction. Your clinic administrator will review it."
                      : "Keep historical entries accurate. Every record update is saved in the activity log."}
                  </p>
                  {user.role !== "staff" && (
                    <Link to="/app/corrections">
                      View correction requests <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </aside>
            </div>
          </>
        )
      )}
    </>
  );
}
function HeartIcon() {
  return <PawPrint size={12} />;
}
