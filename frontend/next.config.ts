import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.bail = false;
    config.ignoreWarnings = [/.*/];
    config.optimization = {
      ...config.optimization,
      emitOnErrors: true,
    };
    return config;
  },
};

export default nextConfig;
