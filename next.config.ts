import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer must run unbundled in the Node server runtime.
  serverExternalPackages: ["@react-pdf/renderer"],

  // The PDF route reads its TTFs and the header logo off disk from public/.
  // Static assets are served from the CDN and are not otherwise traced into the
  // function bundle, so without this the route builds cleanly and then throws
  // ENOENT at runtime.
  outputFileTracingIncludes: {
    "/api/report/generate": [
      "public/fonts/**/*",
      "public/SimulTrans Logo for INBOUND25 512x328 transparent characters.png",
    ],
  },
};

export default nextConfig;
