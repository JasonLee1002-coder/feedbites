import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: '/feedbites',
  env: {
    NEXT_PUBLIC_BASE_PATH: '/feedbites',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'transtep-rd.s3.ap-northeast-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'poc.mcstation.ai',
      },
    ],
  },
};

export default nextConfig;
