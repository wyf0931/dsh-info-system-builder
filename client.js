/**
 * Info System Builder — Client half.
 *
 * Registers a sidebar panel entry + a main-panel wizard page: a guided cockpit
 * for turning one sentence into a running admin system. All styling goes
 * through --dsw-alias-* theme tokens (class prefix `isb-`), component-local
 * so unmounting removes it. Text is routed through the Client locale service
 * when available, with a built-in zh/en fallback.
 */

window.__ModuleLoader__.load({
  id: '@local/info-system-builder',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const ZH = {
      tagline: '从一句话到可运行的管理系统',
      step1: '描述需求', step2: '蓝图设计', step3: '选择技术栈', step4: '生成运行',
      heroTitle: '告诉我你要管什么',
      heroHint: '一句话就够：谁在用、管什么东西、想记录和查什么。AI 会自动扩写成完整需求。',
      examples: '试试这些例子',
      examplesList: ['帮我做一个办公用品管理系统，登记领用和库存', '做一个简历跟踪系统，记录候选人面试进度', '设备资产登记系统，管理电脑和外设的领用归属'],
      advanced: '高级选项（全部有默认值，可以不碰）',
      advancedModules: '模块数上限',
      advancedFields: '每模块字段数上限',
      advancedDir: '输出目录（留空使用默认）',
      generateBtn: '生成启动指令',
      copyBtn: '复制指令',
      copied: '已复制 ✓ 现在粘贴到下方对话发送',
      promptTitle: '你的启动指令',
      autoTitle: '接下来 AI 会自动完成',
      auto1: '需求扩写：识别业务领域、使用者与核心场景',
      auto2: '蓝图设计：划分模块、设计字段（类型/必填/可搜索/中文标签）',
      auto3: '写出 system.isd.json 定义文件，展示蓝图后直接渲染项目',
      confirmHint: '想改蓝图？任何时候直接说"把 XX 模块加个字段"，AI 改完定义文件重新渲染即可。',
      stacksTitle: '实现技术栈',
      recommended: '推荐 · 默认',
      soon: '即将支持',
      whyDefault: '单命令启动（uv run）· 自带 SQLite · 中文界面 · 傻瓜式部署',
      isdTitle: 'ISD 定义文件速览（懂技术的你可以直接编辑它）',
      isdHint: '渲染工具把它当作"定制化语法文件"解析：改完重新渲染即可，幂等无副作用。',
    };

    const EN = {
      tagline: 'From one sentence to a running admin system',
      step1: 'Describe', step2: 'Blueprint', step3: 'Stack', step4: 'Generate & run',
      heroTitle: 'Tell me what you need to manage',
      heroHint: 'One sentence is enough: who uses it, what it tracks, what you search. AI expands it into full requirements.',
      examples: 'Try an example',
      examplesList: [
        'Build an office-supply system to track usage and stock',
        'A resume tracker that follows candidates through interviews',
        'An asset register for laptops and peripherals',
      ],
      advanced: 'Advanced (all defaults, safe to skip)',
      advancedModules: 'Max modules',
      advancedFields: 'Max fields per module',
      advancedDir: 'Output directory (blank = default)',
      generateBtn: 'Generate kickoff prompt',
      copyBtn: 'Copy prompt',
      copied: 'Copied ✓ now paste it into the chat below',
      promptTitle: 'Your kickoff prompt',
      autoTitle: 'AI then does automatically',
      auto1: 'Expands the requirement: domain, users, key scenarios',
      auto2: 'Designs the blueprint: modules + fields (types/required/searchable/labels)',
      auto3: 'Writes system.isd.json, shows the blueprint, renders the project',
      confirmHint: 'Want changes? Just say "add a field to XX" any time — AI edits the ISD and re-renders.',
      stacksTitle: 'Implementation stack',
      recommended: 'Recommended · default',
      soon: 'Coming soon',
      whyDefault: 'One-command start (uv run) · bundled SQLite · localized UI',
      isdTitle: 'ISD definition at a glance (technical users can edit it)',
      isdHint: 'The render tool parses it as a custom syntax file: edit and re-render, idempotent.',
    };

    /** Bilingual text source: locale service if present, else browser language. */
    function makeTextSource(ctx) {
      let dict = navigatorLanguageZh() ? ZH : EN;
      let dispose = () => {};
      try {
        const locale = ctx.get('locale');
        if (locale && typeof locale.register === 'function') {
          locale.register('info-system-builder', 'zh-CN', ZH);
          locale.register('info-system-builder', 'en', EN);
        }
      } catch {
        // Locale service optional; built-in dictionary already covers both.
      }
      const t = (key) => dict[key] ?? key;
      t.dispose = () => dispose();
      return t;
    }

    function navigatorLanguageZh() {
      try {
        return (navigator.language || '').toLowerCase().startsWith('zh');
      } catch {
        return true;
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
        lines.push(navigatorLanguageZh() ? '请帮我生成一个内部信息系统。' : 'Please build me an internal information system.');
        lines.push('');
        lines.push(`${navigatorLanguageZh() ? '需求' : 'Requirement'}: ${requirement.trim()}`);
        lines.push('');
        lines.push(navigatorLanguageZh() ? '约定：' : 'Conventions:');
        lines.push(`- ${navigatorLanguageZh() ? '实现栈' : 'Stack'}: Flask-Admin + SQLite (${navigatorLanguageZh() ? '默认' : 'default'})`);
        lines.push(`- ${navigatorLanguageZh() ? '模块数上限' : 'Max modules'}: ${maxModules}`);
        lines.push(`- ${navigatorLanguageZh() ? '每模块字段上限' : 'Max fields per module'}: ${maxFields}`);
        if (outputDir.trim()) lines.push(`- ${navigatorLanguageZh() ? '输出目录' : 'Output dir'}: ${outputDir.trim()}`);
        lines.push(`- ${navigatorLanguageZh()
          ? '请先设计 ISD 蓝图并写入 system.isd.json，展示蓝图概要，然后用 info_system_render 渲染项目并给出启动命令。'
          : 'Design the ISD blueprint into system.isd.json first, show a summary, then render with info_system_render and give the start command.'}`);
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

      return h('div', { className: 'isb-root' },
        h(Style, null),
        // Header
        h('div', { className: 'isb-header' },
          h('div', { className: 'isb-header-icon' }, h(PanelIcon, { size: 26, active: true })),
          h('div', null,
            h('h1', { className: 'isb-title' }, navigatorLanguageZh() ? '信息系统生成器' : 'Info System Builder'),
            h('p', { className: 'isb-tagline' }, t('tagline')))),
        // Steps rail
        h('div', { className: 'isb-steps' },
          [t('step1'), t('step2'), t('step3'), t('step4')].map((label, i) =>
            h('div', { key: label, className: 'isb-step' + (i === 0 ? ' isb-step-current' : '') },
              h('span', { className: 'isb-step-num' }, String(i + 1)),
              h('span', { className: 'isb-step-label' }, label)))),
        // Requirement workbench
        h('section', { className: 'isb-card' },
          h('h2', { className: 'isb-card-title' }, t('heroTitle')),
          h('p', { className: 'isb-card-hint' }, t('heroHint')),
          h('div', { className: 'isb-chip-row' },
            h('span', { className: 'isb-chip-label' }, t('examples')),
            t('examplesList').map((example, i) =>
              h('button', {
                key: i, className: 'isb-chip', type: 'button',
                onClick: () => { setRequirement(example); setPrompt(null); },
              }, example))),
          h('textarea', {
            className: 'isb-input',
            value: requirement,
            placeholder: t('examplesList')[0],
            onChange: (e) => { setRequirement(e.target.value); setPrompt(null); },
          }),
          h('details', { className: 'isb-advanced' },
            h('summary', null, t('advanced')),
            h('div', { className: 'isb-advanced-grid' },
              h('label', { className: 'isb-advanced-item' },
                h('span', null, t('advancedModules')),
                h('select', {
                  value: maxModules,
                  className: 'isb-select',
                  onChange: (e) => setMaxModules(Number(e.target.value)),
                }, [3, 4, 5, 6, 8, 10].map((n) => h('option', { key: n, value: n }, String(n))))),
              h('label', { className: 'isb-advanced-item' },
                h('span', null, t('advancedFields')),
                h('select', {
                  value: maxFields,
                  className: 'isb-select',
                  onChange: (e) => setMaxFields(Number(e.target.value)),
                }, [8, 10, 12, 15, 20, 25].map((n) => h('option', { key: n, value: n }, String(n))))),
              h('label', { className: 'isb-advanced-item isb-advanced-item-wide' },
                h('span', null, t('advancedDir')),
                h('input', {
                  className: 'isb-text',
                  value: outputDir,
                  onChange: (e) => setOutputDir(e.target.value),
                  placeholder: 'info-systems/<slug>/',
                })))),
          h('div', { className: 'isb-actions' },
            h('button', {
              className: 'isb-btn-primary', type: 'button', disabled: !requirement.trim(),
              onClick: onGenerate,
            }, t('generateBtn')),
            prompt && h('button', { className: 'isb-btn-ghost', type: 'button', onClick: onCopy },
              copied ? t('copied') : t('copyBtn'))),
          prompt && h('div', { className: 'isb-prompt' },
            h('div', { className: 'isb-prompt-head' }, t('promptTitle')),
            h('pre', { className: 'isb-pre' }, prompt))),
        // What AI does automatically
        h('section', { className: 'isb-card' },
          h('h2', { className: 'isb-card-title' }, t('autoTitle')),
          h('ul', { className: 'isb-auto-list' },
            h('li', null, t('auto1')),
            h('li', null, t('auto2')),
            h('li', null, t('auto3'))),
          h('p', { className: 'isb-confirm-hint' }, t('confirmHint'))),
        // Stacks
        h('section', { className: 'isb-card' },
          h('h2', { className: 'isb-card-title' }, t('stacksTitle')),
          h('div', { className: 'isb-stacks' },
            h('div', { className: 'isb-stack isb-stack-active' },
              h('div', { className: 'isb-stack-head' },
                h('span', { className: 'isb-stack-name' }, 'Flask-Admin'),
                h('span', { className: 'isb-stack-badge' }, t('recommended'))),
              h('p', { className: 'isb-stack-why' }, t('whyDefault'))),
            h('div', { className: 'isb-stack' },
              h('div', { className: 'isb-stack-head' },
                h('span', { className: 'isb-stack-name isb-stack-soon-name' }, 'FastAPI'),
                h('span', { className: 'isb-stack-badge-soon' }, t('soon'))),
              h('p', { className: 'isb-stack-why isb-stack-why-soon' }, 'SQLAdmin + uvicorn')),
            h('div', { className: 'isb-stack' },
              h('div', { className: 'isb-stack-head' },
                h('span', { className: 'isb-stack-name isb-stack-soon-name' }, 'Next.js'),
                h('span', { className: 'isb-stack-badge-soon' }, t('soon'))),
              h('p', { className: 'isb-stack-why isb-stack-why-soon' }, 'Prisma + SQLite')),
            h('div', { className: 'isb-stack' },
              h('div', { className: 'isb-stack-head' },
                h('span', { className: 'isb-stack-name isb-stack-soon-name' }, 'Vue'),
                h('span', { className: 'isb-stack-badge-soon' }, t('soon'))),
              h('p', { className: 'isb-stack-why isb-stack-why-soon' }, 'Vite + Element Plus')))),
        // ISD spec
        h('section', { className: 'isb-card' },
          h('details', null,
            h('summary', { className: 'isb-card-title isb-summary-title' }, t('isdTitle')),
            h('p', { className: 'isb-card-hint' }, t('isdHint')),
            h('pre', { className: 'isb-pre isd-pre' }, ISD_EXAMPLE))));
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
}
# 字段类型: string / text / integer / float / boolean / date / time / datetime`;

    /* Component-local stylesheet: unmounting the page removes it. */
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
.isb-chip{padding:5px 12px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:12px;cursor:pointer;transition:border-color .15s}
.isb-chip:hover{border-color:var(--dsw-alias-brand-primary)}
.isb-input{width:100%;box-sizing:border-box;min-height:96px;padding:10px 12px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:13px;resize:vertical;outline:none}
.isb-input:focus{border-color:var(--dsw-alias-brand-primary)}
.isb-advanced{margin-top:12px;font-size:13px}
.isb-advanced summary{cursor:pointer;color:var(--dsw-alias-label-secondary)}
.isb-advanced-grid{display:grid;grid-template-columns:1fr 1fr 2fr;gap:12px;margin-top:10px}
.isb-advanced-item{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.isb-select,.isb-text{padding:7px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:13px;outline:none}
.isb-select:focus,.isb-text:focus{border-color:var(--dsw-alias-brand-primary)}
.isb-actions{display:flex;gap:10px;margin-top:16px}
.isb-btn-primary{padding:9px 18px;border-radius:10px;border:none;background:var(--dsw-alias-brand-primary);color:#fff;font-size:13px;font-weight:600;cursor:pointer}
.isb-btn-primary:disabled{opacity:.45;cursor:not-allowed}
.isb-btn-ghost{padding:9px 16px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);font-size:13px;cursor:pointer}
.isb-prompt{margin-top:16px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;overflow:hidden}
.isb-prompt-head{padding:8px 12px;font-size:12px;font-weight:600;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
.isb-pre{margin:0;padding:12px;background:var(--dsw-alias-bg-layer-2);font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary)}
.isd-pre{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.isb-auto-list{margin:0 0 10px;padding-left:18px;font-size:13px;line-height:1.9;color:var(--dsw-alias-label-primary)}
.isb-confirm-hint{margin:0;font-size:12px;color:var(--dsw-alias-label-secondary);border-top:1px dashed var(--dsw-alias-border-l1);padding-top:10px}
.isb-stacks{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
.isb-stack{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:12px 14px;background:var(--dsw-alias-bg-layer-2)}
.isb-stack-active{border-color:var(--dsw-alias-brand-primary)}
.isb-stack-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.isb-stack-name{font-size:13px;font-weight:650}
.isb-stack-soon-name{color:var(--dsw-alias-label-secondary)}
.isb-stack-badge{font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px;background:var(--dsw-alias-brand-primary);color:#fff}
.isb-stack-badge-soon{font-size:10px;padding:2px 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.isb-stack-why{margin:0;font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary)}
.isb-stack-why-soon{opacity:.75}
@media (max-width:720px){.isb-advanced-grid{grid-template-columns:1fr}}
`);
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const t = makeTextSource(ctx);
        ctx.effect(() => {
          const disposeIcon = ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: 'info-system-builder',
              order: 20,
              label: navigatorLanguageZh() ? '信息系统生成器' : 'Info System Builder',
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
