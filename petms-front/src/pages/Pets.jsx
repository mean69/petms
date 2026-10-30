import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  LayoutGrid,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { listPets, references } from "../api/pets";
import { errorMessage } from "../api/axios";
import { useAuth } from "../context/auth";
import {
  Badge,
  Empty,
  Feedback,
  PageHeading,
  Pagination,
  PetAvatar,
  Spinner,
} from "../components/UI";
export default function Pets() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [archived, setArchived] = useState(false);
  const [species, setSpecies] = useState("");
  const [speciesList, setSpeciesList] = useState([]);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    references(controller.signal)
      .then((data) => setSpeciesList(data.species))
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      listPets(
        {
          search,
          archived: archived ? 1 : 0,
          species_id: species || undefined,
          page,
        },
        controller.signal,
      )
        .then((data) => {
          if (active) {
            setResult(data);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(errorMessage(e));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [search, archived, species, page, retry]);
  return (
    <>
      <PageHeading
        eyebrow="EVERY PET, THEIR OWN STORY"
        title={user.role === "client" ? "Your little family." : "Pet records."}
        action={
          <Link className="btn primary" to="/app/pets/new">
            <Plus size={18} /> Register a pet
          </Link>
        }
      >
        A home for their details, their history, and everything in between.
      </PageHeading>
      <div className="list-toolbar">
        <div className="segmented" aria-label="Archive filter">
          <button
            className={!archived ? "active" : ""}
            onClick={() => {
              setArchived(false);
              setPage(1);
            }}
          >
            Active pets
          </button>
          <button
            className={archived ? "active" : ""}
            onClick={() => {
              setArchived(true);
              setPage(1);
            }}
          >
            Archived pets
          </button>
        </div>
        <span className="result-count">
          {result?.total ?? "—"} pets <LayoutGrid size={16} />
        </span>
      </div>
      <div className="filter-bar">
        <label className="search-box">
          <Search size={19} />
          <input
            aria-label="Search pet records"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by pet name, owner, species or breed…"
          />
        </label>
        <div className="filter-select">
          <SlidersHorizontal size={17} />
          <select
            aria-label="Filter species"
            value={species}
            onChange={(e) => {
              setSpecies(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All species</option>
            {speciesList.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Feedback error={error} />
      {error && (
        <button
          className="btn secondary small"
          onClick={() => setRetry((v) => v + 1)}
        >
          Try again
        </button>
      )}
      {loading ? (
        <Spinner />
      ) : result?.data.length ? (
        <>
          <div className="pet-grid">
            {result.data.map((pet) => (
              <Link
                className="pet-card"
                to={"/app/pets/" + pet.id}
                key={pet.id}
              >
                <div className="pet-card-top">
                  <PetAvatar pet={pet} />
                  <Badge tone={pet.archived_at ? "gray" : ""}>
                    {pet.archived_at ? "Archived" : pet.species?.name}
                  </Badge>
                </div>
                <h3>
                  {pet.name}
                  <ArrowRight size={18} />
                </h3>
                <p>
                  {pet.breed?.name ||
                    pet.breed_description ||
                    "Mixed / unknown breed"}
                </p>
                <div className="pet-card-meta">
                  <span>{pet.age_label}</span>
                  <span>{pet.sex}</span>
                </div>
                <div className="pet-owner-line">
                  <span>Owner</span>
                  <strong>{pet.owner?.name || "Not linked"}</strong>
                </div>
                <div className="pet-card-bottom">
                  <span>Latest weight</span>
                  <strong>
                    {pet.current_weight
                      ? Number(pet.current_weight.weight_kg) + " kg"
                      : "Not recorded"}
                  </strong>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={result} onChange={setPage} />
        </>
      ) : (
        !error && (
          <Empty
            title={
              search || species
                ? "No pets found."
                : archived
                  ? "No archived pets."
                  : "Every story has a beginning."
            }
            action={
              !search &&
              !species &&
              !archived && (
                <Link className="btn primary small" to="/app/pets/new">
                  <Plus size={16} /> Register a pet
                </Link>
              )
            }
          >
            {search || species
              ? "Try a different name, owner, species, or breed."
              : archived
                ? "Archived pets will appear here with their records preserved."
                : "Register your first pet to start keeping their story together."}
          </Empty>
        )
      )}
    </>
  );
}
