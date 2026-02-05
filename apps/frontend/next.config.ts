import type { NextConfig } from 'next';
import path from 'path';
import fs from 'fs';
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: process.platform === 'win32' ? undefined : 'standalone',
  outputFileTracingRoot: process.platform === 'win32' ? undefined : path.join(__dirname, '../../'),

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'm.samkyoung.com',
      },
      {
        protocol: 'https',
        hostname: 'k.kakaocdn.net',
      },
      {
        protocol: 'https',
        hostname: 'ssl.pstatic.net',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'peekle.17e308f1a411f94915bdc92cf298e9be.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: 'pub-09a6ac9bff27427fabb6a07fc05033c0.r2.dev',
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  experimental: {
    reactCompiler: true,
    optimizePackageImports: [
      'fabric',
      '@monaco-editor/react',
      'lucide-react',
      'recharts',
      '@radix-ui/react-icons',
    ],
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
      {
        source: '/oauth2/:path*',
        destination: 'http://localhost:8080/oauth2/:path*',
      },
      {
        source: '/login/oauth2/:path*',
        destination: 'http://localhost:8080/login/oauth2/:path*',
      },
    ];
  },

  webpack: (config) => {
    config.externals.push({
      canvas: 'commonjs canvas',
      jsdom: 'commonjs jsdom',
      bufferutil: 'commonjs bufferutil',
      'utf-8-validate': 'commonjs utf-8-validate',
    });

    // SVG를 컴포넌트로도 쓰고 URL로도 쓰기 위한 설정
    const fileLoaderRule = config.module.rules.find((rule: any) =>
      rule.test?.test?.('.svg'),
    );

    if (fileLoaderRule) {
      config.module.rules.push(
        // URL로 가져오기 (import icon from './icon.svg?url')
        {
          ...fileLoaderRule,
          test: /\.svg$/i,
          resourceQuery: /url/, // *.svg?url
        },
        // 컴포넌트로 가져오기 (import Icon from './icon.svg')
        {
          test: /\.svg$/i,
          issuer: fileLoaderRule.issuer,
          resourceQuery: { not: [/url/] }, // *.svg?url 이 아닌 경우
          use: ['@svgr/webpack'],
        },
      );

      // 기존 SVG 룰에서 SVG 제외 (커스텀 룰에서 처리하므로)
      fileLoaderRule.exclude = /\.svg$/i;
    }

    return config;
  },
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig);
