// All calls to your FastAPI backend live in this one file.
// Change the address with NEXT_PUBLIC_API_URL in .env.local if needed.

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// FastAPI sends validation problems as a list. Turn them into one readable line.
function readableDetail(detail) {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const where = Array.isArray(item.loc) ? item.loc.slice(1).join(" > ") : "";
        return where ? `${where}: ${item.msg}` : item.msg;
      })
      .join("; ");
  }
  return "";
}

// Set by AuthProvider: where to get the login token, and what to do when it is refused.
let authBridge = { getToken: async () => null, onExpired: () => {} };
export const setAuthBridge = (bridge) => {
  authBridge = bridge;
};

async function request(path, options = {}) {
  const token = await authBridge.getToken();
  const headers = { ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  let response;
  try {
    response = await fetch(API_URL + path, { ...options, headers });
  } catch {
    throw new ApiError(
      `Cannot reach the backend at ${API_URL}. Start it from the backend folder with: uvicorn main:app --reload`,
      0
    );
  }
  if (response.status === 401) {
    authBridge.onExpired();
    throw new ApiError("Your session expired. Please sign in again.", 401);
  }
  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = readableDetail(body.detail);
    } catch {
      /* the error body was not JSON */
    }
    throw new ApiError(detail || `The backend answered with an error (${response.status}).`, response.status);
  }
  return response;
}

async function postJson(path, body) {
  const response = await request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

async function postFiles(path, fieldName, files) {
  const form = new FormData();
  files.forEach((file) => form.append(fieldName, file));
  const response = await request(path, { method: "POST", body: form });
  return response.json();
}

// ---- one small function per backend endpoint ----

export async function ping() {
  const response = await request("/");
  return response.json();
}

export async function getDeadlines() {
  const response = await request("/deadlines");
  return response.json();
}

export const calculateTax = (input) => postJson("/tax/calculate", input);

export async function downloadTaxPdf(input) {
  const response = await request("/summary/tax-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.blob();
}

export const readForm16 = (file) => postFiles("/documents/form16", "file", [file]);
export const readBills = (files) => postFiles("/documents/bills", "files", files);
export const checkInvoices = (invoices) => postJson("/gst/validate", invoices);
export const checkPan = (value) => postJson("/validate/pan", { value });
export const checkGstin = (value) => postJson("/validate/gstin", { value });
export const askAssistant = (question) => postJson("/chat", { question });
