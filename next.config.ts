import type { NextConfig } from "next";

// Static export for GitHub Pages. The site is fully prerendered (no server
// runtime), so `output: 'export'` produces a static bundle in `out/`.
// Pages serves project sites under /<repo>, so the asset/base path is set to
// the repo name in CI via BASE_PATH.
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
