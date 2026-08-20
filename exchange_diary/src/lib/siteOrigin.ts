import { headers } from "next/headers";

export async function resolveSiteOrigin() {
  const headersList = await headers();
  const forwardedProto = headersList.get("x-forwarded-proto");
  const host = headersList.get("host");
  const protocol = forwardedProto ?? (host?.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}
