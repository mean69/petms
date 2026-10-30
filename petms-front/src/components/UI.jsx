import { useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Cat,
  Dog,
  LoaderCircle,
  PawPrint,
  Rabbit,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { errorMessage } from "../api/axios";
export function Brand({ light = false }) {
  return (
    <Link to="/" className={"brand" + (light ? " light" : "")}>
      <span className="brand-icon">
        <PawPrint size={23} fill="currentColor" />
      </span>
      <span>
        PetFave<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
export function Spinner({ label = "Loading your records…" }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={25} />
      <span>{label}</span>
    </div>
  );
}
export function Feedback({ error, success }) {
  return error ? (
    <div className="feedback error" role="alert">
      <AlertCircle size={18} />
      <span>{error}</span>
    </div>
  ) : success ? (
    <div className="feedback success" role="status">
      <CheckCircle2 size={18} />
      <span>{success}</span>
    </div>
  ) : null;
}
export function Empty({ title = "Nothing here yet", children, action }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <PawPrint size={30} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function PetAvatar({ pet, large = false }) {
  const name = pet.species?.name;
  const Icon =
    name === "Cat"
      ? Cat
      : name === "Dog"
        ? Dog
        : name === "Rabbit"
          ? Rabbit
          : PawPrint;
  return (
    <span
      className={
        "pet-avatar tone-" + ((pet.id || 0) % 4) + (large ? " large" : "")
      }
    >
      <Icon size={large ? 63 : 37} strokeWidth={1.5} />
    </span>
  );
}
export function Badge({ children, tone = "" }) {
  return <span className={"badge " + tone}>{children}</span>;
}
export function Field({ label, children, hint, ...props }) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>
        {label}
        {props.required && (
          <span className="required" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </span>
      {children ? (
        <div className="field-control">{children}</div>
      ) : props.type === "textarea" ? (
        <textarea
          id={id}
          aria-label={label}
          aria-describedby={hint ? id + "-hint" : undefined}
          {...props}
        />
      ) : (
        <input
          id={id}
          aria-label={label}
          aria-describedby={hint ? id + "-hint" : undefined}
          {...props}
        />
      )}
      {hint && <small id={id + "-hint"}>{hint}</small>}
    </label>
  );
}
export function Select({ label, children, ...props }) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>
        {label}
        {props.required && (
          <span className="required" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </span>
      <select id={id} aria-label={label} {...props}>
        {children}
      </select>
    </label>
  );
}
export function PageHeading({ eyebrow, title, children, action }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  );
}
export function Pagination({ page, onChange }) {
  return (
    page?.last_page > 1 && (
      <div className="pagination">
        <button
          className="btn secondary small"
          disabled={page.current_page <= 1}
          onClick={() => onChange(page.current_page - 1)}
        >
          <ArrowLeft size={15} /> Previous
        </button>
        <span>
          Page {page.current_page} of {page.last_page}
        </span>
        <button
          className="btn secondary small"
          disabled={page.current_page >= page.last_page}
          onClick={() => onChange(page.current_page + 1)}
        >
          Next <ArrowRight size={15} />
        </button>
      </div>
    )
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={"modal" + (wide ? " wide" : "")}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-label={title}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button
          className="icon-btn"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ActionForm({
  onSubmit,
  onSuccess,
  children,
  submitLabel = "Save changes",
  initial = {},
  onCancel,
}) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
          const result = await onSubmit(values);
          onSuccess?.(result);
        } catch (error) {
          setError(errorMessage(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        {typeof children === "function" ? children(values, set) : children}
        <Feedback error={error} />
        <div className="form-actions">
          {onCancel && (
            <button className="btn secondary" type="button" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button className="btn primary" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={17} /> : null}
            {busy ? "Saving…" : submitLabel}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
