// Release build for Zombaby Bouncer (Poki).
//
// The game ships as flat global <script> files (not ES modules), so the build
// concatenates the game scripts in load order and MINIFIES them into a single
// js/game.min.js with esbuild's transform API. The already-minified vendor engine
// (planck.min.js) is copied as-is. Art is re-encoded smaller (Pillow) and the music
// is down-bitrated to mono (ffmpeg) so the initial download stays well under Poki's
// 8 MB target. index.html is rewritten to load the bundle and set the DEV_TOOLS flag.
//
// TWO BUILD PATHS:
//   npm run build                -> RELEASE: DEV_TOOLS=false (ads ON, test hook dead),
//                                   minified.            Output: release/   (SUBMIT THIS)
//   npm run build -- --testing   -> TESTING: DEV_TOOLS=true (ads OFF), NOT minified,
//                                   for on-Poki playtesting.   Output: release-test/

import { transform } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const TESTING = process.argv.includes('--testing');
const OUTDIR = path.join(ROOT, TESTING ? 'release-test' : 'release');

// Game scripts in load order (poki before main; planck is copied separately).
const GAME_SCRIPTS = [
  'js/poki.js', 'js/input.js', 'js/assets.js', 'js/ragdoll.js', 'js/physics.js', 'js/main.js',
];
const VENDOR = ['js/planck.min.js'];
const COPY_FILES = ['favicon.ico'];
const FONT_FILES = ['assets/fonts/hobo.woff2', 'assets/fonts/hobo.ttf'];
// SFX are already tiny; copied verbatim. The music is the one big asset, so it is
// re-encoded to mono at a low bitrate (see compressAudio).
const SFX = ['giggle1', 'giggle2', 'giggle3', 'babyBrains', 'bounce', 'doing', 'click1', 'click2', 'needle'];
const MUSIC = 'tune1';

function copyFile(rel) {
  const src = path.join(ROOT, rel), dest = path.join(OUTDIR, rel);
  if (!fs.existsSync(src)) throw new Error('missing file ' + rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function prepareDir() {
  if (fs.existsSync(OUTDIR)) fs.rmSync(OUTDIR, { recursive: true });
  fs.mkdirSync(path.join(OUTDIR, 'js'), { recursive: true });
  console.log('Created output directory ' + path.relative(ROOT, OUTDIR) + '/');
}

async function buildJS() {
  console.log('Bundling game scripts (' + (TESTING ? 'unminified' : 'minified') + ')...');
  const concat = GAME_SCRIPTS.map((f) => '// ===== ' + f + ' =====\n' + fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  let code = concat;
  if (!TESTING) {
    const res = await transform(concat, { minify: true, target: 'es2019', legalComments: 'none' });
    code = res.code;
  }
  fs.writeFileSync(path.join(OUTDIR, 'js', 'game.min.js'), code);
  console.log('Created js/game.min.js (' + (fs.statSync(path.join(OUTDIR, 'js', 'game.min.js')).size / 1024 | 0) + ' KB)');
}

// Pillow: lossless PNG optimise (+ downscale guard) for every art file. A failure
// throws so the build stops loudly rather than shipping the raw or nothing.
function compressImages() {
  console.log('Compressing images (Pillow)...');
  const script = path.join(ROOT, 'tools', 'compress_image.py');
  const srcDir = path.join(ROOT, 'assets', 'grfx');
  const destDir = path.join(OUTDIR, 'assets', 'grfx');
  fs.mkdirSync(destDir, { recursive: true });
  let before = 0, after = 0;
  for (const f of fs.readdirSync(srcDir)) {
    if (!f.toLowerCase().endsWith('.png')) continue;
    const src = path.join(srcDir, f), dest = path.join(destDir, f);
    before += fs.statSync(src).size;
    try {
      execFileSync('python', [script, src, dest, '--max-dim', '2048'], { stdio: 'pipe' });
    } catch (e) {
      throw new Error('image compression failed for ' + f + ' (needs python + Pillow): ' + e.message);
    }
    after += fs.statSync(dest).size;
  }
  console.log('  grfx ' + (before / 1024 | 0) + ' KB -> ' + (after / 1024 | 0) + ' KB');
}

// ffmpeg: re-encode the music to mono at a low bitrate (the one large asset). SFX
// are already tiny, so they are copied verbatim.
function compressAudio() {
  console.log('Compressing audio (ffmpeg)...');
  const srcDir = path.join(ROOT, 'assets', 'audio');
  const destDir = path.join(OUTDIR, 'assets', 'audio');
  fs.mkdirSync(destDir, { recursive: true });
  for (const n of SFX) copyFile(path.join('assets', 'audio', n + '.ogg'));
  const src = path.join(srcDir, MUSIC + '.ogg'), dest = path.join(destDir, MUSIC + '.ogg');
  const before = fs.statSync(src).size;
  try {
    execFileSync('ffmpeg', ['-y', '-i', src, '-ac', '1', '-b:a', '64k', '-c:a', 'libvorbis', dest], { stdio: 'pipe' });
  } catch (e) {
    throw new Error('audio compression failed for ' + MUSIC + ' (needs ffmpeg on PATH): ' + e.message);
  }
  console.log('  ' + MUSIC + '.ogg ' + (before / 1024 | 0) + ' KB -> ' + (fs.statSync(dest).size / 1024 | 0) + ' KB');
}

// Rewrite index.html: drop the six dev <script> tags for the single bundle, and set
// the DEV_TOOLS flag to the build-path literal. The Poki SDK <script> is untouched.
function rewriteIndexHtml() {
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  html = html.replace(/window\.DEV_TOOLS = true;/, 'window.DEV_TOOLS = ' + String(TESTING) + ';');
  // Collapse the game script tags (poki..main) into one bundle reference; keep planck.
  html = html.replace(/\s*<script src="js\/poki\.js"><\/script>[\s\S]*?<script src="js\/main\.js"><\/script>/,
    '\n  <script src="js/game.min.js"></script>');
  fs.writeFileSync(path.join(OUTDIR, 'index.html'), html);
  console.log('Rewrote index.html to use js/game.min.js');
}

function copyStatic() {
  for (const v of VENDOR) copyFile(v);
  for (const f of FONT_FILES) copyFile(f);
  for (const f of COPY_FILES) if (fs.existsSync(path.join(ROOT, f))) copyFile(f);
}

console.log('Building Zombaby Bouncer (' + (TESTING ? 'TESTING - DEV_TOOLS in, ads OFF, unminified' : 'RELEASE - DEV_TOOLS stripped, ads ON, minified') + ')...\n');
prepareDir();
copyStatic();
await buildJS();
compressImages();
compressAudio();
rewriteIndexHtml();

// Report the total shipped size (the number Poki cares about).
function dirSize(d) {
  let t = 0;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    t += e.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return t;
}
console.log('\nBuild complete - output in ' + path.relative(ROOT, OUTDIR) + '/  (total ' + (dirSize(OUTDIR) / 1024 / 1024).toFixed(2) + ' MB)');
