export const formatDate = (iso) =>
  new Date(iso).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const formatFull = (iso) =>
  new Date(iso).toLocaleString([], { dateStyle: "full", timeStyle: "medium" });
