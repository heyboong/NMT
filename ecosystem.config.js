module.exports = {
  apps: [
    {
      name: 'p2p-rate-proxy',
      script: 'p2p-rate-proxy.js',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000
      },
      watch: false
    }
  ]
};
