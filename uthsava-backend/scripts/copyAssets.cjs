const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const assetsToCopy = [
  {
    name: "locales",
    sourceDir: path.join(rootDir, "src", "locales"),
    targetDir: path.join(rootDir, "dist", "locales"),
  },
  {
    name: "templates",
    sourceDir: path.join(rootDir, "src", "templates"),
    targetDir: path.join(rootDir, "dist", "templates"),
  },
];

const filesToCopy = [
  {
    name: "firebase.json",
    source: path.join(rootDir, "src", "core", "config", "firebase.json"),
    target: path.join(rootDir, "dist", "core", "config", "firebase.json"),
  },
];

for (const asset of assetsToCopy) {
  if (!fs.existsSync(asset.sourceDir)) {
    throw new Error(
      `Source ${asset.name} directory not found: ${asset.sourceDir}`,
    );
  }

  fs.mkdirSync(asset.targetDir, { recursive: true });
  fs.cpSync(asset.sourceDir, asset.targetDir, { recursive: true, force: true });
}

for (const file of filesToCopy) {
  if (!fs.existsSync(file.source)) {
    console.warn(
      `Warning: ${file.name} not found at ${file.source}, skipping.`,
    );
    continue;
  }

  fs.mkdirSync(path.dirname(file.target), { recursive: true });
  fs.copyFileSync(file.source, file.target);
}
