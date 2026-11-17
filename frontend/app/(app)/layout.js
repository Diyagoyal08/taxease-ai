import RequireAuth from "@/components/RequireAuth";
import Shell from "@/components/Shell";

export default function AppLayout({ children }) {
  return (
    <RequireAuth>
      <Shell>{children}</Shell>
    </RequireAuth>
  );
}
