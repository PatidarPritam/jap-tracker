import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained production server for Azure App Service.
  // Produces .next/standalone/server.js with only the needed node_modules.
  output: "standalone",
  // Hide the floating Next.js dev indicator (the "N" badge) during `npm run
  // dev`. It never appears in production, but it was cluttering the login view.
  devIndicators: false,
};

export default nextConfig;
