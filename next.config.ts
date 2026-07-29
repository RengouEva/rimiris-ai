import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // VULN-19: Build errors are now fixed — re-enable type checking so future
  // type regressions fail the build instead of being silently shipped.
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
};

export default nextConfig;
