const fs = require('fs');
const path = require('path');

const src = path.join(process.cwd(), 'generated');
const dest = path.join(process.cwd(), 'dist', 'generated');

async function copyDir(srcDir, destDir) {
  try {
    await fs.promises.mkdir(destDir, { recursive: true });
    const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  } catch (err) {
    console.error('Error copying generated directory:', err);
    process.exitCode = 1;
  }
}

(async () => {
  try {
    const stat = await fs.promises.stat(src);
    if (!stat.isDirectory()) {
      console.log('No generated directory found, skipping copy.');
      return;
    }
  } catch (err) {
    console.log('No generated directory found, skipping copy.');
    return;
  }

  console.log(`Copying ${src} -> ${dest}`);
  await copyDir(src, dest);
  console.log('Copy complete.');
})();
