module.exports = {
  apps: [
    {
      name: "uthsava-api",
      script: "dist/app.js",
      env: {
        NODE_ENV: "development",
      },
      env_staging: {
        NODE_ENV: "staging",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
