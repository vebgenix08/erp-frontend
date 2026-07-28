import { InstitutionProfileSettings } from "../../features/tenant-settings/ui/institution-profile";
import { useSession } from "../../features/session/model/session-provider";
import { Card, CardContent } from "../../shared/ui/card";
import { Badge } from "../../shared/ui/badge";
import { UserRound } from "lucide-react";

export function AdminProfilePage() {
  const {session}=useSession();
  const email=session?.user.email??"—";
  const role=(session?.user.role??"Tenant user").replaceAll("_"," ");
  return <section className="space-y-8">
    <div><h1 className="text-2xl font-bold text-slate-900">Profile</h1><p className="mt-1 text-sm text-slate-500">Your account and the organisation identity used throughout this tenant workspace.</p></div>
    <div><h2 className="mb-3 text-base font-bold text-slate-900">User profile</h2><Card><CardContent className="flex flex-wrap items-center gap-4 p-5"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700"><UserRound size={26}/></span><div className="min-w-0 flex-1"><p className="truncate text-base font-bold text-slate-900">{email}</p><p className="mt-1 text-sm text-slate-500">Authenticated institution account</p></div><Badge variant="brand">{role}</Badge></CardContent></Card></div>
    <div><h2 className="mb-3 text-base font-bold text-slate-900">Organisation details</h2><InstitutionProfileSettings/></div>
  </section>;
}
