/** @type {import('next').NextConfig} */
const publicBaseUrl = process.env.AWS_S3_PUBLIC_BASE_URL
  ? new URL(process.env.AWS_S3_PUBLIC_BASE_URL)
  : (process.env.AWS_S3_BUCKET && process.env.AWS_REGION
      ? new URL(`https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`)
      : null);

const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      ...(publicBaseUrl ? [
        {
          protocol: publicBaseUrl.protocol.replace(":", ""),
          hostname: publicBaseUrl.hostname,
        },
      ] : []),
      {
        protocol: 'https',
        hostname: 'utfs.io',
      },
      {
        protocol: 'https',
        hostname: 'ufs.sh',
      },
    ],
  },
  serverExternalPackages: ['@prisma/client', 'bcrypt'],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

module.exports = nextConfig 
