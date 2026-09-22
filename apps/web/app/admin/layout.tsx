import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function getMe(): Promise<{ _id: string; name: string; email: string; role: "customer" | "admin" } | null> {
  const res = await fetch(`${API_URL}/api/auth/me`, { headers: { cookie: cookies().toString() }, cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

// Server-side role gate — the client-side dashboard layout only checks "logged in",
// this one actually verifies admin role before rendering anything (no client flash).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getMe();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/dashboard");

  return (
    <PortalShell portal="admin" user={user}>
      {children}
    </PortalShell>
  );
}
