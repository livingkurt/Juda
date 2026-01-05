import withSerwist from "@serwist/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  // Empty turbopack config to silence warning
  turbopack: {},
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
  },
};

export default withSerwist({
  swSrc: "lib/sw.js",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development", // Disable in dev due to Turbopack incompatibility
})(nextConfig);
