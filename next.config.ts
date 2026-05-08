import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/proyect-presentation",
        destination: "/proyect-presentation.html",
      },
    ];
  },
};

export default nextConfig;
