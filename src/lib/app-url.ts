function normalizeUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
}

function isLocalUrl(value: string) {
  const hostname = new URL(value).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function appUrl() {
  const configuredUrl = normalizeUrl(process.env.APP_URL);
  const isProductionRuntime = process.env.NODE_ENV === "production";

  if (configuredUrl && (!isProductionRuntime || !isLocalUrl(configuredUrl))) {
    return configuredUrl;
  }

  const vercelUrl = normalizeUrl(
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL,
  );
  if (vercelUrl) return vercelUrl;

  if (isProductionRuntime) {
    throw new Error(
      "A public application URL is required in production. Set APP_URL to the deployed HTTPS URL.",
    );
  }

  return configuredUrl || `http://localhost:${process.env.PORT || "3000"}`;
}
