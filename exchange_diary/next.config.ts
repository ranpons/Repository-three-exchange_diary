import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // The diary accepts one image up to 5 MB. Leave room for multipart data.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
