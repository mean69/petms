import { useEffect, useState } from "react";
import { listOwners } from "../api/ownerProfiles";
import { errorMessage } from "../api/axios";
import { Feedback, Field, Select } from "./UI";
export default function OwnerSelect({ value, onChange }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setBusy(true);
      listOwners({ search, page }, controller.signal)
        .then((data) => {
          if (active) {
            setRows((prev) =>
              page === 1 ? data.data : [...prev, ...data.data],
            );
            setResult(data);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(errorMessage(e));
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }, 200);
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [search, page]);
  return (
    <div className="owner-select">
      <Field
        label="Find an owner"
        placeholder="Search owner name…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
      <Select
        label="Registered owner"
        required
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        <option value="">Choose an existing owner</option>
        {value && !rows.some((o) => o.id === Number(value)) && (
          <option value={value}>Selected owner #{value}</option>
        )}
        {rows.map((owner) => (
          <option key={owner.id} value={owner.id}>
            {owner.name} · {owner.contact_number} (#{owner.id})
          </option>
        ))}
      </Select>
      <Feedback error={error} />
      {busy && <small>Loading owners…</small>}
      {result?.current_page < result?.last_page && (
        <button
          type="button"
          className="btn secondary small"
          disabled={busy}
          onClick={() => setPage((p) => p + 1)}
        >
          Load more owners
        </button>
      )}
    </div>
  );
}
