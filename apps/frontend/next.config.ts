import type { NextConfig } from 'next';
import path from 'path';
import fs from 'fs';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
