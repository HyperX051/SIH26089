/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: process.env.MOBILE_BUILD === 'true' ? 'export' : undefined,
}

module.exports = nextConfig
