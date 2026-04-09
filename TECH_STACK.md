# TECH_STACK.md

EPQ 学术辅导进度管理系统 · 技术选型建议  
版本：v0.1 · 日期：2026-04-09

---

## 评估维度

- **开发速度**：能多快跑通核心功能
- **维护难度**：六个月后你（或 AI）能否快速读懂并改动
- **生态成熟度**：组件库、文档、AI 辅助质量
- **与架构的契合度**：GitHub Pages 静态部署 + GitHub API 数据层

---

## 方案一：React + Vite + Tailwind CSS + Zustand + Octokit

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | React 18 | 最主流的前端框架 |
| 构建 | Vite | 极快的开发服务器和构建工具 |
| 样式 | Tailwind CSS + shadcn/ui | shadcn 提供现成的高质量组件 |
| 状态 | Zustand | 极简状态管理，比 Redux 轻得多 |
| 数据层 | Octokit（GitHub REST API） | 读写仓库内 JSON 文件 |
| 路由 | React Router v6 | 标准路由方案 |

### 优势

- **AI 辅助最强**：React 是 AI 训练数据覆盖最广的框架，日后请 Claude / Copilot 帮你改功能最顺畅
- **组件库 shadcn/ui** 开箱即用：卡片、表单、进度条、对话框全有，几乎不用手写 UI
- **社区最大**：遇到问题，Stack Overflow / GitHub Issues 几乎全有答案

### 劣势

- JSX 语法和 Hooks 心智模型对没有 React 背景的人有一定门槛
- 概念稍多（useEffect、useMemo 等），代码量比 Vue 略多

### 适合你的原因

你会持续用 AI 辅助开发和维护，React 在这个场景下是最优解。

---

## 方案二：Vue 3 + Vite + Tailwind CSS + Pinia + Octokit

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | Vue 3（Composition API） | 语法更接近原生 JS，上手直观 |
| 构建 | Vite | 同上 |
| 样式 | Tailwind CSS + Naive UI | Naive UI 组件库完整，中文文档好 |
| 状态 | Pinia | Vue 官方推荐，比 Vuex 简洁很多 |
| 数据层 | Octokit | 同上 |
| 路由 | Vue Router 4 | Vue 官方路由 |

### 优势

- **模板语法更直白**：`v-if`、`v-for` 比 JSX 更接近 HTML，改起来更直觉
- **Pinia 状态管理极简**：比 Zustand 还要少样板代码
- **错误提示友好**：Vue 的运行时警告比 React 更易读

### 劣势

- AI（尤其是较旧模型）对 Vue 3 Composition API 的熟悉度稍低于 React
- shadcn/ui 等顶级 React 组件库无法直接用（需用 Vue 生态的替代品）

### 适合你的原因

如果你打算自己阅读和理解代码（而不是纯靠 AI 修改），Vue 的模板语法学习曲线更平缓。

---

## 方案三：纯 HTML + Alpine.js + Tailwind CSS（无构建步骤）

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | Alpine.js | 轻量响应式库，直接写在 HTML 属性里 |
| 样式 | Tailwind CSS（CDN） | Play CDN，无需 npm |
| 数据层 | 原生 fetch + Octokit（CDN） | 直接调 GitHub API |
| 构建 | 无 | 就是 HTML 文件，直接打开 |

### 优势

- **零工具链**：没有 node_modules、没有构建命令、没有版本冲突
- **最易理解**：任何时候打开 .html 文件就能看到全部逻辑
- **部署最简单**：直接把 HTML 文件推到 gh-pages 分支即可

### 劣势

- **难以扩展**：当学生数量增多、功能复杂后，单文件会变成"意大利面代码"
- **没有组件化**：无法复用卡片、表单等 UI 片段，重复代码多
- **AI 辅助效果下降**：代码越长越混，AI 生成的建议越容易出错
- **不推荐用于目标 30 名学生 + 多页面路由的场景**

---

## 对比总结

| | 方案一（React） | 方案二（Vue 3） | 方案三（Alpine） |
|---|---|---|---|
| 开发速度 | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| AI 辅助质量 | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| 维护难度（自己读） | 中 | 低 | 低（初期）→ 高（后期） |
| 可扩展性 | 高 | 高 | 低 |
| 组件库丰富度 | 最高 | 高 | 低 |
| 适合规模 | 30+ | 30+ | <10 个页面 |

---

## 推荐

**首选方案一（React + Vite + Tailwind + shadcn/ui + Zustand + Octokit）**

理由：你的核心维护手段是 AI 辅助，React 是 AI 生成代码质量最高、可参考资料最多的框架。shadcn/ui 能让你在不写任何 UI 代码的情况下快速拥有专业外观。后期迁移到自己服务器时，只需替换数据层（Octokit → 自建 API），其余代码无需改动。

**备选方案二（Vue 3）**：如果你打算亲自学习并理解每一行代码，Vue 更友好。

方案三不推荐用于此项目，在需求增长时会产生大量技术债。
