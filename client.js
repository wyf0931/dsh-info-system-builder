/**
 * Info System Builder — Client half.
 *
 * Two tabs: 新建系统 (describe → launch a session in-place) and 历史项目
 * (project list with preview / download / reveal / delete, backed by the
 * Host half's /info-system-builder/* routes).
 *
 * Styling uses only --dsw-alias-* tokens (class prefix `isb-`); the page is a
 * self-scrolling container so narrow windows never clip content. Text is
 * bilingual, follows the DSH locale service, defaults to Chinese.
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
        'tabs.new': '新建系统',
        'tabs.history': '历史项目',
        'hero.title': '告诉我你要管什么',
        'hero.hint': '一句话就够——说清三件事：谁用、管什么、要查什么。AI 会自动扩写成完整需求。',
        'hero.examples': '试试这些例子',
        'example.office': '帮我做一个办公用品管理系统，登记领用和库存',
        'example.resume': '做一个简历跟踪系统，记录候选人面试进度',
        'example.asset': '设备资产登记系统，管理电脑和外设的领用归属',
        'example.meetingroom': '会议室预定系统：行政部登记会议室和预定记录，能查谁在什么时段订了哪间',
        'advanced.title': '高级选项（全部有默认值，可以不碰）',
        'advanced.modules': '模块数上限',
        'advanced.fields': '每模块字段数上限',
        'advanced.dir': '输出目录（留空使用默认）',
        'advanced.dirPlaceholder': 'info-systems/<slug>/',
        'actions.start': '开始生成会话',
        'actions.starting': '正在开启会话…',
        'actions.startHint': '直接在当前工作区开启新会话并发送需求，无需复制。',
        'actions.sent': '已发送 ✓ 已切换到新会话，AI 正在设计蓝图。',
        'actions.draft': '已开启新会话并把需求填入输入框，按回车发送即可。',
        'actions.failed': '无法自动开启会话，请直接在对话中发送需求。',
        'auto.summary': 'AI 会自动完成：扩写需求 → 设计模块与字段 → 写出 ISD 定义 → 渲染项目',
        'stack.summary': '技术栈：Flask-Admin + SQLite（默认）· 更多栈即将开放',
        'isd.title': 'ISD 定义文件速览（懂技术的你可以直接编辑它）',
        'isd.hint': '渲染工具把它当作"定制化语法文件"解析：改完重新渲染即可，幂等无副作用。',
        'isd.types': '# 字段类型: string / text / integer / float / boolean / date / time / datetime',
        'history.refresh': '刷新',
        'history.loading': '加载中…',
        'history.empty': '还没有生成过项目。切换到「新建系统」开始第一个。',
        'history.error': '无法加载项目列表',
        'history.rendered': '已生成',
        'history.blueprintOnly': '仅蓝图',
        'history.modules': '模块',
        'history.fields': '字段',
        'history.previewRunning': '预览中',
        'history.previewStart': '启动预览',
        'history.previewStarting': '启动中…',
        'history.previewStop': '停止预览',
        'history.previewStopping': '停止中…',
        'history.download': '下载',
        'history.reveal': '打开文件夹',
        'history.delete': '删除',
        'history.confirmDelete': '确认删除？',
        'history.cancel': '取消',
        'history.copyPath': '复制路径',
        'history.copied': '已复制路径',
        'history.pathUnavailable': '路径不可用',
        'history.startFailed': '启动失败',
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
        'tabs.new': 'New system',
        'tabs.history': 'Projects',
        'hero.title': 'Tell me what you need to manage',
        'hero.hint': 'One sentence is enough — cover three things: who uses it, what it tracks, what you need to look up. AI expands it into full requirements.',
        'hero.examples': 'Try an example',
        'example.office': 'Build an office-supply system to track usage and stock',
        'example.resume': 'A resume tracker that follows candidates through interviews',
        'example.asset': 'An asset register for laptops and peripherals',
        'example.meetingroom': 'A meeting-room booking system: admins register rooms and bookings, and look up who booked which room when',
        'advanced.title': 'Advanced (all defaults, safe to skip)',
        'advanced.modules': 'Max modules',
        'advanced.fields': 'Max fields per module',
        'advanced.dir': 'Output directory (blank = default)',
        'advanced.dirPlaceholder': 'info-systems/<slug>/',
        'actions.start': 'Start building session',
        'actions.starting': 'Starting session…',
        'actions.startHint': 'Opens a new session in this workspace and sends your requirement — no copy/paste.',
        'actions.sent': 'Sent ✓ switched to the new session; AI is designing the blueprint.',
        'actions.draft': 'New session opened with your requirement pre-filled — press Enter to send.',
        'actions.failed': 'Could not start the session automatically; send the requirement in the chat.',
        'auto.summary': 'AI then does it all: expand requirement → design modules & fields → write the ISD → render the project',
        'stack.summary': 'Stack: Flask-Admin + SQLite (default) · more stacks coming soon',
        'isd.title': 'ISD definition at a glance (technical users can edit it)',
        'isd.hint': 'The render tool parses it as a custom syntax file: edit and re-render, idempotent.',
        'isd.types': '# field types: string / text / integer / float / boolean / date / time / datetime',
        'history.refresh': 'Refresh',
        'history.loading': 'Loading…',
        'history.empty': 'No projects yet. Switch to New system to start one.',
        'history.error': 'Could not load projects',
        'history.rendered': 'Rendered',
        'history.blueprintOnly': 'Blueprint only',
        'history.modules': 'modules',
        'history.fields': 'fields',
        'history.previewRunning': 'Preview running',
        'history.previewStart': 'Start preview',
        'history.previewStarting': 'Starting…',
        'history.previewStop': 'Stop preview',
        'history.previewStopping': 'Stopping…',
        'history.download': 'Download',
        'history.reveal': 'Open folder',
        'history.delete': 'Delete',
        'history.confirmDelete': 'Confirm delete?',
        'history.cancel': 'Cancel',
        'history.copyPath': 'Copy path',
        'history.copied': 'Path copied',
        'history.pathUnavailable': 'Path unavailable',
        'history.startFailed': 'Could not start',
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
     */
    function resolveLang(ctx) {
      // A manual choice persisted in this panel beats every automatic signal.
      try {
        const stored = localStorage.getItem('isb-lang');
        if (stored === 'zh' || stored === 'en') return stored;
      } catch {
        // storage unavailable
      }
      try {
        const locale = ctx.get('locale');
        if (locale && typeof locale.getLocale === 'function') {
          const snap = locale.getLocale() || {};
          // Real DSH snapshot: { preference: 'zh' | 'en' }. Accept common
          // aliases too so the check survives future shape changes.
          const id = String(snap.preference || snap.id || snap.locale || snap.language || '').toLowerCase();
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

    const LANG_LABEL = { zh: 'EN', en: '中' };

    function persistLang(lang) {
      try {
        localStorage.setItem('isb-lang', lang);
      } catch {
        // storage unavailable — the toggle still works for this session
      }
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

    /** POST helper for the Host routes. */
    async function post(route, body) {
      const response = await fetch(`/info-system-builder/${route}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      const text = await response.text().catch(() => '');
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON body */ }
      if (!response.ok || data.ok === false) {
        throw new Error(data.error || `HTTP ${response.status}${text ? ' — ' + String(text).slice(0, 160) : ''}`);
      }
      return data;
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
    /* New-system tab                                                     */
    /* ------------------------------------------------------------------ */
    function NewSystemTab(props) {
      const t = props.text;
      const app = props.app;
      const [requirement, setRequirement] = React.useState('');
      const [maxModules, setMaxModules] = React.useState(6);
      const [maxFields, setMaxFields] = React.useState(15);
      const [outputDir, setOutputDir] = React.useState('');
      const [launchState, setLaunchState] = React.useState('idle'); // idle|starting|sent|draft|error

      const buildKickoff = () => {
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

      const onLaunch = async () => {
        if (!requirement.trim() || launchState === 'starting') return;
        setLaunchState('starting');
        const text = buildKickoff();
        let ui;
        try {
          ui = app && typeof app.get === 'function' ? app.get('uiWorkspace') : undefined;
        } catch {
          ui = undefined;
        }
        if (!ui || typeof ui.startSession !== 'function') {
          setLaunchState('error');
          return;
        }
        try {
          if (typeof ui.connectWorkspace === 'function') {
            const sessionId = await ui.connectWorkspace(undefined);
            const sessions = app.get('sessions');
            const binding = sessions && typeof sessions.binding === 'function' ? sessions.binding(sessionId) : undefined;
            const face = binding && binding.session;
            if (face && typeof face.prompt === 'function') {
              const result = await face.prompt([{ type: 'text', text }], 'queue');
              if (result && result.ok) {
                if (typeof ui.openSession === 'function') ui.openSession(sessionId);
                setLaunchState('sent');
                return;
              }
            }
          }
        } catch {
          // fall through to the draft fallback below
        }
        try {
          ui.startSession(undefined, { prompt: text, whenDraftExists: 'replace' });
          setLaunchState('draft');
        } catch {
          setLaunchState('error');
        }
      };

      return h('div', null,
        h('section', { className: 'isb-card' },
          h('h2', { className: 'isb-card-title' }, t('hero.title')),
          h('p', { className: 'isb-card-hint' }, t('hero.hint')),
          h('div', { className: 'isb-chip-row' },
            h('span', { className: 'isb-chip-label' }, t('hero.examples')),
            [t('example.office'), t('example.resume'), t('example.asset'), t('example.meetingroom')].map((example, i) =>
              h('button', {
                key: i, className: 'isb-chip', type: 'button',
                onClick: () => { setRequirement(example); setLaunchState('idle'); },
              }, example))),
          h('textarea', {
            className: 'isb-input',
            value: requirement,
            placeholder: t('example.office'),
            onChange: (e) => { setRequirement(e.target.value); setLaunchState('idle'); },
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
              className: 'isb-btn-primary', type: 'button',
              disabled: !requirement.trim() || launchState === 'starting',
              onClick: onLaunch,
            }, launchState === 'starting' ? t('actions.starting') : t('actions.start')),
            h('span', { className: 'isb-launch-hint' },
              launchState === 'sent' ? t('actions.sent')
                : launchState === 'draft' ? t('actions.draft')
                  : launchState === 'error' ? t('actions.failed')
                    : t('actions.startHint')))),
        h('p', { className: 'isb-footnote' }, t('auto.summary')),
        h('p', { className: 'isb-footnote' }, t('stack.summary')),
        h('details', { className: 'isb-card isb-isd' },
          h('summary', { className: 'isb-card-title isb-summary-title' }, t('isd.title')),
          h('p', { className: 'isb-card-hint' }, t('isd.hint')),
          h('pre', { className: 'isb-pre isd-pre' }, ISD_EXAMPLE + '\n' + t('isd.types'))));
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

    /* ------------------------------------------------------------------ */
    /* History tab                                                        */
    /* ------------------------------------------------------------------ */
    function HistoryTab(props) {
      const t = props.text;
      const [projects, setProjects] = React.useState([]);
      const [loading, setLoading] = React.useState(true);
      const [error, setError] = React.useState(null);
      const [busy, setBusy] = React.useState(null);
      const [confirming, setConfirming] = React.useState(null);
      const [notice, setNotice] = React.useState(null);

      const load = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch('/info-system-builder/projects', { headers: { accept: 'application/json' } });
          if (!response.ok) {
            const detail = await response.text().catch(() => '');
            throw new Error(`HTTP ${response.status}${detail ? ' — ' + String(detail).slice(0, 160) : ''}`);
          }
          const data = await response.json();
          setProjects(Array.isArray(data.projects) ? data.projects : []);
        } catch (err) {
          setError(String(err && err.message ? err.message : err));
        } finally {
          setLoading(false);
        }
      };

      React.useEffect(() => { load(); }, []);

      const act = async (slug, workspacePath, action) => {
        setBusy(`${action}:${slug}`);
        setNotice(null);
        try {
          if (action === 'delete') {
            await post('delete', { slug, workspacePath });
          } else if (action === 'preview-start') {
            const data = await post('preview/start', { slug, workspacePath });
            if (data && data.url) {
              setNotice(`${t('history.previewRunning')}: ${data.url}`);
              window.open(data.url, '_blank', 'noopener');
            }
          } else if (action === 'preview-stop') {
            await post('preview/stop', { slug, workspacePath });
          } else if (action === 'reveal') {
            await post('reveal', { slug, workspacePath });
          }
          await load();
        } catch (err) {
          setNotice(`${t('history.startFailed')}: ${String(err && err.message ? err.message : err)}`);
        } finally {
          setBusy(null);
          setConfirming(null);
        }
      };

      const copyPath = async (project) => {
        try {
          await navigator.clipboard.writeText(project.projectDir || project.isdPath || '');
          setNotice(t('history.copied'));
        } catch {
          setNotice(t('history.pathUnavailable'));
        }
      };

      const row = (project) => {
        const key = `${project.workspacePath}::${project.slug}`;
        const isBusy = busy !== null && busy.endsWith(`:${project.slug}`);
        const starting = busy === `preview-start:${project.slug}`;
        const stopping = busy === `preview-stop:${project.slug}`;
        return h('div', { key, className: 'isb-project' },
          h('div', { className: 'isb-project-main' },
            h('div', { className: 'isb-project-title' },
              h('span', { className: 'isb-project-name' }, project.name),
              h('span', { className: 'isb-project-slug' }, project.slug)),
            h('div', { className: 'isb-project-meta' },
              h('span', null, `${project.workspace}`),
              h('span', null, `${project.moduleCount} ${t('history.modules')} · ${project.fieldCount} ${t('history.fields')}`),
              project.rendered
                ? h('span', { className: 'isb-badge isb-badge-ok' }, t('history.rendered'))
                : h('span', { className: 'isb-badge' }, t('history.blueprintOnly')),
              project.preview
                ? h('span', { className: 'isb-badge isb-badge-live' }, `${t('history.previewRunning')} :${project.preview.port}`)
                : null)),
          h('div', { className: 'isb-project-actions' },
            project.preview
              ? h('button', { className: 'isb-btn-sm', type: 'button', disabled: isBusy, onClick: () => act(project.slug, project.workspacePath, 'preview-stop') },
                stopping ? t('history.previewStopping') : t('history.previewStop'))
              : h('button', { className: 'isb-btn-sm', type: 'button', disabled: isBusy || !project.rendered, title: project.rendered ? '' : t('history.blueprintOnly'), onClick: () => act(project.slug, project.workspacePath, 'preview-start') },
                starting ? t('history.previewStarting') : t('history.previewStart')),
            h('a', { className: 'isb-btn-sm isb-btn-link', href: `/info-system-builder/download?slug=${encodeURIComponent(project.slug)}&workspacePath=${encodeURIComponent(project.workspacePath)}`, download: `${project.slug}.tar.gz` }, t('history.download')),
            h('button', { className: 'isb-btn-sm', type: 'button', disabled: isBusy, onClick: () => act(project.slug, project.workspacePath, 'reveal') }, t('history.reveal')),
            h('button', { className: 'isb-btn-sm', type: 'button', disabled: isBusy, onClick: () => copyPath(project) }, t('history.copyPath')),
            confirming === key
              ? h('span', { className: 'isb-confirm' },
                h('button', { className: 'isb-btn-sm isb-btn-danger', type: 'button', disabled: isBusy, onClick: () => act(project.slug, project.workspacePath, 'delete') }, t('history.confirmDelete')),
                h('button', { className: 'isb-btn-sm', type: 'button', onClick: () => setConfirming(null) }, t('history.cancel')))
              : h('button', { className: 'isb-btn-sm', type: 'button', disabled: isBusy, onClick: () => setConfirming(key) }, t('history.delete'))));
      };

      return h('div', null,
        h('div', { className: 'isb-history-head' },
          h('div', { className: 'isb-history-title' }, `${t('tabs.history')} (${projects.length})`),
          h('button', { className: 'isb-btn-sm', type: 'button', onClick: load, disabled: loading }, loading ? t('history.loading') : t('history.refresh'))),
        notice ? h('p', { className: 'isb-notice' }, notice) : null,
        error
          ? h('div', { className: 'isb-card' },
            h('p', { className: 'isb-error' }, `${t('history.error')}: ${error}`),
            h('button', { className: 'isb-btn-sm', type: 'button', onClick: load }, t('history.refresh')))
          : null,
        loading && projects.length === 0 ? h('p', { className: 'isb-empty' }, t('history.loading')) : null,
        !loading && !error && projects.length === 0 ? h('p', { className: 'isb-empty' }, t('history.empty')) : null,
        projects.map(row));
    }

    /* ------------------------------------------------------------------ */
    /* Wizard page (main panel)                                           */
    /* ------------------------------------------------------------------ */
    function WizardPage(props) {
      const app = props.app;
      const [tab, setTab] = React.useState('new');
      const [lang, setLangState] = React.useState(() => props.text.lang);
      const t = (key) => (DICT[lang] || DICT.zh)[key] ?? DICT.zh[key] ?? key;
      t.lang = lang;
      const flipLang = () => {
        const next = lang === 'zh' ? 'en' : 'zh';
        persistLang(next);
        setLangState(next);
      };

      return h('div', { className: 'isb-root' },
        h(Style, null),
        h('div', { className: 'isb-header' },
          h('div', { className: 'isb-header-icon' }, h(PanelIcon, { size: 26, active: true })),
          h('div', { className: 'isb-header-text' },
            h('h1', { className: 'isb-title' }, t('app.title')),
            h('p', { className: 'isb-tagline' }, t('app.tagline'))),
          h('button', {
            className: 'isb-lang-toggle', type: 'button',
            title: lang === 'zh' ? 'Switch to English' : '切换为中文',
            onClick: flipLang,
          }, LANG_LABEL[lang])),
        h('div', { className: 'isb-tabs' },
          h('button', {
            className: 'isb-tab' + (tab === 'new' ? ' isb-tab-active' : ''), type: 'button',
            onClick: () => setTab('new'),
          }, t('tabs.new')),
          h('button', {
            className: 'isb-tab' + (tab === 'history' ? ' isb-tab-active' : ''), type: 'button',
            onClick: () => setTab('history'),
          }, t('tabs.history'))),
        tab === 'new'
          ? h(NewSystemTab, { text: t, app })
          : h(HistoryTab, { text: t }));
    }

    /* Component-local stylesheet: unmounting the page removes it.
       The root scrolls itself so narrow windows never clip content; filled
       controls use --dsw-alias-bg-base as foreground for both themes. */
    function Style() {
      return h('style', null, `
.isb-root{height:100%;min-height:0;overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;padding:24px 32px 64px;color:var(--dsw-alias-label-primary)}
.isb-header{display:flex;align-items:center;gap:14px;margin-bottom:16px}
.isb-header-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1)}
.isb-title{font-size:20px;font-weight:650;margin:0;line-height:1.2}
.isb-header-text{flex:1;min-width:0}
.isb-tagline{margin:2px 0 0;font-size:13px;color:var(--dsw-alias-label-secondary)}
.isb-lang-toggle{margin-left:auto;padding:5px 12px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap}
.isb-lang-toggle:hover{border-color:var(--dsw-alias-brand-primary)}
.isb-tabs{display:flex;gap:4px;margin-bottom:14px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.isb-tab{padding:8px 14px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
.isb-tab-active{color:var(--dsw-alias-label-primary);border-bottom-color:var(--dsw-alias-brand-primary);font-weight:600}
.isb-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;padding:18px 20px;margin-bottom:12px}
.isb-card-title{font-size:15px;font-weight:650;margin:0 0 6px}
.isb-summary-title{cursor:pointer}
.isb-card-hint{margin:0 0 14px;font-size:13px;color:var(--dsw-alias-label-secondary);line-height:1.6}
.isb-chip-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:12px}
.isb-chip-label{font-size:12px;color:var(--dsw-alias-label-secondary);margin-right:2px}
.isb-chip{padding:5px 12px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);font-size:12px;cursor:pointer;transition:border-color .15s,background .15s}
.isb-chip:hover{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-2)}
.isb-input{width:100%;box-sizing:border-box;min-height:88px;padding:10px 12px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:13px;resize:vertical;outline:none}
.isb-input:focus{border-color:var(--dsw-alias-brand-primary)}
.isb-advanced{margin-top:12px;font-size:13px}
.isb-advanced summary{cursor:pointer;color:var(--dsw-alias-label-secondary)}
.isb-advanced-grid{display:grid;grid-template-columns:1fr 1fr 2fr;gap:12px;margin-top:10px}
.isb-advanced-item{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.isb-select,.isb-text{padding:7px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:13px;outline:none}
.isb-select:focus,.isb-text:focus{border-color:var(--dsw-alias-brand-primary)}
.isb-actions{display:flex;align-items:center;gap:12px;margin-top:16px;flex-wrap:wrap}
.isb-btn-primary{padding:9px 18px;border-radius:10px;border:none;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-size:13px;font-weight:600;cursor:pointer}
.isb-btn-primary:disabled{opacity:.45;cursor:not-allowed}
.isb-launch-hint{font-size:12px;color:var(--dsw-alias-label-secondary)}
.isb-footnote{margin:0 0 6px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.isb-isd{margin-top:12px}
.isb-pre{margin:0;padding:12px;background:var(--dsw-alias-bg-layer-2);font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary)}
.isd-pre{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.isb-history-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.isb-history-title{font-size:14px;font-weight:650}
.isb-empty{margin:24px 0;font-size:13px;color:var(--dsw-alias-label-secondary);text-align:center}
.isb-notice{margin:0 0 10px;font-size:12px;color:var(--dsw-alias-state-warn-primary)}
.isb-error{margin:0 0 10px;font-size:13px;color:var(--dsw-alias-state-error-primary)}
.isb-project{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:12px 14px;margin-bottom:8px}
.isb-project-main{min-width:220px}
.isb-project-title{display:flex;align-items:baseline;gap:8px}
.isb-project-name{font-size:14px;font-weight:650}
.isb-project-slug{font-size:11px;color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.isb-project-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.isb-badge{font-size:10px;padding:1px 7px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.isb-badge-ok{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}
.isb-badge-live{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
.isb-project-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.isb-btn-sm{padding:5px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);font-size:12px;cursor:pointer;text-decoration:none}
.isb-btn-sm:hover{border-color:var(--dsw-alias-brand-primary)}
.isb-btn-sm:disabled{opacity:.4;cursor:not-allowed}
.isb-btn-link{display:inline-block}
.isb-confirm{display:inline-flex;gap:6px;align-items:center}
.isb-btn-danger{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}
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
            (props) => h(WizardPage, { ...props, text: t, app: ctx }),
          ));
          return () => { disposeIcon(); disposePage(); };
        }, 'info-system-builder: register panel + wizard page');
      },
    };
  },
});
