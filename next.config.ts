import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  outputFileTracingIncludes: {
    "/*": ["./certs/prod-ca-2021.crt"],
  },
};

export default nextConfig;
