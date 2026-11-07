/**
 * Info System Builder — Host half.
 *
 * Registers the `info_system_render` tool: a deterministic renderer that turns
 * an ISD (Info System Definition, `system.isd.json`) into a complete,
 * runnable Flask-Admin + SQLite project under the session workspace.
 *
 * The agent owns the thinking steps (requirement expansion, module/field
 * design, ISD authoring); this tool owns the deterministic step (render).
 * Re-rendering the same ISD is idempotent — edit the ISD, render again.
 */

import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { validateAndNormalize, renderFlaskAdmin, IsdValidationError } from './render/flask_admin.js';

export const inject = ['tools', 'fs', 'sessions', 'webServer', 'workspaceRegistry'];

/** Live preview processes, keyed by `<workspacePath>::<slug>`. */
const previews = new Map();

const TOOL_DESCRIPTION = `Render an Info System Definition (ISD) into a complete, runnable Flask-Admin + SQLite project.

Use this as the final step of building a lightweight internal information system (admin CRUD app) from the user's plain-language requirement. You do the design thinking (requirement expansion, modules, fields); this tool does the deterministic rendering.

WHEN to call:
- After you have designed the ISD blueprint (modules + fields) for an information-system request.
- Call it once per blueprint revision. It is idempotent: editing the ISD and re-rendering regenerates the project cleanly.

BEFORE calling:
1. Design modules (PascalCase names + Chinese labels, default max 6) and fields (snake_case names + Chinese labels, default max 15 per module). Field types: string/text/integer/float/boolean/date/time/datetime/enum. For status/category-like fields prefer { "type": "enum", "choices": ["待领用", "已领用", "维修中"] } — the generated form renders a dropdown and SQLite stores the label.
2. Never invent fields named id, created_time, modified_time (auto-added) and never define a User module (built-in auth with admin/admin123).
3. Write the ISD to \`info-systems/<slug>/system.isd.json\` under the session workspace, then pass isd_path — this makes the definition a durable, user-editable asset. (Passing inline `+"`isd`"+` is fine for quick drafts.)
4. Show the blueprint to the user in your reply (a compact module × field table). Do not block on approval by default — users can request changes any time; just re-render after editing the ISD.

PARAMETERS:
- isd_path: path to system.isd.json (relative to the session workspace, or absolute). Prefer this.
- isd: alternative inline ISD object (exactly one of isd_path/isd is required).
- output_dir: optional output directory. Default: the \`project/\` folder next to the ISD file (inline mode: \`info-systems/<code>/project\` under the workspace).

RESULT: project directory, file list, startup command (uv run python run.py), default account, and validation warnings. Present the startup command and next-iteration guidance ("just tell me what to change; I edit the ISD and re-render") to the user.`;

const PARAMETERS_SCHEMA = {
  type: 'object',
  properties: {
    isd_path: {
      type: 'string',
      description: 'Path to the system.isd.json file (relative to the session workspace or absolute). Preferred over inline isd.',
    },
    isd: {
      type: 'object',
      description: 'Inline ISD document: { isd_version: 1, project: { name, code }, modules: [{ name, label, description, fields: [{ name, label, type, required, search }] }] }.',
    },
    output_dir: {
      type: 'string',
      description: 'Optional output directory for the generated project. Defaults to a project/ folder beside the ISD.',
    },
  },
};

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    project_dir: { type: 'string' },
    code: { type: 'string' },
    file_count: { type: 'integer' },
    files: { type: 'array', items: { type: 'string' } },
    warnings: { type: 'array', items: { type: 'string' } },
    errors: { type: 'array', items: { type: 'object' } },
    run_command: { type: 'string' },
    admin_account: { type: 'string' },
  },
  required: ['ok'],
};

export function apply(ctx) {
  ctx.effect(() => ctx.tools.register(makeRenderTool(ctx)), 'info-system-builder: register info_system_render');

  // Project-management HTTP routes for the wizard panel.
  ctx.effect(() => {
    const disposers = registerProjectRoutes(ctx);
    console.log('[info-system-builder] project routes registered:',
      disposers.length, 'routes');
    return () => {
      for (const dispose of disposers) dispose();
      // Unloading the plugin must not leave preview servers running.
      for (const [, entry] of previews) {
        try {
          entry.child.kill('SIGTERM');
        } catch {
          // already gone
        }
      }
      previews.clear();
    };
  }, 'info-system-builder: register project routes');
}

/* -------------------------------------------------------------------------- */
/* Project management routes                                                   */
/* -------------------------------------------------------------------------- */

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const ROUTE_PREFIX = '/info-system-builder/';

/**
 * Register the panel's project routes on the web server.
 * @param {object} ctx - a context holding webServer + workspaceRegistry.
 * @returns {Array<() => void>} route disposers.
 */
function registerProjectRoutes(ctx) {
  const server = ctx.webServer;
  const registry = ctx.workspaceRegistry;

  const handler = async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const route = url.pathname.slice(ROUTE_PREFIX.length);
    try {
      if (route === 'projects' && req.method === 'GET') {
        return json(res, 200, { projects: listProjects(registry) });
      }
      if (route === 'delete' && req.method === 'POST') {
        const body = await readJson(req);
        const root = resolveProjectRoot(registry, body.workspacePath, body.slug);
        stopPreview(registry, body.workspacePath, body.slug);
        fs.rmSync(root, { recursive: true, force: true });
        return json(res, 200, { ok: true });
      }
      if (route === 'download' && req.method === 'GET') {
        const slug = url.searchParams.get('slug');
        const workspacePath = url.searchParams.get('workspacePath');
        const root = resolveProjectRoot(registry, workspacePath, slug);
        const sourceDir = fs.existsSync(path.join(root, 'project')) ? path.join(root, 'project') : root;
        res.writeHead(200, {
          'content-type': 'application/gzip',
          'content-disposition': `attachment; filename="${slug}.tar.gz"`,
          'cache-control': 'no-store',
        });
        const tar = spawn('tar', ['-czf', '-', '-C', sourceDir, '.']);
        tar.stdout.pipe(res);
        tar.on('error', () => { try { res.end(); } catch { /* closed */ } });
        return undefined;
      }
      if (route === 'preview/start' && req.method === 'POST') {
        const body = await readJson(req);
        const root = resolveProjectRoot(registry, body.workspacePath, body.slug);
        const projectDir = path.join(root, 'project');
        if (!fs.existsSync(path.join(projectDir, 'app.py'))) {
          return json(res, 400, { ok: false, error: 'project has not been rendered yet' });
        }
        const key = previewKey(body.workspacePath, body.slug);
        // Idempotent start: an already-running preview is returned as-is, so a
        // repeated click can never spawn a second server.
        const existing = previews.get(key);
        if (existing && existing.child.exitCode === null) {
          return json(res, 200, { ok: true, port: existing.port, url: `http://127.0.0.1:${existing.port}/admin/`, alreadyRunning: true });
        }
        previews.delete(key);
        const port = await freePort();
        let stderr = '';
        const child = spawn('uv', ['run', 'python', 'run.py', '--port', String(port)], {
          cwd: projectDir,
          stdio: ['ignore', 'ignore', 'pipe'],
          detached: false,
        });
        child.stderr.on('data', (chunk) => {
          stderr = (stderr + chunk.toString()).slice(-2000);
        });
        const entry = { child, port, startedAt: Date.now() };
        previews.set(key, entry);
        child.on('exit', () => {
          const current = previews.get(key);
          if (current && current.child === child) previews.delete(key);
        });
        // Give the server a moment to fail fast (missing venv, bad port, ...).
        await new Promise((resolve) => setTimeout(resolve, 600));
        if (child.exitCode !== null) {
          previews.delete(key);
          const tail = stderr.trim().split('\n').slice(-3).join(' | ') || 'unknown error';
          return json(res, 500, { ok: false, error: `preview exited immediately: ${tail}` });
        }
        return json(res, 200, { ok: true, port, url: `http://127.0.0.1:${port}/admin/`, started: true });
      }
      if (route === 'preview/stop' && req.method === 'POST') {
        const body = await readJson(req);
        const key = previewKey(body.workspacePath, body.slug);
        const entry = previews.get(key);
        stopPreview(registry, body.workspacePath, body.slug);
        return json(res, 200, { ok: true, stopped: Boolean(entry) });
      }
      if (route === 'reveal' && req.method === 'POST') {
        const body = await readJson(req);
        const root = resolveProjectRoot(registry, body.workspacePath, body.slug);
        const target = body.target === 'isd' ? path.join(root, 'system.isd.json') : path.join(root, 'project');
        const existing = fs.existsSync(target) ? target : root;
        const platform = process.platform;
        const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'explorer' : 'xdg-open';
        const args = platform === 'darwin' ? ['-R', existing] : [existing];
        try {
          spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
        } catch {
          // Non-fatal: the UI also shows the path for manual opening.
        }
        return json(res, 200, { ok: true, path: existing });
      }
      return json(res, 404, { ok: false, error: 'unknown route' });
    } catch (error) {
      return json(res, 400, { ok: false, error: String(error && error.message ? error.message : error) });
    }
  };

  const paths = [
    'projects', 'delete', 'download', 'preview/start', 'preview/stop', 'reveal',
  ];
  const routes = paths.map((path) => ({ kind: 'exact', path: ROUTE_PREFIX + path, handler }));
  const disposers = [];
  for (const route of routes) {
    try {
      disposers.push(server.register(route));
    } catch (error) {
      console.error('[info-system-builder] failed to register route', route.path, error);
    }
  }
  return disposers;
}

function previewKey(workspacePath, slug) {
  return `${workspacePath}::${slug}`;
}

function stopPreview(registry, workspacePath, slug) {
  const key = previewKey(workspacePath, slug);
  const entry = previews.get(key);
  if (!entry) return;
  try {
    entry.child.kill('SIGTERM');
  } catch {
    // already gone
  }
  previews.delete(key);
}

/**
 * List every generated information system across registered workspaces.
 * Reads only `<workspace>/info-systems/<slug>/` and never creates anything.
 */
function listProjects(registry) {
  const projects = [];
  let workspaces = [];
  try {
    workspaces = registry.list();
  } catch {
    return projects;
  }
  for (const workspace of workspaces) {
    const root = path.join(workspace.path, 'info-systems');
    let entries;
    try {
      entries = fs.readdirSync(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || !SLUG_RE.test(entry.name)) continue;
      const slug = entry.name;
      const dir = path.join(root, slug);
      const isdPath = path.join(dir, 'system.isd.json');
      const projectDir = path.join(dir, 'project');
      let name = slug;
      let moduleCount = 0;
      let fieldCount = 0;
      let updatedAt = 0;
      try {
        const isd = JSON.parse(fs.readFileSync(isdPath, 'utf8'));
        name = isd?.project?.name || slug;
        moduleCount = Array.isArray(isd.modules) ? isd.modules.length : 0;
        fieldCount = Array.isArray(isd.modules)
          ? isd.modules.reduce((sum, module) => sum + (Array.isArray(module.fields) ? module.fields.length : 0), 0)
          : 0;
        updatedAt = fs.statSync(isdPath).mtimeMs;
      } catch {
        // ISD missing or unreadable — still list the directory.
      }
      const rendered = fs.existsSync(path.join(projectDir, 'app.py'));
      const preview = previews.get(previewKey(workspace.path, slug));
      projects.push({
        slug,
        name,
        workspace: workspace.title || path.basename(workspace.path),
        workspacePath: workspace.path,
        projectDir,
        isdPath,
        rendered,
        moduleCount,
        fieldCount,
        updatedAt,
        preview: preview ? { port: preview.port, url: `http://127.0.0.1:${preview.port}/admin/` } : null,
      });
    }
  }
  projects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return projects;
}

/**
 * Resolve `<workspace>/info-systems/<slug>` after validating both inputs.
 * @throws when the workspace is unregistered, the slug is malformed, or the
 * resolved path escapes the workspace's info-systems directory.
 */
function resolveProjectRoot(registry, workspacePath, slug) {
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) throw new Error('invalid project slug');
  let workspaces = [];
  try {
    workspaces = registry.list();
  } catch {
    throw new Error('workspace registry unavailable');
  }
  const known = workspaces.some((workspace) => workspace.path === workspacePath);
  if (!known) throw new Error('unknown workspace');
  const infoRoot = path.join(workspacePath, 'info-systems');
  const target = path.resolve(infoRoot, slug);
  if (target !== path.join(infoRoot, slug)) throw new Error('path escapes the info-systems directory');
  if (!fs.existsSync(target)) throw new Error('project not found');
  return target;
}

/** First free loopback port. */
function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = address && typeof address === 'object' ? address.port : 0;
      server.close(() => (port ? resolve(port) : reject(new Error('could not allocate a port'))));
    });
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error('request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (error) {
        reject(new Error(`invalid JSON body: ${String(error)}`));
      }
    });
    req.on('error', reject);
  });
}

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
}

function makeRenderTool(ctx) {
  return {
    name: 'info_system_render',
    description: TOOL_DESCRIPTION,
    parameters: PARAMETERS_SCHEMA,
    timeoutMs: 120_000,
    isConcurrencySafe: () => false,
    async execute(args, exec) {
      const cwd = resolveCwd(ctx, exec);
      const signal = exec.signal;
      let warnings = [];

      // ---- 1. Load the ISD -------------------------------------------------
      let isdRaw;
      let isdPathForMeta;
      const hasInline = args && typeof args.isd === 'object' && args.isd !== null;
      const hasPath = typeof args?.isd_path === 'string' && args.isd_path.trim() !== '';
      if (hasInline === hasPath) {
        return {
          ok: false,
          errors: [{ message: 'Provide exactly one of `isd_path` (preferred) or `isd`.' }],
        };
      }
      if (hasPath) {
        isdPathForMeta = path.resolve(cwd, args.isd_path);
        const target = await ctx.fs.resolve(isdPathForMeta, { cwd, signal });
        let text;
        try {
          text = await ctx.fs.readText(target, signal);
        } catch (error) {
          return { ok: false, errors: [{ message: `Could not read ISD file ${args.isd_path}: ${String(error)}` }] };
        }
        try {
          isdRaw = JSON.parse(text);
        } catch (error) {
          return { ok: false, errors: [{ message: `ISD file is not valid JSON: ${String(error)}` }] };
        }
      } else {
        isdRaw = args.isd;
      }

      // ---- 2. Validate + normalize ----------------------------------------
      let isd;
      try {
        ({ isd, warnings } = validateAndNormalize(isdRaw));
      } catch (error) {
        if (error instanceof IsdValidationError) {
          return { ok: false, errors: error.errors };
        }
        throw error;
      }

      // ---- 3. Render --------------------------------------------------------
      const opts = {
        secret_key: randomBytes(32).toString('hex'),
        admin_account: 'admin',
        admin_password: 'admin123',
      };
      const { files } = renderFlaskAdmin(isd, opts);

      // ---- 4. Write the project --------------------------------------------
      const defaultDir = hasPath
        ? path.join(path.dirname(isdPathForMeta), 'project')
        : path.join(cwd, 'info-systems', isd.project.code, 'project');
      const projectDir = path.resolve(cwd, args.output_dir || defaultDir);

      const written = [];
      for (const [rel, content] of Object.entries(files)) {
        const abs = path.join(projectDir, rel);
        const target = await ctx.fs.resolve(abs, { cwd, signal });
        const outcome = await ctx.fs.writeText(target, content, undefined, signal);
        if (outcome && outcome.error) {
          return { ok: false, errors: [{ message: `Failed to write ${rel}: ${String(outcome.error)}` }] };
        }
        written.push(rel);
      }

      return {
        ok: true,
        project_dir: projectDir,
        code: isd.project.code,
        name: isd.project.name,
        file_count: written.length,
        files: written,
        warnings,
        isd_path: hasPath ? isdPathForMeta : undefined,
        run_command: 'uv run python run.py --init-db && uv run python run.py',
        admin_account: opts.admin_account,
        admin_password: opts.admin_password,
      };
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render(args, value) {
        const v = value ?? {};
        const lines = [];
        if (v.ok === false) {
          lines.push(`**渲染失败**`);
          for (const e of v.errors ?? []) {
            lines.push(`- ${e.path ? `\`${e.path}\` ` : ''}${e.message}`);
          }
          return [{ type: 'text', text: lines.join('\n') }];
        }
        lines.push(`**已生成 ${v.name ?? v.code}（Flask-Admin + SQLite）**`);
        lines.push('');
        lines.push(`- 目录：\`${v.project_dir}\``);
        lines.push(`- 文件：${v.file_count} 个（${(v.files ?? []).slice(0, 8).join('、')}${(v.files ?? []).length > 8 ? '…' : ''}）`);
        if (v.isd_path) lines.push(`- 定义文件：\`${v.isd_path}\``);
        if (v.warnings?.length) {
          lines.push(`- 警告：${v.warnings.join('；')}`);
        }
        lines.push(`- 启动：\`${v.run_command}\`（默认账号 ${v.admin_account} / ${v.admin_password}）`);
        return [{ type: 'text', text: lines.join('\n') }];
      },
    },
  };
}

/** Session workspace dir from the calling agent, falling back to process cwd. */
function resolveCwd(ctx, exec) {
  try {
    const session = exec?.agent?.id ? ctx.sessions.get(exec.agent.id) : undefined;
    const headerCwd = session?.header?.cwd;
    if (typeof headerCwd === 'string' && headerCwd) return headerCwd;
  } catch {
    // sessions service optional in exotic scopes — fall through.
  }
  return process.cwd();
}
