# Info System Builder — 产品与 UX 设计

> DSH Native 插件：面向"懂点技术"的用户，用对话 + 可视化向导，从一句话需求生成可运行的内部信息系统（默认 Flask-Admin + SQLite）。

## 1. 用户画像与设计立场

- **用户**：初阶程序员 / 懂点技术的业务用户。会跑命令、看得懂 JSON、拿到代码有用（能 `uv run` 起服务）。
- **不是**：完全不懂技术的小白——他们不需要代码。
- **立场**：他们缺的不是"能力"，是"省事"。他们不想做的事：想字段、选组件、配数据库、写 schema。
- **因此**：每个选择都给默认值；一路"下一步"就能拿到能跑的系统。选择权保留，但从不强迫。

## 2. 核心架构（DSH Native 原则）

**Agent 是大脑，文件是真相，UI 是驾驶舱。**

```
用户一句话需求
   │
   ▼  (AI 自动：需求扩写、领域识别)
ISD 蓝图：modules + fields ── system.isd.json（唯一事实源，用户资产）
   │
   ├── (optional) 用户确认/微调 —— 对话中自然发生，无需专用审批状态机
   │
   ▼  (AI 自动：schema 校验归一化)
info_system_render 工具（确定性渲染）
   │
   ▼
<workspace>/info-systems/<slug>/project/   Flask-Admin + SQLite
   │
   ▼
uv run python run.py  →  http://127.0.0.1:5000/admin/
```

- **不再有 LangGraph 机械流水线**：扩写、设计、审计都是 DSH Agent 的本职思考；确认由对话（`ask_user_question` 或自然回复）承担。
- **确定性步骤全部下沉为工具**：渲染 = 纯函数（ISD JSON → 文件集），可重放、可 diff、可测试。
- **ISD 文件是用户资产**：可手改、可版本化、可再渲染。它就是"定制化的语法文件"——结构化 JSON + schema 校验（pydantic 式路线），v2 可再叠加 lark 文本语法前端。

## 3. 交互决策模型：什么自动，什么问用户

| 环节 | 归属 | 默认值 / 依据 |
|---|---|---|
| 需求扩写（一句话 → 领域/场景/目标用户） | **AI 自动** | — |
| 模块划分（数量、命名、职责） | AI 自动，可被用户上限约束 | ≤6 个；用户说"不超过 4 个"则 ≤4 |
| 字段设计（名称/类型/必填/可搜索/中文标签） | AI 自动 | 每模块 ≤15 个；类型白名单 8 种 |
| id / created_time / modified_time / User 模型 | AI 自动注入 | 系统约定，不需要用户关心 |
| 蓝图确认 | **可选**（HITL-optional） | 默认：展示蓝图后直接继续（流畅优先）；用户随时可说"改一下 XX 字段" |
| 实现栈选择 | 用户可选，**默认 Flask-Admin** | 单文件 `uv run` 即起、SQLite 自带、中文界面；其余栈"即将开放"（模板/插件渐进加入） |
| 输出目录 | 用户可选，默认 `<workspace>/info-systems/<slug>/project/` | 不污染仓库根 |
| 启动与验证 | AI 自动 | 渲染后给出 `uv run` 指南；模型可代跑 |

**栈的开放策略**：renderer 是插件内注册表。v1 只带 `flask-admin`（稳定、零决策成本）；`fastapi-sqladmin`、`nextjs-prisma`、`vue-vite` 以"即将支持"卡片展示，后续作为同一 bundle 的增量 renderer 或独立 bundle 加入——ISD 不变，只换渲染器。

## 4. ISD Schema v1（system.isd.json）

```jsonc
{
  "isd_version": 1,
  "project": { "name": "办公用品管理系统", "code": "office-supplies" },
  "requirements": { "description": "……", "domain": "行政办公", "notes": [] },
  "stack": { "target": "flask-admin", "theme": "yeti" },
  "modules": [
    {
      "name": "Item",                 // PascalCase
      "label": "物品",                 // 中文显示名
      "description": "……",
      "fields": [
        { "name": "item_name",        // snake_case
          "label": "物品名称",
          "type": "string",           // 中性类型，见下
          "required": true,
          "search": true,
          "description": "" }
      ]
    }
  ]
}
```

**中性类型系统**（栈无关，渲染器负责映射）：
`string / text / integer / float / boolean / date / time / datetime`
→ Flask-Admin 渲染映射：`String / Text / Integer / Float / Boolean / Date / Time / DateTime`

## 5. 向导页面（Client UI）

挂载：`sidebar.panellist`（图标）→ `main`（key: `info-system-builder`）。

```
┌──────────────────────────────────────────────────────┐
│  信息系统生成器            从一句话到可运行的管理系统    │
├────────────┬─────────────────────────────────────────┤
│ ① 描述需求  │  [示例chips: 办公用品 / 简历跟踪 / 资产登记] │
│ ② 蓝图设计  │  [需求 textarea ………………………………]           │
│ ③ 选择技术栈│  ▸ 高级选项（默认收起，全有默认值）          │
│ ④ 生成运行  │  [生成启动指令] → 复制 → 粘贴到对话          │
│            ├─────────────────────────────────────────┤
│            │  技术栈: [Flask-Admin ✓推荐] [FastAPI·即将] │
│            │  ISD 速览（给懂技术的用户看 schema 摘要）     │
└────────────┴─────────────────────────────────────────┘
```

- **步骤条**只描述"接下来会发生什么"，不制造填写负担：只有第 1 步需要用户输入。
- **高级选项**默认折叠：模块上限（≤6）、字段上限（≤15/模块）、输出目录——初阶用户永远不用打开它。
- **启动指令生成器**：把需求 + 选项组装成一段结构化 prompt，一键复制，粘贴到对话即启动全流程（v1 通道；v2 演进为页面直发会话）。
- 视觉：全部走 `--dsw-alias-*` 主题 token，跟随明暗主题；class 前缀 `isb-`。

### 5.1 语言与主题（2026-11-06 修正）

**语言（i18n）**：优先跟随 **DSH locale 服务**（即宿主界面语言）；locale 服务存在但快照结构未知时**默认中文**（产品主要受众），仅在明确 `en` 时用英文；无 locale 服务时退化到浏览器语言，最终兜底中文。全部文案收敛进 `DICT.zh` / `DICT.en` 字典并通过 `locale.register('info-system-builder', 'zh'|'en', dict)` 注册；不再按 `navigator.language` 硬切换（此前导致中文界面下显示英文）。

**主题对比度**：填充控件（primary 按钮、推荐徽章、步骤圆点）的前景色一律用 `--dsw-alias-bg-base`（与 `--dsw-alias-brand-primary` 背景相反：浅色主题白字蓝底 / 深色主题深字浅底），**禁止硬编码白色**；chips 改为透明底 + 描边。此前 dark 模式下品牌色是浅色，白底白字导致按钮文案不可见。

## 6. Agent 侧 SOP（由工具 description + 本文档引导）

1. 听到"做个系统/管理 XX"类需求 →（若信息太粗，先用 `ask_user_question` 一次问清关键缺失项，可跳过）。
2. 扩写需求 → 设计 ISD（遵守默认上限与用户显式上限）→ **写出 `info-systems/<slug>/system.isd.json`**。
3. 在回复中展示蓝图摘要（模块 × 字段一览）；默认直接继续，用户可随时插话修改（ISD 改后重渲染即可，幂等）。
4. 调用 `info_system_render`（isd_path 或内联 isd）→ 拿到文件清单 + 启动指南。
5. 回复中给出：蓝图摘要、文件树、`uv run python run.py --init-db && uv run python run.py`、默认账号 admin/admin123、后续迭代方式（"直接说改哪里，我会改 ISD 再渲染"）。

## 7. 路线图

- **v1（本版）**：Flask-Admin renderer + 向导页（需求工作台/示例/默认值/启动指令生成器）+ ISD schema。
- **v1.x**：页面直发会话（Remote 通道）；`tool.call.toolview` 渲染工具专属结果卡片；蓝图 projection → wire.view 页面实时可视化。
- **v2**：多 renderer（fastapi-sqladmin / nextjs-prisma / vue-vite）；lark 文本 DSL 前端（`.isd` → 同一棵 ISD AST）；渲染产物自检（py_compile）。

## 8. 实测记录与运维知识（2026-11-06）

**端到端验收（会议室预定系统 demo）**：ISD 写盘 → `info_system_render` 调用链路（子代理实测）→ 渲染 12 文件 → `uv sync` → `--init-db` 建 `instance/app.db` → 服务启动 `/admin/` HTTP 200（标题"首页 - 会议室预定系统"）。渲染器纯函数单测：3 组正例 + 6 类契约违规拒绝 + `py_compile` 全通过。

**实测发现并已修复**：

1. **`[build-system]` 缺陷（继承自 oma 原模板）**：生成项目声明 hatchling 会让 `uv sync` 尝试把平铺布局的项目本身构建为 wheel 而失败（oma 自己用 `uv run --no-project --with …` 预览，掩盖了此问题）。修复：pyproject.toml 不再声明 build-system，uv 以 virtual 项目模式只装依赖。✅ 已修，重装后 Host 生效。
2. **子代理会话的写权限**：`info_system_render` 的写盘遵守**调用者会话的 DSH 文件沙箱**。主会话（workspace-write）可写 workspace 内一切目标；权限受限的子代理/委托会话会被拒绝——这是平台安全契约的正确行为，不是缺陷。工具 description 已隐含此点（输出目录默认在 workspace 下）。

**运维知识**：

- 修改已安装 bundle 的源文件（pnpm link 目录）**不会热重载 Host 模块**（Node ESM 缓存按 URL）；`remove_bundle` + `install_bundle` 重装一轮即可加载新模块代（实测有效），无需重启 DSH。
- Client 侧注册与 Host 工具对新会话即时可见；旧会话的模型函数表不追加新工具，新开会话即可直接调用 `info_system_render`。

