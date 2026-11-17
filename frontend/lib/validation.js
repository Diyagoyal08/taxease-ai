export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

// Keep these in step with the password rules in your Supabase project (docs/SETUP.md).
export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (password) => password.length >= 8 },
  { id: "lower", label: "A lowercase letter", test: (password) => /[a-z]/.test(password) },
  { id: "upper", label: "An uppercase letter", test: (password) => /[A-Z]/.test(password) },
  { id: "number", label: "A number", test: (password) => /\d/.test(password) },
];

export const passwordIsValid = (password) => PASSWORD_RULES.every((rule) => rule.test(password));

// Only allow redirects to pages inside this app (blocks "?next=https://evil.example").
export const safeNext = (value) => (typeof value === "string" && /^\/(?![/\\])/.test(value) ? value : "/");
