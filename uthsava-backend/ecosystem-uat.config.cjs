module.exports = {
  apps: [
    {
      name: "uthsava-api-uat",
      script: "dist/app.js",
      env: {
        NODE_ENV: "development",
      },
      env_uat: {
        NODE_ENV: "uat",
      },
    },
  ],
};
