#!/usr/bin/env node
/**
 * Makes a Strapi app of one version, with the plugin installed as a user installs it: from the
 * package npm would publish (`npm pack`), not from this folder. The tests then run against it:
 *
 *   node scripts/strapi-app.mjs 4.26.2            # makes .apps/strapi-4.26.2
 *   DESK_APP=.apps/strapi-4.26.2 pnpm test        # runs the suite on it
 *
 * DESK_NODE names the Node that runs that Strapi (Strapi 4.0 runs on Node 12 to 16 only); the
 * app's dependencies are installed with it, so that their native parts are built for it.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/strapi-app.mjs <strapi version>');
  process.exit(1);
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const apps = path.join(root, '.apps');
const app = path.join(apps, `strapi-${version}`);
const node = process.env.DESK_NODE || process.execPath;
const env = { ...process.env, PATH: `${path.dirname(node)}${path.delimiter}${process.env.PATH}` };
const nodeMajor = Number(execFileSync(node, ['-p', 'process.versions.node.split(".")[0]'], { encoding: 'utf8' }).trim());

/*
 * The admin's own dependencies, as `create-strapi-app` writes them for each version: Strapi 5
 * and Strapi 4 from 4.15 ask the app for React, its router and styled-components. Strapi 4.0
 * brings its own, but a fresh install today draws two copies of formik, and its login page
 * breaks on them: the app pins the one @strapi/helper-plugin 4.0 was built with. (ajv 8 for the
 * later Strapi 4: without it npm hoists ajv 6, and its command line cannot start.)
 */
const [major, minor] = version === 'latest' ? [Infinity, 0] : version.split('.').map(Number);
const adminDependencies =
  major >= 5
    ? { react: '^18.0.0', 'react-dom': '^18.0.0', 'react-router-dom': '^6.0.0', 'styled-components': '^6.0.0' }
    : minor >= 15
      ? { react: '^18.0.0', 'react-dom': '^18.0.0', 'react-router-dom': '^5.3.4', 'styled-components': '^5.3.3', ajv: '^8.0.0' }
      : { formik: '2.2.9' };

mkdirSync(apps, { recursive: true });
for (const file of readdirSync(apps)) if (file.endsWith('.tgz')) rmSync(path.join(apps, file));
if (!process.env.DESK_NO_BUILD) execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
execFileSync('npm', ['pack', '--pack-destination', apps], { cwd: root, stdio: 'inherit' });
const tarball = readdirSync(apps).find((file) => file.endsWith('.tgz'));

rmSync(app, { recursive: true, force: true });
mkdirSync(app, { recursive: true });
for (const part of ['config', 'src', 'public']) cpSync(path.join(root, 'tests', 'app', part), path.join(app, part), { recursive: true });

if (major === 4 && minor < 15) {
  // Strapi 4.0's admin calls a global regeneratorRuntime that nothing defines any more: its
  // login page throws, with or without any plugin. The app gives it one through webpack.
  mkdirSync(path.join(app, 'src', 'admin'), { recursive: true });
  writeFileSync(
    path.join(app, 'src', 'admin', 'webpack.config.js'),
    "'use strict';\n\nmodule.exports = (config, webpack) => {\n  config.plugins.push(new webpack.ProvidePlugin({ regeneratorRuntime: 'regenerator-runtime/runtime' }));\n  return config;\n};\n"
  );
}

writeFileSync(
  path.join(app, 'package.json'),
  JSON.stringify(
    {
      name: `aparte-desk-strapi-${version}`,
      private: true,
      version: '0.0.0',
      dependencies: {
        '@strapi/strapi': version,
        // Every new app has it: the site's users, whose JWT the chat reads.
        '@strapi/plugin-users-permissions': version,
        // The SQLite driver, at a version built for that Node: better-sqlite3, and sqlite3 for
        // the first releases of Strapi 4, whose "sqlite" client was knex's sqlite3.
        'better-sqlite3': nodeMajor <= 16 ? '8.7.0' : '11.10.0',
        ...(version.startsWith('4.') ? { sqlite3: '5.1.7' } : {}),
        '@aparte/strapi-desk': `file:../${tarball}`,
        // What a new app of that version lists itself, for its admin panel.
        ...adminDependencies,
      },
    },
    null,
    2
  ) + '\n'
);

execFileSync('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error', '--legacy-peer-deps'], { cwd: app, env, stdio: 'inherit' });
if (!existsSync(path.join(app, 'node_modules', '@aparte', 'strapi-desk', 'strapi-server.js'))) throw new Error('The plugin was not installed');
const installed = JSON.parse(readFileSync(path.join(app, 'node_modules', '@strapi', 'strapi', 'package.json'), 'utf8')).version;
console.log(`\nStrapi ${installed} in ${app} is ready: DESK_APP=${path.relative(root, app)}${process.env.DESK_NODE ? ` DESK_NODE=${node}` : ''} pnpm test`);
