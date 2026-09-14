import { getCognitoIdToken } from "../../../shared/auth/cognito-token";
import { env } from "../../../shared/config/env";
import { httpClient, type HttpRequestOptions } from "../../../shared/api/http-client";
import { createRequestSignal } from "../../../shared/api/request-signal";
import { coordinatedRequest } from "../../../shared/api/request-coordinator";
import { expireClientSession } from "../../../shared/auth/session-expiry";
import { ApiError } from "../../../shared/api/api-error";

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

async function storageRequest<T>(path: string, init?: HttpRequestOptions): Promise<T> {
  const token = await getCognitoIdToken();
  if (!token) {
    expireClientSession();
    throw new ApiError({
      code: "SESSION_EXPIRED",
      message: "Sign in again to manage files.",
      retryable: false,
      status: 401,
    });
  }
  return httpClient<T>(`${env.apiBaseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      authorization: token,
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
}

export async function uploadFile(input: {
  file: File;
  scopeType: StoredFile["scopeType"];
  scopeId?: string;
  metadata?: Record<string, string>;
  signal?: AbortSignal;
}): Promise<StoredFile> {
  const upload = await storageRequest<UploadUrlResponse>("/files/upload-url", {
    method: "POST",
    ...(input.signal ? { signal: input.signal } : {}),
    body: {
      fileName: input.file.name,
      contentType: input.file.type || "application/octet-stream",
      sizeBytes: input.file.size,
      scopeType: input.scopeType,
      ...(input.scopeId ? { scopeId: input.scopeId } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
  });
  await coordinatedRequest(
    async (signal) => {
      const deadline = createRequestSignal(120_000, signal);
      try {
        const put = await fetch(upload.uploadUrl, {
          method: "PUT",
          ...(upload.headers ? { headers: upload.headers } : {}),
          body: input.file,
          signal: deadline.signal,
        });
        if (!put.ok) throw new Error(`Upload failed with status ${put.status}`);
      } catch (error) {
        if (deadline.didTimeout())
          throw new Error("Upload timed out. Check your connection and try uploading again.");
        throw error;
      } finally {
        deadline.cleanup();
      }
    },
    {
      key: `upload:${upload.file.id}`,
      readOnly: false,
      ...(input.signal ? { signal: input.signal } : {}),
    },
  );
  return storageRequest<StoredFile>(`/files/${upload.file.id}/complete-upload`, {
    method: "POST",
    ...(input.signal ? { signal: input.signal } : {}),
  });
}

export async function getFileDownloadUrl(fileId: string): Promise<string> {
  const result = await storageRequest<{ downloadUrl: string }>(
    `/files/${encodeURIComponent(fileId)}/download-url`,
    {
      method: "POST",
      body: { expiresInSeconds: 3600 },
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
