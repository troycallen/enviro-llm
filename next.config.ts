import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/cli/**']
    };
    return config;
  },
  serverExternalPackages: ['cli']
};

export default nextConfig;
