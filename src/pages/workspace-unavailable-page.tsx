import { useSession } from "../features/session/model/session-provider";
import { Button } from "../shared/ui/button";

export function WorkspaceUnavailablePage() {
  const { session, clearSession } = useSession();
  const role = (session?.user.role ?? "Assigned role").replaceAll("_", " ").toLowerCase();
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <section className="max-w-lg space-y-4 rounded-xl border bg-white p-8">
        <h1 className="text-xl font-semibold">Workspace not available yet</h1>
        <p>
          Your {role} account is signed in, but this role’s workspace is not available. Contact your
          institution administrator for access to a supported workspace.
        </p>
        <Button onClick={clearSession}>Sign out</Button>
      </section>
    </main>
  );
}
