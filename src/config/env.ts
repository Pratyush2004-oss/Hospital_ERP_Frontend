import { z } from "zod";

function normalizeApiUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");

  // A leading slash means "same origin": the browser calls this Next.js app and
  // `next.config.ts` forwards `/api/v1/*` to the separately deployed API. That
  // keeps the auth cookies first-party, which production browsers require.
  if (trimmed.startsWith("/")) {
    if (trimmed === "/") return "/api/v1";
    if (trimmed.endsWith("/api/v1")) return trimmed;
    if (trimmed.endsWith("/api")) return `${trimmed}/v1`;
    return `${trimmed}/api/v1`;
  }

  if (trimmed === "") return "/api/v1";
  if (!trimmed.endsWith("/api/v1")) {
    if (trimmed.endsWith("/api")) {
      return `${trimmed}/v1`;
    }
    return `${trimmed}/api/v1`;
  }
  return trimmed;
}

const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .trim()
    .min(1)
    .default("http://localhost:4000/api/v1")
    .transform(normalizeApiUrl),
});

export const env = clientEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

