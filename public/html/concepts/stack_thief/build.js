/**
 * Build script for Poki Backbone
 * 1. Bundle JS (strip ES module imports/exports, concatenate)
 * 2. Obfuscate JS
 * 3. Build release HTML
 * 4. Copy assets
 */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const SRC_DIR = __dirname;
const RELEASE_DIR = path.join(__dirname, 'release');

// JS files in dependency order (poki.js and audio.js are non-module globals, rest are ES modules)
const JS_FILES = [
    'js/poki.js',
    'js/audio.js',
    'js/input.js',
    'js/game.js',
    'js/main.js',
];

// ============================================================
// HELPERS
// ============================================================

function clean() {
    if (fs.existsSync(RELEASE_DIR)) {
        fs.rmSync(RELEASE_DIR, { recursive: true });
    }
    fs.mkdirSync(path.join(RELEASE_DIR, 'js'), { recursive: true });
    fs.mkdirSync(path.join(RELEASE_DIR, 'assets'), { recursive: true });
    console.log('Cleaned and created release/');
}

// ============================================================
// ASSET COPY
// ============================================================

function copyAssets() {
    console.log('\nCopying assets...');

    const srcAssets = path.join(SRC_DIR, 'assets');
    const destAssets = path.join(RELEASE_DIR, 'assets');

    if (!fs.existsSync(srcAssets)) {
        console.log('  No assets/ directory found');
        return;
    }

    function copyDir(src, dest) {
        var entries = fs.readdirSync(src, { withFileTypes: true });
        for (var entry of entries) {
            var srcPath = path.join(src, entry.name);
            var destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
                fs.mkdirSync(destPath, { recursive: true });
                copyDir(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
                var size = fs.statSync(destPath).size;
                console.log('  ' + path.relative(RELEASE_DIR, destPath) + ' (' + (size / 1024).toFixed(1) + ' KB)');
            }
        }
    }

    copyDir(srcAssets, destAssets);
}

// ============================================================
// JS BUNDLING
// ============================================================

function bundleJS() {
    console.log('\nBundling JS...');

    let combined = '';
    for (const file of JS_FILES) {
        const filePath = path.join(SRC_DIR, file);
        if (!fs.existsSync(filePath)) {
            console.warn('  Warning: ' + file + ' not found');
            continue;
        }

        let code = fs.readFileSync(filePath, 'utf8');

        // Strip ES module import lines
        // import { ... } from '...';
        code = code.replace(/^\s*import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"];\s*$/gm, '');
        // import * as X from '...';
        code = code.replace(/^\s*import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]+['"];\s*$/gm, '');
        // import '...';
        code = code.replace(/^\s*import\s+['"][^'"]+['"];\s*$/gm, '');

        // Strip export prefix from declarations
        code = code.replace(/^export\s+(function\s)/gm, '$1');
        code = code.replace(/^export\s+(const\s)/gm, '$1');
        code = code.replace(/^export\s+(let\s)/gm, '$1');
        code = code.replace(/^export\s+(async\s)/gm, '$1');
        code = code.replace(/^export\s+(class\s)/gm, '$1');
        // Strip: export { ... };
        code = code.replace(/^export\s+\{[^}]*\};\s*$/gm, '');

        combined += '// === ' + file + ' ===\n';
        combined += code;
        combined += '\n\n';
    }

    console.log('Obfuscating JS...');
    const obfuscated = JavaScriptObfuscator.obfuscate(combined, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.2,
        debugProtection: false,
        disableConsoleOutput: false,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        numbersToExpressions: true,
        renameGlobals: false,
        selfDefending: false,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 10,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: ['base64'],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 2,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 4,
        stringArrayWrappersType: 'function',
        stringArrayThreshold: 0.75,
        transformObjectKeys: true,
        unicodeEscapeSequence: false,
    });

    const outputPath = path.join(RELEASE_DIR, 'js', 'game.min.js');
    fs.writeFileSync(outputPath, obfuscated.getObfuscatedCode());
    const size = fs.statSync(outputPath).size;
    console.log('  game.min.js (' + (size / 1024).toFixed(1) + ' KB)');
}

// ============================================================
// HTML BUILD
// ============================================================

function buildHTML() {
    console.log('\nBuilding HTML...');

    const srcHTML = path.join(SRC_DIR, 'index.html');
    let html = fs.readFileSync(srcHTML, 'utf8');

    // Remove all <script> tags
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>\s*/g, '');

    // Insert Poki SDK + bundled JS before </body>
    const scripts = [
        '<script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>',
        '<script src="js/game.min.js"></script>',
    ].join('\n');

    html = html.replace('</body>', scripts + '\n</body>');

    const outputPath = path.join(RELEASE_DIR, 'index.html');
    fs.writeFileSync(outputPath, html);
    const size = fs.statSync(outputPath).size;
    console.log('  index.html (' + (size / 1024).toFixed(1) + ' KB)');
}

// ============================================================
// CSS COPY
// ============================================================

function copyCSS() {
    console.log('\nCopying CSS...');
    const srcCSS = path.join(SRC_DIR, 'css', 'styles.css');
    const destDir = path.join(RELEASE_DIR, 'css');
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(srcCSS, path.join(destDir, 'styles.css'));
    const size = fs.statSync(path.join(destDir, 'styles.css')).size;
    console.log('  styles.css (' + (size / 1024).toFixed(1) + ' KB)');
}

// ============================================================
// SUMMARY
// ============================================================

function printSummary() {
    console.log('\n=== Release Summary ===');
    let totalSize = 0;

    function listDir(dir, prefix) {
        const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                console.log(prefix + entry.name + '/');
                listDir(fullPath, prefix + '  ');
            } else {
                const size = fs.statSync(fullPath).size;
                totalSize += size;
                console.log(prefix + entry.name + ' (' + (size / 1024).toFixed(1) + ' KB)');
            }
        }
    }

    listDir(RELEASE_DIR, '  ');
    console.log('\nTotal: ' + (totalSize / 1024).toFixed(1) + ' KB (' + (totalSize / (1024 * 1024)).toFixed(2) + ' MB)');
}

// ============================================================
// RUN
// ============================================================

console.log('Building Poki Backbone...\n');
clean();
copyAssets();
copyCSS();
bundleJS();
buildHTML();
printSummary();
console.log('\nBuild complete!');
