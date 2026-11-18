'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const pkg = require('../package.json');
async function build() {
  if (process.platform !== 'win32' || process.arch !== 'x64')
    throw new Error('The Windows x64 build requires a Windows x64 build host.');
  const runtime = path.dirname(require('electron'));
  const { createPackage } = await import('@electron/asar');
  const PE = await import('pe-library'),
    res = await import('resedit');
  const release = path.join(root, 'release'),
    out = path.join(release, 'AshenVow-Windows-x64');
  fs.mkdirSync(out, { recursive: true });
  fs.cpSync(runtime, out, {
    recursive: true,
    filter: (p) => !['electron.exe', 'default_app.asar', 'version'].includes(path.basename(p)),
  });
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'ashenvow-build-'));
  try {
    for (const file of ['index.html', 'assets', 'game', 'desktop.cjs', 'preload.cjs'])
      fs.cpSync(path.join(root, file), path.join(stage, file), { recursive: true });
    fs.writeFileSync(
      path.join(stage, 'package.json'),
      JSON.stringify({ name: pkg.name, productName: pkg.productName, version: pkg.version, main: pkg.main }),
    );
    await createPackage(stage, path.join(out, 'resources', 'app.asar'));
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
  const exe = PE.NtExecutable.from(fs.readFileSync(path.join(runtime, 'electron.exe')), { ignoreCert: true });
  const data = PE.NtExecutableResource.from(exe);
  const icons = res.Data.IconFile.from(fs.readFileSync(path.join(root, 'assets/app.ico'))).icons.map(
    (i) => i.data,
  );
  const groups = res.Resource.IconGroupEntry.fromEntries(data.entries);
  for (const g of groups)
    res.Resource.IconGroupEntry.replaceIconsForResource(data.entries, g.id, g.lang, icons);
  for (const vi of res.Resource.VersionInfo.fromEntries(data.entries)) {
    const [major, minor, patch] = pkg.version.split('.').map(Number);
    vi.setFileVersion(major, minor, patch, 0, 1033);
    vi.setProductVersion(major, minor, patch, 0, 1033);
    vi.setStringValues(
      { lang: 1033, codepage: 1200 },
      {
        FileDescription: '灰烬誓约 · Ashen Vow',
        ProductName: 'Ashen Vow',
        InternalName: 'AshenVow',
        OriginalFilename: 'AshenVow.exe',
        CompanyName: 'Ashen Vow',
        LegalCopyright: 'Ashen Vow. Electron and Chromium license notices accompany this build.',
      },
    );
    vi.outputToResourceEntries(data.entries);
  }
  data.outputResource(exe);
  fs.writeFileSync(path.join(out, 'AshenVow.exe'), Buffer.from(exe.generate()));
  fs.copyFileSync(path.join(root, '游玩说明.txt'), path.join(out, '游玩说明.txt'));
  const zip = path.join(release, 'AshenVow-' + pkg.version + '-Windows-x64.zip');
  execFileSync('tar.exe', ['-a', '-cf', zip, '-C', release, path.basename(out)], { stdio: 'inherit' });
  console.log(zip + ' (' + (fs.statSync(zip).size / 1048576).toFixed(1) + ' MiB)');
}
build().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
