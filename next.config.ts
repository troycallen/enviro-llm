import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/cli/**']
    };
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['cli']
  }
};

export default nextConfig;
