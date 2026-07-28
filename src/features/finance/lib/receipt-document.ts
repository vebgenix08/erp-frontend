import { getCognitoIdToken } from "../../../shared/auth/cognito-token";
import { env } from "../../../shared/config/env";
import type { FinanceReceipt } from "../model/finance-operations.types";

export type ReceiptCopyMode = "student" | "both";

async function receiptBlob(
  paymentId: string,
  copies: ReceiptCopyMode,
): Promise<Blob> {
  const token = await getCognitoIdToken();
  if (!token) throw new Error("Your session has expired. Sign in again.");

  const response = await fetch(
    `${env.apiBaseUrl.replace(/\/$/, "")}/v1/payments/${encodeURIComponent(paymentId)}/receipt.pdf?copies=${copies}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(
      error?.message ?? "Receipt document could not be generated",
    );
  }
  return response.blob();
}

export async function downloadReceiptPdf(
  receipt: FinanceReceipt,
  copies: ReceiptCopyMode = "student",
) {
  const url = URL.createObjectURL(await receiptBlob(receipt.paymentId, copies));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = receipt.fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function printReceiptPdf(
  receipt: FinanceReceipt,
  copies: ReceiptCopyMode = "student",
) {
  const url = URL.createObjectURL(
    await receiptBlob(receipt.paymentId, copies),
  );
  const frame = document.createElement("iframe");
  frame.title = `Print receipt ${receipt.receiptNumber}`;
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.border = "0";
  frame.style.opacity = "0";

  const cleanup = () => {
    frame.remove();
    URL.revokeObjectURL(url);
  };
  frame.addEventListener(
    "load",
    () => {
      const target = frame.contentWindow;
      if (!target) {
        cleanup();
        return;
      }
      target.addEventListener("afterprint", cleanup, { once: true });
      target.focus();
      target.print();
      window.setTimeout(cleanup, 60_000);
    },
    { once: true },
  );
  frame.src = url;
  document.body.append(frame);
}
