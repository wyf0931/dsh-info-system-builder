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
import path from 'node:path';
import { validateAndNormalize, renderFlaskAdmin, IsdValidationError } from './render/flask_admin.js';

export const inject = ['tools', 'fs', 'sessions'];

const TOOL_DESCRIPTION = `Render an Info System Definition (ISD) into a complete, runnable Flask-Admin + SQLite project.

Use this as the final step of building a lightweight internal information system (admin CRUD app) from the user's plain-language requirement. You do the design thinking (requirement expansion, modules, fields); this tool does the deterministic rendering.

WHEN to call:
- After you have designed the ISD blueprint (modules + fields) for an information-system request.
- Call it once per blueprint revision. It is idempotent: editing the ISD and re-rendering regenerates the project cleanly.

BEFORE calling:
1. Design modules (PascalCase names + Chinese labels, default max 6) and fields (snake_case names + Chinese labels, default max 15 per module). Field types: string/text/integer/float/boolean/date/time/datetime.
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
