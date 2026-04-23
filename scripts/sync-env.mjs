import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputFilePath = resolve(workspaceRoot, 'public', 'env.js');
const modeArgument = process.argv.find((argument) => argument.startsWith('--mode='));
const mode = modeArgument?.split('=')[1] ?? 'development';

const envFileCandidates = mode === 'production'
  ? ['.env.production.example', '.env.production']
  : ['.env.example', '.env'];

const parseEnv = (source) => {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .reduce((accumulator, line) => {
      const separatorIndex = line.indexOf('=');

      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^['\"]|['\"]$/g, '');

      return {
        ...accumulator,
        [key]: value
      };
    }, {});
};

let envConfig = {};
const sourceFiles = [];

for (const candidate of envFileCandidates) {
  const envFilePath = resolve(workspaceRoot, candidate);

  try {
    envConfig = {
      ...envConfig,
      ...parseEnv(readFileSync(envFilePath, 'utf-8'))
    };
    sourceFiles.push(candidate);
  } catch {
    // Ignore missing environment files and continue with the next candidate.
  }
}

mkdirSync(dirname(outputFilePath), { recursive: true });

writeFileSync(
  outputFilePath,
  `window.__env = ${JSON.stringify(envConfig, null, 2)};\n`,
  'utf-8'
);

console.log(`Runtime environment synced to ${outputFilePath}`);
console.log(`Environment source: ${sourceFiles.join(', ') || 'inline defaults'} (${mode})`);