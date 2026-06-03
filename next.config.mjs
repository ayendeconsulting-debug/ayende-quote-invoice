/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
  // @react-pdf/renderer ships its own bundled deps; keep it external to the
  // server bundle so it loads cleanly in route handlers.
  serverExternalPackages: ["@react-pdf/renderer"],
  // Ensure the bundled PDF font files are included in the serverless output
  // (matters when deploying to Vercel in Phase 9; harmless locally).
  outputFileTracingIncludes: {
    "/quotes/[id]/pdf": ["./src/lib/pdf/fonts/**"],
    "/q/[token]/pdf": ["./src/lib/pdf/fonts/**"],
    "/invoices/[id]/pdf": ["./src/lib/pdf/fonts/**"],
  },
};
export default nextConfig;
