// .pnpmfile.cjs
function readPackage(pkg) {
  // Allow all build scripts to run
  if (pkg.name === 'canvas' || pkg.name === 'sharp' || pkg.name === 'esbuild') {
    pkg.scripts = pkg.scripts || {};
    pkg.scripts.install = 'node-gyp rebuild'; // A common command, adjust if needed
    // For sharp, you might not need to specify the command, just re-enable the script
    delete pkg.scripts.preinstall;
    delete pkg.scripts.postinstall;
  }
  return pkg;
}

module.exports = {
  hooks: {
    readPackage
  }
};
