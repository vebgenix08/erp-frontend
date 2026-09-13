import { useEffect, useState } from "react";
import { getFileDownloadUrl } from "../../storage/api/files.api";

const MEMBER_PROFILE_PHOTO_UPDATED_EVENT = "erp:member-profile-photo-updated";

export function publishMemberProfilePhoto(photoUrl: string): void {
  window.dispatchEvent(
    new CustomEvent<string>(MEMBER_PROFILE_PHOTO_UPDATED_EVENT, { detail: photoUrl }),
  );
}

export function useMemberProfilePhoto(fileId: string | undefined): string | null {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!fileId) {
      setPhotoUrl(null);
      return () => {
        active = false;
      };
    }
    void getFileDownloadUrl(fileId)
      .then((url) => {
        if (active) setPhotoUrl(url);
      })
      .catch(() => {
        if (active) setPhotoUrl(null);
      });
    return () => {
      active = false;
    };
  }, [fileId]);

  useEffect(() => {
    const handle = (event: Event) => {
      setPhotoUrl((event as CustomEvent<string>).detail);
    };
    window.addEventListener(MEMBER_PROFILE_PHOTO_UPDATED_EVENT, handle);
    return () => window.removeEventListener(MEMBER_PROFILE_PHOTO_UPDATED_EVENT, handle);
  }, []);

  return photoUrl;
}
