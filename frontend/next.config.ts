import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* output: "export", // Removed to allow dynamic routes */
  images: {
    unoptimized: true,
  },

};

export default nextConfig;
