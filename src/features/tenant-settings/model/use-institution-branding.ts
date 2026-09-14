import { useEffect, useState } from "react";
import { getFileDownloadUrl } from "../../storage/api/files.api";
import { getInstitutionBranding } from "../api/settings.api";
import { subscribeToInstitutionBranding } from "./institution-branding";

export function useInstitutionBranding(tenantId: string | undefined) {
  const [name, setName] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setName(null);
    setLogoUrl(null);
    const refresh = () => {
      void getInstitutionBranding()
        .then(async (profile) => {
          if (!active) return;
          setName(profile?.name ?? null);
          const nextLogo = profile?.logoFileId
            ? await getFileDownloadUrl(profile.logoFileId)
            : (profile?.logoUrl ?? null);
          if (active) setLogoUrl(nextLogo);
        })
        .catch(() => {
          if (active) {
            setName(null);
            setLogoUrl(null);
          }
        });
    };
    refresh();
    const timer = window.setInterval(refresh, 45 * 60 * 1000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [tenantId]);

  useEffect(
    () =>
      subscribeToInstitutionBranding((update) => {
        if (update.name !== undefined) setName(update.name);
        if (update.logoUrl !== undefined) setLogoUrl(update.logoUrl);
      }),
    [],
  );

  return { name, logoUrl };
}
