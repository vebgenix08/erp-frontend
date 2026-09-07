import { getCognitoIdToken } from "../../../shared/auth/cognito-token";
import { env } from "../../../shared/config/env";

export interface StoredFile {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes?: number;
  metadata?: Record<string, string>;
  status: "PENDING_UPLOAD" | "AVAILABLE" | "DELETED";
  scopeType: "TENANT" | "CAMPUS" | "ACADEMIC_YEAR" | "CLASS" | "SECTION" | "STUDENT" | "PUBLIC";
  scopeId?: string;
  createdAt?: string;
}

interface UploadUrlResponse {
  file: StoredFile;
  uploadUrl: string;
  headers?: Record<string, string>;
}

async function storageRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getCognitoIdToken();
  if (!token) throw new Error("Cognito session is required for file operations");
  const response = await fetch(`${env.apiBaseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      authorization: token,
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload =
    response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new Error(
      (payload as { message?: string } | undefined)?.message ??
        `File request failed with status ${response.status}`,
    );
  }
  return payload as T;
}

export async function uploadFile(input: {
  file: File;
  scopeType: StoredFile["scopeType"];
  scopeId?: string;
  metadata?: Record<string, string>;
}): Promise<StoredFile> {
  const upload = await storageRequest<UploadUrlResponse>("/files/upload-url", {
    method: "POST",
    body: JSON.stringify({
      fileName: input.file.name,
      contentType: input.file.type || "application/octet-stream",
      sizeBytes: input.file.size,
      scopeType: input.scopeType,
      ...(input.scopeId ? { scopeId: input.scopeId } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    }),
  });
  const put = await fetch(upload.uploadUrl, {
    method: "PUT",
    ...(upload.headers ? { headers: upload.headers } : {}),
    body: input.file,
  });
  if (!put.ok) throw new Error(`S3 upload failed with status ${put.status}`);
  return storageRequest<StoredFile>(`/files/${upload.file.id}/complete-upload`, { method: "POST" });
}

export async function getFileDownloadUrl(fileId: string): Promise<string> {
  const result = await storageRequest<{ downloadUrl: string }>(
    `/files/${encodeURIComponent(fileId)}/download-url`,
    {
      method: "POST",
      body: JSON.stringify({ expiresInSeconds: 3600 }),
    },
  );
  return result.downloadUrl;
}
export async function listFiles(filter: {
  scopeType?: StoredFile["scopeType"];
  scopeId?: string;
  status?: StoredFile["status"];
}): Promise<StoredFile[]> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) if (value) query.set(key, value);
  return storageRequest<StoredFile[]>(`/files?${query.toString()}`);
}

export async function deleteFile(fileId: string): Promise<void> {
  await storageRequest<void>(`/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
  });
}
