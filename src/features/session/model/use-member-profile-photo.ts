import { useEffect, useRef, useState } from "react";
import { getFileDownloadUrl } from "../../storage/api/files.api";

const MEMBER_PROFILE_PHOTO_UPDATED_EVENT = "erp:member-profile-photo-updated";

export function publishMemberProfilePhoto(photoUrl: string, fileId?: string): void {
  window.dispatchEvent(
    new CustomEvent(MEMBER_PROFILE_PHOTO_UPDATED_EVENT, { detail: { photoUrl, fileId } }),
  );
}

export function useMemberProfilePhoto(fileId: string | undefined): string | null {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const currentFileId = useRef(fileId);
  const revision = useRef(0);

  useEffect(() => {
    let active = true;
    currentFileId.current = fileId;
    revision.current += 1;
    setPhotoUrl(null);
    const refresh = () => {
      const id = currentFileId.current;
      if (!id) return;
      const requestRevision = ++revision.current;
      void getFileDownloadUrl(id)
        .then((url) => {
          if (active && requestRevision === revision.current) setPhotoUrl(url);
        })
        .catch(() => {
          if (active && requestRevision === revision.current) setPhotoUrl(null);
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
  }, [fileId]);

  useEffect(() => {
    const handle = (event: Event) => {
      const detail = (event as CustomEvent<{ photoUrl: string; fileId?: string }>).detail;
      revision.current += 1;
      if (detail.fileId) currentFileId.current = detail.fileId;
      setPhotoUrl(detail.photoUrl);
    };
    window.addEventListener(MEMBER_PROFILE_PHOTO_UPDATED_EVENT, handle);
    return () => window.removeEventListener(MEMBER_PROFILE_PHOTO_UPDATED_EVENT, handle);
  }, []);

  return photoUrl;
}
