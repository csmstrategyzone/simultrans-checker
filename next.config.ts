import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer must run unbundled in the Node server runtime.
  serverExternalPackages: ["@react-pdf/renderer"],

  // The PDF route reads its TTFs off disk from public/fonts. Static assets are
  // served from the CDN and are not otherwise traced into the function bundle,
  // so without this the route builds cleanly and then throws ENOENT at runtime.
  outputFileTracingIncludes: {
    "/api/report/generate": ["public/fonts/**/*"],
  },
};

export default nextConfig;
