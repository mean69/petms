export const healthKinds = {
  weight: "Weight record",
  medical: "Medical history",
  allergy: "Allergy record",
  vaccination: "Vaccination record",
};
export const healthInitial = (kind, record = {}) => {
  const today = new Date().toLocaleDateString("en-CA");
  const defaults = {
    weight: { weight_kg: "", measured_at: today, notes: "" },
    medical: { event_date: today, summary: "", notes: "" },
    allergy: {
      allergen: "",
      reaction: "",
      severity: "unknown",
      identified_at: "",
      status: "active",
      notes: "",
    },
    vaccination: {
      vaccine_definition_id: "",
      administered_at: today,
      next_due_at: "",
      dose: "",
      batch_number: "",
      administering_clinic: "",
      notes: "",
    },
  }[kind];
  return Object.fromEntries(
    Object.entries(defaults).map(([k, value]) => [k, record[k] ?? value]),
  );
};
export function cleanHealth(values) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      value === "" ? null : value,
    ]),
  );
}
