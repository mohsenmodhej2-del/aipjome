import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const violations = [];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(path));
    else if (['.ts', '.tsx', '.js', '.mjs'].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

for (const file of await filesUnder(join(root, 'app', 'api'))) {
  const source = await readFile(file, 'utf8');
  if (/\.prepare\s*\(/.test(source)) violations.push(`${relative(root, file)}: SQL is forbidden in HTTP routes`);
  if (/cloudflare:workers|@\/db\/schema|@\/lib\/server/.test(source)) violations.push(`${relative(root, file)}: infrastructure or compatibility imports are forbidden in HTTP routes`);
}

for (const file of await filesUnder(join(root, 'modules'))) {
  const source = await readFile(file, 'utf8');
  if (/from\s+['"]@?\/?app\//.test(source)) violations.push(`${relative(root, file)}: domain modules cannot depend on app`);
}

if (violations.length) {
  console.error('Architecture boundary check failed:\n' + violations.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}
console.log('Architecture boundary check passed: HTTP routes are thin and modules do not depend on app.');
