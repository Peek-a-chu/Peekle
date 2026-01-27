import type { NextConfig } from 'next';
import path from 'path';
import fs from 'fs';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
