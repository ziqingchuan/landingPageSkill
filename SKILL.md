---
name: compose-landing-page
description: Reads a user-uploaded user_config_info.json plus four reference markdown files and a question bank to generate a complete, runnable, distinctive landing-page HTML. Invoke when the user uploads a JSON config and asks to build/generate/preview a landing page, or references a "config-driven landing page" task.
---

# Compose Landing Page

把一份 `user_config_info.json` 配置，转换成业务正确、视觉独特、可直接在浏览器运行的教育类落地页单文件 HTML。流程自包含，不依赖任何外部系统。

配置契约版本 **3.0**，核心：`conversionFlow` 是转化流程的唯一事实来源。

## 输入

| 文件 | 角色 |
| --- | --- |
| `user_config_info.json` | 当前项目实际配置（用户提供） |
| `references/user-config-spec.md` | 字段说明书：字段含义、类型、允许值、默认值 |
| `references/business-rules.md` | 业务护栏：转化、预约、多娃多科等行为不变量 |
| `references/frontend-design.md` | 视觉方向：题材取材、字体、布局、反模板判断 |
| `references/engineering-conventions.md` | 工程护栏：CJK 适配、i18n 渲染模式、命名隔离、初始加载 |
| `references/question-bank.json` | 标准题库：题目正文、选项、科目分类映射 |

参考文件已内置。用户只需提供 `user_config_info.json`。

## 优先级

**有效配置 → 业务不变量 → 用户明确要求 → 工程约定 → 审美方向**

配置是只读事实，不生成、不补全、不校验。`conversionFlow` 的阶段顺序和节点顺序不可调整。冲突时指出具体字段和规则，不静默猜测。

## Workflow

### 第 1 步：获取配置

读取 `user_config_info.json`。未提供则停止；解析失败则指出错误位置。`project.notes` 非空时视为用户对结构、语气和视觉风格的补充偏好，直接影响第 5 步审美方向，但不覆盖结构化字段和功能开关。

### 第 2 步：读取字段说明书

完整读取 `user-config-spec.md`，理解每个字段语义。重点理解 `conversionFlow` 的两层顺序（阶段顺序 + 节点顺序）和 5 种 item 类型（`field` / `question` / `verification` / `booking` / `calendarSync`）。不执行 schema 校验。

### 第 3 步：建立只读业务模型

基于配置和字段说明书，在思考中提取当前项目的业务模型：

- **科目**：进线科目（`project.subject`）+ 拓科科目（`extraSubjects`）
- **转化流程**：`conversionFlow` 的阶段顺序和节点顺序，`verification` 节点所在阶段即验证码位置
- **字段**：哪些启用、哪些必填、归属（parent/child）、科目条件字段
- **开关**：`booking` / `multiChild` / `multiSubject` / `syncCalendar` / `contactMode` / `flowMode`
- **前置需求单元**：`lead` 阶段中所有 field 和 question 节点（按 items 顺序）
- **题库匹配**：`kind=question` 节点的 `questionId` 匹配 `question-bank.json`，按 `project.language` 选取中英文案，提交数据用 `optionId`

### 第 4 步：读取业务规则

完整读取 `business-rules.md`，提取必须满足的业务不变量。业务规则是结果约束，不是模块清单——AI 根据这些约束自主决定信息架构。

### 第 5 步：形成审美方向

完整读取 `frontend-design.md`，按其要求做两阶段设计计划：

1. **brainstorm**：Color（4-6 hex）、Type（2+ 字体角色）、Layout（一句话 + ASCII 线框图）、Signature（单一独特元素）
2. **critique**：对照 `project.theme`、`project.adScene`、`project.notes` 自我批评——任何部分读起来像通用默认就改，确认独特后才写代码

### 第 6 步：生成页面代码

先读取 `engineering-conventions.md`，理解当前配置触发的工程约束（CJK 单位、i18n 渲染模式、命名隔离、初始加载）。这些是代码质量护栏，不改变业务结果。

输出完整的单文件 HTML：

- `<head>` 含 meta、title、Google Fonts CDN 引入、内联 `<style>`；`<body>` 内联 `<script>`
- 不依赖外部构建工具、npm 包或本地文件
- CSS 内联，注意选择器特异性；JS 内联，实现配置要求的全部业务流程
- 所有交互在浏览器内可完成（表单提交可 mock，但需明确标注）
- 装饰性元素优先内联 SVG；照片级素材用免费 CDN 图库直链，加尺寸约束
- 响应式到移动端，可见键盘焦点，尊重 `prefers-reduced-motion`

业务行为按 `business-rules.md` 第 5-11 节实现，编码层补充要求：
- 验证码容器用 `data-verification-stage` 标记阶段
- 无真实时段数据时用明确标注的原型数据，不伪装库存
- 隐藏字段、未启用功能和未选择分支的数据不进入提交结果

### 第 7 步：自检

交付前对照清单自检：

- **业务正确性**：对照 `business-rules.md` 验收清单逐项确认
- **设计质量**：计划通过自我批评、字体颜色从计划推导、Signature 独特、响应式、键盘焦点、`prefers-reduced-motion`、CSS 选择器无抵消
- **工程稳定性**：对照 `engineering-conventions.md` 自检清单逐项确认（CJK 单位、i18n 渲染模式、命名前缀、作用域隔离、初始加载）
- **代码可运行性**：单文件可直接打开运行、无外部依赖、字体经 CDN

### 第 8 步：交付

保存为文件到用户工作目录，文件名基于 `project.name`。用简短自然语言说明：基于哪个配置、实现了哪些核心能力、Signature 元素、哪些数据是原型需替换。

## 失败模式

| 情况 | 处理 |
| --- | --- |
| 未提供 `user_config_info.json` | 停止，提示需要配置文件 |
| JSON 解析失败 | 指出错误位置，不猜测修复 |
| 配置与业务规则冲突 | 指出具体字段和规则，请用户确认 |
| `conversionFlow` 出现未知 kind | 指出具体节点，不静默跳过 |
| 需要真实数据但没有 | 用明确标注的原型数据，不伪装真实 |
| 用户要求与配置冲突 | 按优先级链处理，并向用户说明 |
