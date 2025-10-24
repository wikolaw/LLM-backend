/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // For server-side, mark canvas as external to avoid webpack bundling issues
      config.externals = config.externals || []
      config.externals.push('canvas')
    }

    // Ignore node-specific modules that cause issues with webpack
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    }

    return config
  },
}

module.exports = nextConfig
