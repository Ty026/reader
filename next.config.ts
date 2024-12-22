import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
  devIndicators: {
    buildActivity: true,
    appIsrStatus: true,
    buildActivityPosition: "bottom-right",
  },
};

export default nextConfig;
