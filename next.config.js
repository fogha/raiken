/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone build for Docker
  output: 'standalone',
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };

      // Monaco Editor webpack configuration
      config.module.rules.push({
        test: /\.ttf$/,
        type: 'asset/resource',
      });
    }
    return config;
  },
};

module.exports = nextConfig; 