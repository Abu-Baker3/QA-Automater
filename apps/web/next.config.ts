import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone output for Docker/Linux CI only (Windows dev lacks symlink permissions)
  ...(process.env.DOCKER_BUILD === 'true' ? { output: 'standalone' as const } : {}),
  transpilePackages: ['@qa-automater/ui'],
};

export default nextConfig;
