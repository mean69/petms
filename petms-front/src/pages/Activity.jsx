import { dateLabel } from "../utils/format";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { listLogs } from "../api/activityLogs";
import { errorMessage } from "../api/axios";
import {
  Empty,
  Feedback,
  Modal,
  PageHeading,
  Pagination,
  Spinner,
} from "../components/UI";
export default function Activity() {
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        listLogs({ search, page }, controller.signal)
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
  }, [search, page]);
  return (
    <>
      <PageHeading eyebrow="A CLEAR TRAIL OF CARE" title="Activity log.">
        Who changed what, when it changed, and the values before and after.
      </PageHeading>
      <label className="search-box standalone-search">
        <Search size={19} />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by action, e.g. clinical or ownership…"
          aria-label="Filter activity log"
        />
      </label>
      <Feedback error={error} />
      {!result && !error ? (
        <Spinner />
      ) : result?.data.length ? (
        <section className="panel table-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Record</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((log) => (
                  <tr key={log.id}>
                    <td>
                      {dateLabel(log.created_at)}
                      <small className="table-note">
                        {new Date(log.created_at).toLocaleTimeString("en-PH")}
                      </small>
                    </td>
                    <td>{log.actor?.name || "System / console"}</td>
                    <td>
                      <code>{log.action}</code>
                    </td>
                    <td>
                      {log.subject_type.split("\\").at(-1)} #{log.subject_id}
                    </td>
                    <td>
                      <button
                        className="btn secondary small"
                        onClick={() => setSelected(log)}
                      >
                        Inspect changes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={result} onChange={setPage} />
        </section>
      ) : (
        !error && (
          <Empty title="No matching activity.">
            Important administrative, profile, ownership, and clinical changes
            appear here.
          </Empty>
        )
      )}
      {selected && (
        <Modal
          title={"Activity #" + selected.id}
          onClose={() => setSelected(null)}
          wide
        >
          <p>
            {selected.action} · {selected.actor?.name || "System / console"}
          </p>
          <div className="audit-grid">
            <div>
              <h3>Before</h3>
              <pre>
                {JSON.stringify(selected.before_values, null, 2) ||
                  "New record"}
              </pre>
            </div>
            <div>
              <h3>After</h3>
              <pre>{JSON.stringify(selected.after_values, null, 2)}</pre>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
