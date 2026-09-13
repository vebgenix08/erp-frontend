export const INSTITUTION_BRANDING_UPDATED_EVENT = "erp:institution-branding-updated";

export interface InstitutionBrandingUpdate {
  name?: string | null;
  logoUrl?: string | null;
}

export function publishInstitutionBranding(update: InstitutionBrandingUpdate): void {
  window.dispatchEvent(
    new CustomEvent<InstitutionBrandingUpdate>(INSTITUTION_BRANDING_UPDATED_EVENT, {
      detail: update,
    }),
  );
}

export function subscribeToInstitutionBranding(
  listener: (update: InstitutionBrandingUpdate) => void,
): () => void {
  const handle = (event: Event) => {
    listener((event as CustomEvent<InstitutionBrandingUpdate>).detail);
  };
  window.addEventListener(INSTITUTION_BRANDING_UPDATED_EVENT, handle);
  return () => window.removeEventListener(INSTITUTION_BRANDING_UPDATED_EVENT, handle);
}
