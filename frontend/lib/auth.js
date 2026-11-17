// Thin wrappers around Supabase Auth. Every function returns plain results and readable errors.
import { getSupabase } from "./supabase";

const origin = () => window.location.origin;

export function friendlyAuthError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (message.includes("not confirmed")) return "Please confirm your email first. Check your inbox for the link.";
  if (message.includes("already registered") || message.includes("already been registered")) {
    return "This email already has an account. Try signing in or resetting your password.";
  }
  if (error?.status === 429 || message.includes("rate limit") || message.includes("too many")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (error?.name === "AuthRetryableFetchError" || message.includes("failed to fetch")) {
    return "Could not reach the sign-in service. Check your internet connection.";
  }
  if (message.includes("password")) return error.message;
  return "Something went wrong. Please try again.";
}

const result = (error, extra = {}) => ({
  error: error ? friendlyAuthError(error) : null,
  unconfirmed: /not confirmed/i.test(error?.message || ""),
  ...extra,
});

export async function signIn(email, password) {
  const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
  return result(error);
}

export async function signUp({ fullName, email, password }) {
  const { data, error } = await getSupabase().auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: fullName.trim() }, emailRedirectTo: `${origin()}/auth/callback` },
  });
  if (error) return result(error);
  // For an email that already has an account, Supabase answers with a user that has no identities.
  if (data.user && data.user.identities?.length === 0) {
    return { error: friendlyAuthError({ message: "already registered" }), signedIn: false };
  }
  return { error: null, signedIn: Boolean(data.session) };
}

export async function resendVerification(email) {
  const { error } = await getSupabase().auth.resend({
    type: "signup",
    email: email.trim(),
    options: { emailRedirectTo: `${origin()}/auth/callback` },
  });
  return result(error);
}

export async function requestPasswordReset(email) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${origin()}/reset-password`,
  });
  return result(error);
}

export async function changePassword(password) {
  const { error } = await getSupabase().auth.updateUser({ password });
  return result(error);
}

export async function signInWithGoogle(next) {
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  return result(error);
}
