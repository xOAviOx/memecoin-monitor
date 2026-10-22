import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ["@electric-sql/pglite", "pg", "web-push", "nodemailer"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
