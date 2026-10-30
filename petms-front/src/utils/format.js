export const roleLabel = (role) =>
  ({
    administrator: "Administrator",
    staff: "Veterinarian / Clinic Staff",
    client: "Pet Owner",
  })[role] || role;
export const dateLabel = (value) =>
  value
    ? new Intl.DateTimeFormat("en-PH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value.length === 10 ? value + "T00:00:00" : value))
    : "Not recorded";
