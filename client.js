/**
 * Info System Builder — Client half.
 *
 * Registers a sidebar panel entry + a main-panel wizard page: a guided cockpit
 * for turning one sentence into a running admin system. All styling goes
 * through --dsw-alias-* theme tokens (class prefix `isb-`), component-local
 * so unmounting removes it. Text is bilingual (zh/en), follows the DSH locale
 * service, defaults to Chinese, and stays readable in both themes.
 */

window.__ModuleLoader__.load({
  id: '@local/info-system-builder',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /* ------------------------------------------------------------------ */
    /* Dictionaries                                                       */
    /* ------------------------------------------------------------------ */
    const DICT = {
      zh: {
        'app.title': '信息系统生成器',
        'app.tagline': '从一句话到可运行的管理系统',
        'step.describe': '描述需求',
        'step.blueprint': '蓝图设计',
        'step.stack': '选择技术栈',
        'step.run': '生成运行',
        'hero.title': '告诉我你要管什么',
        'hero.hint': '一句话就够：谁在用、管什么东西、想记录和查什么。AI 会自动扩写成完整需求。',
        'hero.examples': '试试这些例子',
        'example.office': '帮我做一个办公用品管理系统，登记领用和库存',
        'example.resume': '做一个简历跟踪系统，记录候选人面试进度',
        'example.asset': '设备资产登记系统，管理电脑和外设的领用归属',
        'advanced.title': '高级选项（全部有默认值，可以不碰）',
        'advanced.modules': '模块数上限',
        'advanced.fields': '每模块字段数上限',
        'advanced.dir': '输出目录（留空使用默认）',
        'advanced.dirPlaceholder': 'info-systems/<slug>/',
        'actions.generate': '生成启动指令',
        'actions.copy': '复制指令',
        'actions.copied': '已复制 ✓ 现在粘贴到下方对话发送',
        'prompt.title': '你的启动指令',
        'auto.title': '接下来 AI 会自动完成',
        'auto.1': '需求扩写：识别业务领域、使用者与核心场景',
        'auto.2': '蓝图设计：划分模块、设计字段（类型/必填/可搜索/中文标签）',
        'auto.3': '写出 system.isd.json 定义文件，展示蓝图后直接渲染项目',
        'auto.confirmHint': '想改蓝图？任何时候直接说"把 XX 模块加个字段"，AI 改完定义文件重新渲染即可。',
        'stacks.title': '实现技术栈',
        'stacks.recommended': '推荐 · 默认',
        'stacks.soon': '即将支持',
        'stacks.why': '单命令启动（uv run）· 自带 SQLite · 中文界面 · 傻瓜式部署',
        'stacks.fastapi': 'SQLAdmin + uvicorn',
        'stacks.nextjs': 'Prisma + SQLite',
        'stacks.vue': 'Vite + Element Plus',
        'isd.title': 'ISD 定义文件速览（懂技术的你可以直接编辑它）',
        'isd.hint': '渲染工具把它当作"定制化语法文件"解析：改完重新渲染即可，幂等无副作用。',
        'isd.types': '# 字段类型: string / text / integer / float / boolean / date / time / datetime',
        'kickoff.intro': '请帮我生成一个内部信息系统。',
        'kickoff.requirement': '需求',
        'kickoff.conventions': '约定：',
        'kickoff.stack': '实现栈：Flask-Admin + SQLite（默认）',
        'kickoff.modules': '模块数上限',
        'kickoff.fields': '每模块字段上限',
        'kickoff.dir': '输出目录',
        'kickoff.blueprint': '请先设计 ISD 蓝图并写入 system.isd.json，展示蓝图概要，然后用 info_system_render 渲染项目并给出启动命令。',
      },
      en: {
        'app.title': 'Info System Builder',
        'app.tagline': 'From one sentence to a running admin system',
        'step.describe': 'Describe',
        'step.blueprint': 'Blueprint',
        'step.stack': 'Stack',
        'step.run': 'Generate & run',
        'hero.title': 'Tell me what you need to manage',
        'hero.hint': 'One sentence is enough: who uses it, what it tracks, what you search. AI expands it into full requirements.',
        'hero.examples': 'Try an example',
        'example.office': 'Build an office-supply system to track usage and stock',
        'example.resume': 'A resume tracker that follows candidates through interviews',
        'example.asset': 'An asset register for laptops and peripherals',
        'advanced.title': 'Advanced (all defaults, safe to skip)',
        'advanced.modules': 'Max modules',
        'advanced.fields': 'Max fields per module',
        'advanced.dir': 'Output directory (blank = default)',
        'advanced.dirPlaceholder': 'info-systems/<slug>/',
        'actions.generate': 'Generate kickoff prompt',
        'actions.copy': 'Copy prompt',
        'actions.copied': 'Copied ✓ now paste it into the chat below',
        'prompt.title': 'Your kickoff prompt',
        'auto.title': 'AI then does automatically',
        'auto.1': 'Expands the requirement: domain, users, key scenarios',
        'auto.2': 'Designs the blueprint: modules + fields (types/required/searchable/labels)',
        'auto.3': 'Writes system.isd.json, shows the blueprint, renders the project',
        'auto.confirmHint': 'Want changes? Just say "add a field to XX" any time — AI edits the ISD and re-renders.',
        'stacks.title': 'Implementation stack',
        'stacks.recommended': 'Recommended · default',
        'stacks.soon': 'Coming soon',
        'stacks.why': 'One-command start (uv run) · bundled SQLite · localized UI',
        'stacks.fastapi': 'SQLAdmin + uvicorn',
        'stacks.nextjs': 'Prisma + SQLite',
        'stacks.vue': 'Vite + Element Plus',
        'isd.title': 'ISD definition at a glance (technical users can edit it)',
        'isd.hint': 'The render tool parses it as a custom syntax file: edit and re-render, idempotent.',
        'isd.types': '# field types: string / text / integer / float / boolean / date / time / datetime',
        'kickoff.intro': 'Please build me an internal information system.',
        'kickoff.requirement': 'Requirement',
        'kickoff.conventions': 'Conventions:',
        'kickoff.stack': 'Stack: Flask-Admin + SQLite (default)',
        'kickoff.modules': 'Max modules',
        'kickoff.fields': 'Max fields per module',
        'kickoff.dir': 'Output dir',
        'kickoff.blueprint': 'Design the ISD blueprint into system.isd.json first, show a summary, then render with info_system_render and give the start command.',
      },
    };

    /**
     * Resolve the UI language: DSH locale service first (authoritative),
     * then browser language, then the product default — Chinese.
     *
     * When the locale service is present but its snapshot shape is unfamiliar,
     * default to Chinese rather than falling back to the browser: the host UI
     * language is the better signal, and Chinese is this product's primary
     * audience. Only an explicit English locale selects English.
     */
    function resolveLang(ctx) {
      try {
        const locale = ctx.get('locale');
        if (locale && typeof locale.getLocale === 'function') {
          const snap = locale.getLocale() || {};
          const id = String(snap.id || snap.locale || snap.language || '').toLowerCase();
          return id.startsWith('en') ? 'en' : 'zh';
        }
      } catch {
        // Optional service; fall through.
      }
      try {
        const nav = (navigator.language || '').toLowerCase();
        if (nav.startsWith('en')) return 'en';
      } catch {
        // Non-browser test environment.
      }
      return 'zh';
    }

    /** Text source: `t(key)` plus the resolved language code. */
    function makeTextSource(ctx) {
      const lang = resolveLang(ctx);
      const dict = DICT[lang] || DICT.zh;
      const t = (key) => dict[key] ?? DICT.zh[key] ?? key;
      t.lang = lang;
      return t;
    }

    /** Register this package's dictionaries with the DSH locale service. */
    function registerLocale(ctx) {
      try {
        const locale = ctx.get('locale');
        if (locale && typeof locale.register === 'function') {
          locale.register('info-system-builder', 'zh', DICT.zh);
          locale.register('info-system-builder', 'en', DICT.en);
        }
      } catch {
        // Locale service optional; built-in dictionaries already cover both.
      }
    }

    /* ------------------------------------------------------------------ */
    /* Panel icon (sidebar.panellist): renders the glyph at the given size */
    /* ------------------------------------------------------------------ */
    function PanelIcon(props) {
      const size = props.size || 20;
      const color = props.active ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-label-secondary)';
      return h('svg', {
        viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': true,
        style: { display: 'block', pointerEvents: 'none' },
      },
        h('path', {
          d: 'M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Z',
          fill: 'none', stroke: color, 'stroke-width': 1.6, 'stroke-linejoin': 'round',
        }),
        h('path', { d: 'M3 7.5 12 12l9-4.5M12 12v9', fill: 'none', stroke: color, 'stroke-width': 1.6 }));
    }

    /* ------------------------------------------------------------------ */
    /* Wizard page (main panel)                                           */
    /* ------------------------------------------------------------------ */
    function WizardPage(props) {
      const t = props.text;
      const [requirement, setRequirement] = React.useState('');
      const [maxModules, setMaxModules] = React.useState(6);
      const [maxFields, setMaxFields] = React.useState(15);
      const [outputDir, setOutputDir] = React.useState('');
      const [prompt, setPrompt] = React.useState(null);
      const [copied, setCopied] = React.useState(false);

      const buildPrompt = () => {
        const lines = [];
        lines.push(t('kickoff.intro'));
        lines.push('');
        lines.push(`${t('kickoff.requirement')}: ${requirement.trim()}`);
        lines.push('');
        lines.push(t('kickoff.conventions'));
        lines.push(`- ${t('kickoff.stack')}`);
        lines.push(`- ${t('kickoff.modules')}: ${maxModules}`);
        lines.push(`- ${t('kickoff.fields')}: ${maxFields}`);
        if (outputDir.trim()) lines.push(`- ${t('kickoff.dir')}: ${outputDir.trim()}`);
        lines.push(`- ${t('kickoff.blueprint')}`);
        return lines.join('\n');
      };

      const onGenerate = () => {
        if (!requirement.trim()) return;
        setPrompt(buildPrompt());
        setCopied(false);
      };

      const onCopy = async () => {
        if (!prompt) return;
        try {
          await navigator.clipboard.writeText(prompt);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch {
          const area = document.createElement('textarea');
          area.value = prompt;
          document.body.appendChild(area);
          area.select();
          try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* user copies manually */ }
          area.remove();
        }
      };

      const stepLabels = [t('step.describe'), t('step.blueprint'), t('step.stack'), t('step.run')];

      return h('div', { className: 'isb-root' },
        h(Style, null),
        // Header
        h('div', { className: 'isb-header' },
          h('div', { className: 'isb-header-icon' }, h(PanelIcon, { size: 26, active: true })),
          h('div', null,
            h('h1', { className: 'isb-title' }, t('app.title')),
            h('p', { className: 'isb-tagline' }, t('app.tagline')))),
        // Steps rail
        h('div', { className: 'isb-steps' },
          stepLabels.map((label, i) =>
            h('div', { key: label, className: 'isb-step' + (i === 0 ? ' isb-step-current' : '') },
              h('span', { className: 'isb-step-num' }, String(i + 1)),
              h('span', { className: 'isb-step-label' }, label)))),
        // Requirement workbench
        h('section', { className: 'isb-card' },
          h('h2', { className: 'isb-card-title' }, t('hero.title')),
          h('p', { className: 'isb-card-hint' }, t('hero.hint')),
          h('div', { className: 'isb-chip-row' },
            h('span', { className: 'isb-chip-label' }, t('hero.examples')),
            [t('example.office'), t('example.resume'), t('example.asset')].map((example, i) =>
              h('button', {
                key: i, className: 'isb-chip', type: 'button',
                onClick: () => { setRequirement(example); setPrompt(null); },
              }, example))),
          h('textarea', {
            className: 'isb-input',
            value: requirement,
            placeholder: t('example.office'),
            onChange: (e) => { setRequirement(e.target.value); setPrompt(null); },
          }),
          h('details', { className: 'isb-advanced' },
            h('summary', null, t('advanced.title')),
            h('div', { className: 'isb-advanced-grid' },
              h('label', { className: 'isb-advanced-item' },
                h('span', null, t('advanced.modules')),
                h('select', {
                  value: maxModules,
                  className: 'isb-select',
                  onChange: (e) => setMaxModules(Number(e.target.value)),
                }, [3, 4, 5, 6, 8, 10].map((n) => h('option', { key: n, value: n }, String(n))))),
              h('label', { className: 'isb-advanced-item' },
                h('span', null, t('advanced.fields')),
                h('select', {
                  value: maxFields,
                  className: 'isb-select',
                  onChange: (e) => setMaxFields(Number(e.target.value)),
                }, [8, 10, 12, 15, 20, 25].map((n) => h('option', { key: n, value: n }, String(n))))),
              h('label', { className: 'isb-advanced-item isb-advanced-item-wide' },
                h('span', null, t('advanced.dir')),
                h('input', {
                  className: 'isb-text',
                  value: outputDir,
                  onChange: (e) => setOutputDir(e.target.value),
                  placeholder: t('advanced.dirPlaceholder'),
                })))),
          h('div', { className: 'isb-actions' },
            h('button', {
              className: 'isb-btn-primary', type: 'button', disabled: !requirement.trim(),
              onClick: onGenerate,
            }, t('actions.generate')),
            prompt && h('button', { className: 'isb-btn-ghost', type: 'button', onClick: onCopy },
              copied ? t('actions.copied') : t('actions.copy'))),
          prompt && h('div', { className: 'isb-prompt' },
            h('div', { className: 'isb-prompt-head' }, t('prompt.title')),
            h('pre', { className: 'isb-pre' }, prompt))),
        // What AI does automatically
        h('section', { className: 'isb-card' },
          h('h2', { className: 'isb-card-title' }, t('auto.title')),
          h('ul', { className: 'isb-auto-list' },
            h('li', null, t('auto.1')),
            h('li', null, t('auto.2')),
            h('li', null, t('auto.3'))),
          h('p', { className: 'isb-confirm-hint' }, t('auto.confirmHint'))),
        // Stacks
        h('section', { className: 'isb-card' },
          h('h2', { className: 'isb-card-title' }, t('stacks.title')),
          h('div', { className: 'isb-stacks' },
            h('div', { className: 'isb-stack isb-stack-active' },
              h('div', { className: 'isb-stack-head' },
                h('span', { className: 'isb-stack-name' }, 'Flask-Admin'),
                h('span', { className: 'isb-stack-badge' }, t('stacks.recommended'))),
              h('p', { className: 'isb-stack-why' }, t('stacks.why'))),
            h('div', { className: 'isb-stack' },
              h('div', { className: 'isb-stack-head' },
                h('span', { className: 'isb-stack-name isb-stack-soon-name' }, 'FastAPI'),
                h('span', { className: 'isb-stack-badge-soon' }, t('stacks.soon'))),
              h('p', { className: 'isb-stack-why isb-stack-why-soon' }, t('stacks.fastapi'))),
            h('div', { className: 'isb-stack' },
              h('div', { className: 'isb-stack-head' },
                h('span', { className: 'isb-stack-name isb-stack-soon-name' }, 'Next.js'),
                h('span', { className: 'isb-stack-badge-soon' }, t('stacks.soon'))),
              h('p', { className: 'isb-stack-why isb-stack-why-soon' }, t('stacks.nextjs'))),
            h('div', { className: 'isb-stack' },
              h('div', { className: 'isb-stack-head' },
                h('span', { className: 'isb-stack-name isb-stack-soon-name' }, 'Vue'),
                h('span', { className: 'isb-stack-badge-soon' }, t('stacks.soon'))),
              h('p', { className: 'isb-stack-why isb-stack-why-soon' }, t('stacks.vue'))))),
        // ISD spec
        h('section', { className: 'isb-card' },
          h('details', null,
            h('summary', { className: 'isb-card-title isb-summary-title' }, t('isd.title')),
            h('p', { className: 'isb-card-hint' }, t('isd.hint')),
            h('pre', { className: 'isb-pre isd-pre' }, ISD_EXAMPLE + '\n' + t('isd.types')))));
    }

    const ISD_EXAMPLE = `{
  "isd_version": 1,
  "project": { "name": "办公用品管理系统", "code": "office-supplies" },
  "requirements": { "description": "登记物品领用与库存", "domain": "行政办公" },
  "stack": { "target": "flask-admin", "theme": "yeti" },
  "modules": [
    { "name": "Item", "label": "物品",
      "fields": [
        { "name": "item_name", "label": "物品名称", "type": "string", "required": true, "search": true },
        { "name": "stock", "label": "库存数量", "type": "integer", "required": true }
      ] }
  ]
}`;

    /* Component-local stylesheet: unmounting the page removes it.
       Foreground colors on filled controls use --dsw-alias-bg-base, so the
       text always contrasts with --dsw-alias-brand-primary in both themes
       (light: white on blue; dark: dark on light). Never hardcode a literal white colour. */
    function Style() {
      return h('style', null, `
.isb-root{max-width:880px;margin:0 auto;padding:28px 24px 64px;color:var(--dsw-alias-label-primary)}
.isb-header{display:flex;align-items:center;gap:14px;margin-bottom:22px}
.isb-header-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1)}
.isb-title{font-size:20px;font-weight:650;margin:0;line-height:1.2}
.isb-tagline{margin:2px 0 0;font-size:13px;color:var(--dsw-alias-label-secondary)}
.isb-steps{display:flex;gap:8px;margin-bottom:18px}
.isb-step{display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);font-size:12px;color:var(--dsw-alias-label-secondary)}
.isb-step-current{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}
.isb-step-num{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-layer-2);font-weight:700;font-size:11px}
.isb-step-current .isb-step-num{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base)}
.isb-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;padding:18px 20px;margin-bottom:14px}
.isb-card-title{font-size:15px;font-weight:650;margin:0 0 6px}
.isb-summary-title{cursor:pointer}
.isb-card-hint{margin:0 0 14px;font-size:13px;color:var(--dsw-alias-label-secondary);line-height:1.6}
.isb-chip-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:12px}
.isb-chip-label{font-size:12px;color:var(--dsw-alias-label-secondary);margin-right:2px}
.isb-chip{padding:5px 12px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);font-size:12px;cursor:pointer;transition:border-color .15s,background .15s}
.isb-chip:hover{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-2)}
.isb-input{width:100%;box-sizing:border-box;min-height:96px;padding:10px 12px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:13px;resize:vertical;outline:none}
.isb-input:focus{border-color:var(--dsw-alias-brand-primary)}
.isb-advanced{margin-top:12px;font-size:13px}
.isb-advanced summary{cursor:pointer;color:var(--dsw-alias-label-secondary)}
.isb-advanced-grid{display:grid;grid-template-columns:1fr 1fr 2fr;gap:12px;margin-top:10px}
.isb-advanced-item{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.isb-select,.isb-text{padding:7px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:13px;outline:none}
.isb-select:focus,.isb-text:focus{border-color:var(--dsw-alias-brand-primary)}
.isb-actions{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}
.isb-btn-primary{padding:9px 18px;border-radius:10px;border:none;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-size:13px;font-weight:600;cursor:pointer}
.isb-btn-primary:disabled{opacity:.45;cursor:not-allowed}
.isb-btn-ghost{padding:9px 16px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);font-size:13px;cursor:pointer}
.isb-btn-ghost:hover{background:var(--dsw-alias-bg-layer-2)}
.isb-prompt{margin-top:16px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;overflow:hidden}
.isb-prompt-head{padding:8px 12px;font-size:12px;font-weight:600;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
.isb-pre{margin:0;padding:12px;background:var(--dsw-alias-bg-layer-2);font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary)}
.isd-pre{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.isb-auto-list{margin:0 0 10px;padding-left:18px;font-size:13px;line-height:1.9;color:var(--dsw-alias-label-primary)}
.isb-confirm-hint{margin:0;font-size:12px;color:var(--dsw-alias-label-secondary);border-top:1px dashed var(--dsw-alias-border-l1);padding-top:10px}
.isb-stacks{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
.isb-stack{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:12px 14px;background:var(--dsw-alias-bg-layer-2)}
.isb-stack-active{border-color:var(--dsw-alias-brand-primary)}
.isb-stack-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
.isb-stack-name{font-size:13px;font-weight:650}
.isb-stack-soon-name{color:var(--dsw-alias-label-secondary)}
.isb-stack-badge{font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);white-space:nowrap}
.isb-stack-badge-soon{font-size:10px;padding:2px 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);white-space:nowrap}
.isb-stack-why{margin:0;font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary)}
.isb-stack-why-soon{opacity:.75}
@media (max-width:720px){.isb-advanced-grid{grid-template-columns:1fr}}
`);
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        registerLocale(ctx);
        const t = makeTextSource(ctx);
        ctx.effect(() => {
          const disposeIcon = ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: 'info-system-builder',
              order: 20,
              label: t('app.title'),
            },
            PanelIcon,
          ));
          const disposePage = ctx.slots.inject('main', () => ctx.slots.register(
            { name: 'main', key: 'info-system-builder' },
            (props) => h(WizardPage, { ...props, text: t }),
          ));
          return () => { disposeIcon(); disposePage(); };
        }, 'info-system-builder: register panel + wizard page');
      },
    };
  },
});
