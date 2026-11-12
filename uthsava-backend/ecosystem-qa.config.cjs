module.exports = {
  apps: [
    {
      name: "uthsava-api-qa",
      script: "dist/app.js",
      env: {
        NODE_ENV: "development",
      },
      env_qa: {
        NODE_ENV: "qa",
      },
    },
  ],
};
