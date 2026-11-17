import Link from "next/link";

export const metadata = { title: "No access | TaxEase AI" };

export default function UnauthorizedPage() {
  return (
    <>
      <h1>You do not have access</h1>
      <p className="auth-sub">Your account is not allowed to open that page. If you think this is a mistake, ask an administrator.</p>
      <Link href="/" className="btn btn-dark btn-block">
        Back to the dashboard
      </Link>
    </>
  );
}
