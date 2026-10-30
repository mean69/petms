import { useState } from "react";
import { Field, Select } from "./UI";
export default function HealthFields({ kind, values: v, set, vaccines = [] }) {
  const [today] = useState(() => new Date().toLocaleDateString("en-CA"));
  const field = (key, label, extra = {}) => (
    <Field
      label={label}
      value={v[key] ?? ""}
      onChange={(e) => set(key, e.target.value)}
      {...extra}
    />
  );
  return (
    <>
      {kind === "weight" && (
        <div className="form-grid">
          {field("weight_kg", "Weight (kg)", {
            type: "number",
            required: true,
            min: "0.001",
            max: "99999.999",
            step: "0.001",
          })}
          {field("measured_at", "Measurement date", {
            type: "date",
            required: true,
            max: today,
          })}
        </div>
      )}
      {kind === "medical" && (
        <>
          {field("event_date", "History / event date", {
            type: "date",
            required: true,
            max: today,
          })}
          {field("summary", "Summary / description", {
            type: "textarea",
            required: true,
            maxLength: 10000,
          })}
        </>
      )}
      {kind === "allergy" && (
        <>
          {field("allergen", "Allergen", { required: true, maxLength: 255 })}
          {field("reaction", "Known reaction", {
            type: "textarea",
            maxLength: 3000,
          })}
          <div className="form-grid">
            <Select
              label="Severity"
              value={v.severity}
              onChange={(e) => set("severity", e.target.value)}
            >
              {["unknown", "mild", "moderate", "severe"].map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
            <Select
              label="Status"
              required
              value={v.status}
              onChange={(e) => set("status", e.target.value)}
            >
              {["active", "resolved", "entered_in_error"].map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
          {field("identified_at", "Date identified", {
            type: "date",
            max: today,
          })}
        </>
      )}
      {kind === "vaccination" && (
        <>
          <Select
            label="Vaccine"
            required
            value={v.vaccine_definition_id}
            onChange={(e) => set("vaccine_definition_id", e.target.value)}
          >
            <option value="">Select vaccine</option>
            {vaccines.map((vaccine) => (
              <option key={vaccine.id} value={vaccine.id}>
                {vaccine.name}
              </option>
            ))}
          </Select>
          <div className="form-grid">
            {field("administered_at", "Administration date", {
              type: "date",
              required: true,
              max: today,
            })}
            {field("next_due_at", "Next due date (if recorded)", {
              type: "date",
              min: v.administered_at,
            })}
          </div>
          <div className="form-grid">
            {field("dose", "Dose information", { maxLength: 255 })}
            {field("batch_number", "Batch / lot number", { maxLength: 255 })}
          </div>
          {field(
            "administering_clinic",
            "Administering veterinarian / clinic",
            { maxLength: 255 },
          )}
        </>
      )}
      {field("notes", "Supporting notes (optional)", {
        type: "textarea",
        maxLength: 10000,
      })}
    </>
  );
}
