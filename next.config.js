/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { hostname: 'via.placeholder.com' },
      { hostname: 'placehold.co' },
    ],
  },
}

module.exports = nextConfig
