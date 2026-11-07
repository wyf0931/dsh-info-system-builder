# Info System Builder

> DeepSeek Harness 插件：从一句话需求，生成可运行的内部信息系统（默认 Flask-Admin + SQLite）。
>
> 一个 DSH Native 的信息系统生成器 —— Agent 负责思考，文件承载真相，向导负责质感。

## 它解决什么

小团队总有一堆低频的信息管理需求——办公用品领用、简历跟踪、会议室预定、资产登记。外包太贵，自研不值。**Info System Builder** 让你用一句话启动：AI 扩写需求、设计模块与字段蓝图，确定性渲染器生成完整可运行项目，`uv run` 即起，SQLite 开箱自带。

为**懂点技术的用户**设计：所有选择都有默认值，一路确认就能拿到能跑的系统；同时保留全部选择权——想改就改，改完重渲染即可。

## 核心特性

- **🧠 AI 做脏活**：需求扩写、领域识别、模块划分、字段设计（类型/必填/可搜索/中文标签）全自动
- **📄 ISD 即资产**：蓝图落盘为 `system.isd.json`（Info System Definition）——你手边的"定制化语法文件"，可编辑、可版本化、可重复渲染（幂等）
- **🎨 可视化向导**：DSH 侧栏面板——示例引导、高级选项全默认值、一键生成启动指令；栈卡片默认选中 Flask-Admin，其余栈渐进开放
- **⚙️ 确定性渲染**：`info_system_render` 工具把 ISD 解析、校验、渲染为完整 Flask-Admin 项目（12 个文件：模型/视图/工厂/配置/启动器/README），渲染产物通过编译与真实启动验证
- **🔐 尊重沙箱**：写盘遵守调用者会话的 DSH 文件策略，产物默认落在 workspace 的 `info-systems/<slug>/` 下

## 安装

前提：已安装 [DeepSeek Harness](https://deepseek.com)（桌面版）。

```bash
git clone git@github.com:wyf0931/dsh-info-system-builder.git
# DSH 内：插件管理器安装本地 bundle，或命令行：
# dsh plugin install ./dsh-info-system-builder
```

安装后侧栏出现「信息系统生成器」面板，`info_system_render` 工具对会话中的 Agent 可见。

## 使用

**方式一：对话式（最短路径）**

> 帮我做一个会议室预定系统：登记会议室（容量、位置、设备）和预定记录（日期、时段、预定人）。

Agent 会自动扩写需求 → 设计 ISD 蓝图并落盘 → 展示模块×字段一览 → 调用渲染工具 → 给出启动命令：

```bash
cd info-systems/<slug>/project
uv sync
uv run python run.py --init-db
uv run python run.py        # http://127.0.0.1:10000/admin/  admin/admin123
```

**方式二：向导式**

打开侧栏面板 → 点示例 chip 或写一句话 → （可选）调整高级选项 → 「生成启动指令」→ 复制粘贴到对话。

**迭代**：任何阶段直接说"给预定记录加个审批状态字段"——Agent 修改 ISD 后重新渲染，项目干净重建。

## ISD 规范速览

```jsonc
{
  "isd_version": 1,
  "project": { "name": "会议室预定系统", "code": "meeting-room" },
  "requirements": { "description": "……", "domain": "行政办公" },
  "stack": { "target": "flask-admin", "theme": "yeti" },
  "modules": [
    {
      "name": "MeetingRoom",                       // PascalCase
      "label": "会议室",
      "description": "会议室台账",
      "fields": [
        { "name": "room_name", "label": "会议室名称",
          "type": "string", "required": true, "search": true }
      ]
    }
  ]
}
```

**模块关系**（一对多/一对一）：用 `relations` 声明，而不是字符串字段模拟关联——

```jsonc
"relations": [
  { "type": "many-to-one", "from": "Allocation", "to": "Employee",
    "field": "employee", "label": "领用人", "display_field": "name" }
]
```

渲染器生成真实外键 + `relationship`，创建/编辑表单变成关联下拉，列表显示关联对象。

**中性类型系统**（渲染器负责映射到具体栈）：

| ISD 类型 | Flask-Admin 映射 | 说明 |
|---|---|---|
| `string` | `db.String` | 单行文本 |
| `text` | `db.Text` | 多行文本 |
| `integer` / `float` | `db.Integer` / `db.Float` | 数量、金额 |
| `boolean` | `db.Boolean` | 状态开关 |
| `date` / `time` / `datetime` | `db.Date` / `db.Time` / `db.DateTime` | 日期时间 |
| `enum` + `choices` | `db.Enum("A", "B", …)` | 状态/类别字段，表单渲染为下拉选择 |

约定：`id` / `created_time` / `modified_time` 自动注入；内置 `User` 模型（`admin/admin123`）——蓝图里不需要也不允许定义它们。

## 工作原理

```
用户一句话
   │  AI 自动：需求扩写
   ▼
system.isd.json ──(可选确认/对话式修改，随时)──┐
   │                                          │
   │  校验 + 归一化（命名规则、类型白名单、上限） │
   ▼                                          │
info_system_render ──── 确定性渲染（幂等）◀────┘
   │
   ▼
info-systems/<slug>/project/   →   uv run python run.py
```

没有机械流水线：DSH Agent 就是流程引擎，对话即 SOP；唯一确定性的步骤（渲染）下沉为工具，可重放、可测试。详见 [DESIGN.md](DESIGN.md)。

## 项目结构

```
├── index.js               # Host half：注册 info_system_render 工具
├── render/flask_admin.js  # ISD → Flask-Admin 渲染器（纯函数，可单测）
├── client.js              # Client half：侧栏面板 + 向导页面（React, 主题 token 化）
├── locale/                # zh / en 文案
├── icon.svg               # 图标
├── cordis.patch.yml        # bundle 补丁
└── DESIGN.md              # 产品与 UX 设计、实测记录
```

## 路线图

- [ ] v1.x：页面直发会话 · 蓝图实时可视化（projection/wire.view）· 渲染结果专属卡片
- [ ] v2：FastAPI + SQLAdmin / Next.js + Prisma / Vue + Vite 渲染器（栈模板包模式）
- [ ] v2：lark 文本 DSL 前端（`.isd` → 同一棵 ISD AST）

## License

[Apache-2.0](LICENSE)
