type RuntimeEnv = Partial<Record<"VITE_API_BASE_URL" | "VITE_GRAPHQL_URL" | "VITE_AWS_REGION" | "VITE_COGNITO_CLIENT_ID" | "VITE_APP_NAME", string>>;

const developmentDefaults: Required<RuntimeEnv> = {
  VITE_API_BASE_URL: "https://cl2bdnzdfc.execute-api.ap-south-1.amazonaws.com",
  VITE_GRAPHQL_URL: "https://cvhvlqs5bjdp3hu4e5dfusigx4.appsync-api.ap-south-1.amazonaws.com/graphql",
  VITE_AWS_REGION: "ap-south-1",
  VITE_COGNITO_CLIENT_ID: "7vebgt37o3gg0vrj41ndr79d6v",
  VITE_APP_NAME: "Vebgenix",
};

declare global {
  interface Window {
    __ERP_RUNTIME_ENV__?: RuntimeEnv;
  }
}

function readEnv(name: keyof RuntimeEnv): string {
  const runtimeValue = window.__ERP_RUNTIME_ENV__?.[name];
  if (typeof runtimeValue === "string" && runtimeValue.trim()) return runtimeValue.trim();

  const buildValue = import.meta.env[name];
  if (typeof buildValue === "string" && buildValue.trim()) return buildValue.trim();

  return developmentDefaults[name];
}

export const env = {
  apiBaseUrl: readEnv("VITE_API_BASE_URL"),
  graphqlUrl: readEnv("VITE_GRAPHQL_URL"),
  awsRegion: readEnv("VITE_AWS_REGION"),
  cognitoClientId: readEnv("VITE_COGNITO_CLIENT_ID"),
  appName: readEnv("VITE_APP_NAME"),
};
