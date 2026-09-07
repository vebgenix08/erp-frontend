import { env } from "../config/env";

interface CognitoAuthenticationResult {
  IdToken?: string;
}

interface CognitoResponse {
  AuthenticationResult?: CognitoAuthenticationResult;
  ChallengeName?: string;
  Session?: string;
  ChallengeParameters?: Record<string, string>;
  message?: string;
  __type?: string;
}

export class CognitoAuthError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "CognitoAuthError";
  }
}

export function validateNewPassword(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 12) errors.push("Use at least 12 characters");
  if (!/[A-Z]/.test(password)) errors.push("Add an uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("Add a lowercase letter");
  if (!/\d/.test(password)) errors.push("Add a number");
  return errors;
}

export type SignInResult =
  | { type: "authenticated"; idToken: string }
  | { type: "new-password-required"; session: string; username: string };

async function cognitoRequest(
  target: string,
  body: Record<string, unknown>,
): Promise<CognitoResponse> {
  if (!env.awsRegion || !env.cognitoClientId) {
    throw new Error("Cognito frontend configuration is incomplete");
  }

  const response = await fetch(`https://cognito-idp.${env.awsRegion}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "content-type": "application/x-amz-json-1.1",
      "x-amz-target": `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as CognitoResponse;
  if (!response.ok) {
    const code = payload.__type?.split("#").pop() || "AuthenticationError";
    throw new CognitoAuthError(payload.message || code, code);
  }
  return payload;
}

export async function signIn(username: string, password: string): Promise<SignInResult> {
  const normalizedUsername = username.trim().toLowerCase();
  const payload = await cognitoRequest("InitiateAuth", {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: env.cognitoClientId,
    AuthParameters: { USERNAME: normalizedUsername, PASSWORD: password },
  });

  if (payload.ChallengeName === "NEW_PASSWORD_REQUIRED" && payload.Session) {
    return {
      type: "new-password-required",
      session: payload.Session,
      username: normalizedUsername,
    };
  }
  const idToken = payload.AuthenticationResult?.IdToken;
  if (!idToken)
    throw new Error(`Unsupported Cognito challenge: ${payload.ChallengeName ?? "unknown"}`);
  return { type: "authenticated", idToken };
}

export async function completeNewPassword(input: {
  username: string;
  newPassword: string;
  session: string;
}): Promise<string> {
  const validationErrors = validateNewPassword(input.newPassword);
  if (validationErrors.length)
    throw new CognitoAuthError(validationErrors.join(". "), "PasswordPolicyError");
  const payload = await cognitoRequest("RespondToAuthChallenge", {
    ChallengeName: "NEW_PASSWORD_REQUIRED",
    ClientId: env.cognitoClientId,
    Session: input.session,
    ChallengeResponses: { USERNAME: input.username, NEW_PASSWORD: input.newPassword },
  });
  const idToken = payload.AuthenticationResult?.IdToken;
  if (!idToken) throw new Error("Cognito did not return an ID token after password change");
  return idToken;
}
