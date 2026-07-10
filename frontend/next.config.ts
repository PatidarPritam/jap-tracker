import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained production server for Azure App Service.
  // Produces .next/standalone/server.js with only the needed node_modules.
  output: "standalone",
};

export default nextConfig;
