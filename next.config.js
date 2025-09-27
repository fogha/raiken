/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone build for Docker
  output: 'standalone',
  
  // Exclude examples directory from build
  experimental: {
    outputFileTracingExcludes: {
      '*': ['./examples/**/*'],
    },
  },
  
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
    
    // Exclude examples from webpack compilation
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/examples/**', '**/node_modules/**'],
    };
    
    return config;
  },
};

module.exports = nextConfig; 