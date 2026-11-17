// Small helpers for showing numbers and dates the Indian way.

const rupeeFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function rupees(amount) {
  const number = Number(amount);
  if (!Number.isFinite(number)) return "-";
  const sign = number < 0 ? "-" : "";
  return `${sign}₹${rupeeFormat.format(Math.abs(Math.round(number)))}`;
}

export function formatDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate + "T00:00:00");
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function daysText(days) {
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

// "GSTR-1 (sales details)" -> "GSTR-1"
export function shortName(name) {
  return String(name).split(" (")[0].replace("instalment ", "").replace("Employer issues ", "");
}

// Turn what the person typed into a number. Commas and spaces are ignored.
export function toNumber(text) {
  const cleaned = String(text ?? "").replace(/[,\s₹]/g, "");
  const number = parseFloat(cleaned);
  return Number.isFinite(number) ? number : 0;
}

export function timeAgo(iso) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}
