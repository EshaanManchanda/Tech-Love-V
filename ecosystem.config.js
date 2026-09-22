// PM2 process list for production. Run from the repo root: `pm2 start ecosystem.config.js`.
// Each app loads its own .env / .env.local from its own directory (see DEPLOY-HOSTINGER.md) —
// that's why every entry sets `cwd` rather than relying on the root directory.
module.exports = {
  apps: [
    {
      name: "api",
      cwd: "./apps/api",
      script: "dist/index.js",
      env: { NODE_ENV: "production" },
    },
    {
      name: "worker",
      cwd: "./apps/worker",
      script: "dist/index.js",
      env: { NODE_ENV: "production" },
    },
    {
      name: "web",
      cwd: "./apps/web",
      script: "npm",
      args: "run start -- -p 3000",
      env: { NODE_ENV: "production" },
    },
  ],
};
