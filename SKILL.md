---
name: compose-landing-page
description: Reads a user-uploaded user_config_info.json plus three reference markdown files to generate a complete, runnable, distinctive landing-page HTML. Invoke when the user uploads a JSON config and asks to build/generate/preview a landing page, or references a "config-driven landing page" task.
---

# Compose Landing Page

把一份用户上传的 `user_config_info.json` 配置，转换成业务正确、视觉独特、可直接在浏览器运行的教育类落地页单文件 HTML。整个流程自包含，不依赖任何外部系统（无 PageCraft、无 Impeccable、无 wukong-landing-design）。

## 输入

本 Skill 期望用户在对话中提供或上传以下文件：

| 文件 | 角色 | 是否必需 |
| --- | --- | --- |
| `user_config_info.json` | 当前项目实际配置，决定页面必须支持的字段、功能与科目 | 必需 |
| `references/user-config-spec.md` | 字段说明书：解释 JSON 每个字段含义、类型、允许值、默认值 | 必需（已内置） |
| `references/business-rules.md` | 业务护栏：定义字段、转化、预约、多娃多科等行为不变量 | 必需（已内置） |
| `references/frontend-design.md` | 视觉方向指南：题材取材、字体、布局、视觉母题、反模板判断 | 必需（已内置） |

三个 `.md` 文件位于 Skill 同级 `references/` 目录，已随项目内置。用户只需提供 `user_config_info.json`（以文件、代码块或 JSON 字符串形式皆可）。

## 优先级

当来源冲突时，按以下顺序处理：

**有效配置 → 业务不变量 → 用户明确要求 → Frontend Design 审美方向**

- 业务规则是护栏，不是页面模板
- 设计风格可以自由变化，但不得改变业务含义、必填规则、开关结果与数据归属
- 遇到真实冲突时指出具体字段和规则，不静默猜测

## Workflow

### 第 1 步：获取并理解配置

1. 读取用户提供的 `user_config_info.json`。如果用户未提供，**停止**并提示需要配置文件才能开始。
2. 确认 JSON 解析成功；如果解析失败，指出具体错误位置，不猜测修复。
3. 把配置视为**只读事实**：不生成、不补全、不修复、不重新校验配置。配置的生成与校验由用户侧负责，AI 只消费最终结果。
4. 读取配置时，若 `project.notes` 非空，将其视为用户对页面**结构、语气和视觉风格**的补充偏好输入。该字段不是装饰，应直接影响第 5 步的审美方向，但不得覆盖结构化字段或核心功能开关。

### 第 2 步：读取字段说明书

完整读取 `references/user-config-spec.md`，目标只有一个：理解每个字段的语义。

- 只理解字段含义，不执行 schema 校验
- 文档中的示例、默认值和解释不是当前项目数据
- 特别注意 `enabled` / `required` / `owner` / `locked` / `stage` 等字段的语义
- 注意 `contactMode`、`flowMode`、`booking`、`multiChild`、`multiSubject` 等开关的组合约束

### 第 3 步：建立只读业务模型

基于配置和字段说明书，在思考中建立当前项目的业务模型：

**科目体系**

- 进线科目：`project.subject`（用户首次进入页面的主科目）
- 拓科科目：`delivery.extraSubjects`（追加流程中可选的其他科目）
- 所有科目：进线科目 + 拓科科目

**字段体系（按科目划分）**

- 通用字段（所有科目均适用）：`childName`、`phone`、`email`、`region`、`commLang`
- 科目条件字段（仅特定科目适用）：
  - `age`：中文必须启用/必填/锁定；数学、英文不强制
  - `level`（中文水平）：仅中文适用，必须启用/必填/锁定
  - `grade`（年级）：数学、英文必须启用/必填/锁定；中文不强制
- `fields` 数组描述的是进线科目的字段配置；拓科科目按科目硬规则重新判断，不直接沿用 `fields` 的 `enabled`/`required`/`locked`

**功能开关**

- 全局开关（所有科目共用）：`booking` / `multiChild` / `multiSubject` / `phoneVerify` / `emailVerify` / `syncCalendar` / `verificationStage`
- `maxChildren`：最大孩子数量（`multiChild=false` 时为 1）
- 联系方式模式：`phone` / `email` / `either`
- 转化流程模式：`direct` / `lead_first`

**前置需求单元（按科目区分，仅首次流程）**

- 首次进线流程（第一个孩子 + 进线科目）：`fields` 中 `enabled=true` 且 `stage=lead` 的字段（按 fields 顺序）+ `leadQuestions` 配置的问题（按 sortOrder）
- 后续拓科拓娃流程：不展示 `leadQuestions`，只展示必要的表单字段（孩子称呼、时区、年龄/水平/年级等）

不改变字段、枚举、开关、顺序、必填状态和默认值。

### 第 4 步：读取业务规则

完整读取 `references/business-rules.md`，提取必须满足的业务不变量：

- 字段显示、必填、归属和联系方式语义
- 科目条件字段规则：进线科目用 `fields` 配置，拓科科目按科目硬规则重新判断
- 转化流程状态机：前置需求单元 → 联系方式 → 资料补充 → 约课（仅 booking=true）→ 提交 → 结果页
- 验证码行为：与当前实际使用的进线字段一对一绑定
- 预约边界：只有 booking=true 才有真实约课；每个"孩子+科目"组合独立预约
- **购票式多娃多科循环**：结果页（总览所有组合）→ 选科目 → 选孩子 → 资料补充 → 预约 → 提交 → 返回结果页
- 结果页：根据 booking 模式呈现（简洁祝贺页或预约总览页），只有一个操作按钮（继续约课/继续报名）
- 隐私、校验、提交、成功、失败和重试行为
- 真实性边界：不虚构师资、评价、价格、库存

业务规则定义的是**结果约束**，不是模块清单。AI 根据这些约束自主决定信息架构。

### 第 5 步：形成审美方向

完整读取 `references/frontend-design.md`，按其要求做两阶段设计计划：

**第一阶段：brainstorm**

基于当前科目、受众、主题、投放场景，以及 `project.notes` 中的用户风格偏好（如有），形成具体审美方向：

- **Color**：4-6 个命名 hex 值构成的调色板
- **Type**：2+ 角色的字体方案（有性格的 display 字体、互补的 body 字体、可选的 utility 字体）
- **Layout**：布局概念，用一句话描述 + ASCII 线框图比较多个方向
- **Signature**：这一个页面会被记住的单一独特元素

**第二阶段：critique**

把第一阶段计划对照 `project.theme`、`project.adScene`、`project.notes` 和受众定位自我批评：

- 如果任何部分读起来像对任何相似页面都会产出的通用默认（暖米色背景 + 衬线 + 赤陶色 / 近黑背景 + 酸性绿 / 报纸式细线 + 零圆角），就修改那部分
- 明确说出改了什么、为什么改
- 只在确认设计计划相对独特后，才开始写代码
- 写代码时严格遵循修订后的计划，每个颜色和字体决定都从计划推导

### 第 6 步：生成页面代码

直接输出完整的、可直接在浏览器打开运行的单文件 HTML：

- `<html>` + `<head>`（含 meta、title、字体引入、内联 `<style>`）+ `<body>` + 内联 `<script>`
- 不依赖外部构建工具、不依赖 npm 包、不引用本地文件
- 字体通过 Google Fonts CDN 引入（或系统字体栈）
- 所有 CSS 内联在 `<style>` 中，注意选择器特异性，避免 `.section` 与 `.cta` 这类基于标签和基于类的选择器互相抵消
- 所有 JS 内联在 `<script>` 中，实现配置要求的全部业务流程

#### 必须实现的业务行为

根据配置实现以下能力（仅实现配置开启的）。

**业务行为：** 按 `business-rules.md` 第 5-11 节实现全部业务行为，包括但不限于：
- 语言与国际化（`project.language`、`project.languageSwitch`）
- 转化流程状态机（`flowMode`、前置需求单元、联系方式、验证码、预约）
- 字段体系（通用字段、科目条件字段、联系方式模式、数据归属与复用）
- 结果页（双模式：`booking=false` 简洁祝贺页 / `booking=true` 预约总览页）
- 购票式多娃多科循环（选科目 → 选孩子 → 资料补充与预约/报名 → 返回结果页）
- 隐私同意、校验、提交、成功、失败和重试状态
- 真实性边界：不虚构师资、评价、成绩、排名、奖项、价格、优惠、学员数量、合作品牌、资质或预约库存

以下为编码层面特有的补充要求：
- 验证码容器使用 `data-verification-stage` 属性标记其阶段
- 没有真实时段数据时，使用明确标注的原型数据（如注释或 placeholder 标记 "prototype"），不伪装成真实库存
- 隐藏字段、未启用功能和未选择分支的数据不进入提交结果

#### CTA 行为与真实性

按 `business-rules.md` 第 6 节（转化目标与 CTA 行为）和第 5 节（真实性与内容边界）实现。

#### 响应式与可访问性

- 根据 `delivery.devices` 支持目标终端（`pc` / `mobile`）；两项同时存在时优先保证移动端填写体验
- 响应式到移动端
- 可见的键盘焦点
- 尊重 `prefers-reduced-motion`

### 第 7 步：自检

生成代码后，在交付前对照以下清单自检：

**业务正确性**

对照 `business-rules.md` 第 14 节「业务验收清单」逐项确认。

**设计质量**

- 设计计划已通过自我批评，不是通用默认模板
- 字体、颜色、布局都从设计计划推导
- Signature 元素确实是这一个页面会被记住的单一独特元素
- 响应式到移动端
- 键盘焦点可见
- `prefers-reduced-motion` 被尊重
- CSS 选择器特异性没有互相抵消

**代码可运行性**

- 单文件 HTML 可直接在浏览器打开运行
- 不依赖外部构建工具或本地文件
- 字体通过 CDN 或系统字体栈引入
- 所有交互在浏览器内可完成（表单提交可 mock 为前端展示，但要明确标注）

### 第 8 步：交付

交付物：单个完整 HTML 文件。

- 在对话中直接展示完整代码（用 ```html 代码块）
- 同时保存为文件到用户工作目录，文件名基于 `project.name`（如 `中文暑期试听课.html`）
- 用简短自然语言说明：
  - 这是什么页面（基于哪个配置生成）
  - 实现了哪些核心业务能力
  - 设计方向的 Signature 元素是什么
  - 哪些数据是原型/占位需要替换

## 决策原则

- 把 `user_config_info.json` 视为唯一项目事实；不生成、不校验、不修复
- 不添加未配置的字段、科目和功能
- 不虚构效果、数据、评价、师资、价格、优惠、合作品牌或预约库存
- 缺少事实型内容时优先省略；编辑态占位必须明确标注
- 把业务规则理解为结果约束，不把规则列表转换成模块列表
- 不追求跨项目结构一致；优先让页面方案匹配当前项目的具体目标和内容条件
- 设计表达可以自由变化，但不得改变业务含义、必填规则、开关结果和数据归属
- 遇到真实冲突时指出具体字段和规则，不静默猜测
- 师资、评价、成果、品牌背书、价格、优惠、FAQ、学习路径、流程说明和价值列表均不是无条件必备模块；只有当前页面方案确实需要且内容有依据时才使用

## 失败模式与边界

| 情况 | 处理 |
| --- | --- |
| 用户未提供 `user_config_info.json` | 停止，提示需要配置文件 |
| JSON 解析失败 | 指出错误位置，不猜测修复 |
| 配置与业务规则存在真实冲突 | 指出具体字段和规则，请用户确认 |
| 配置缺失可选字段 | 按 `user-config-spec.md` 的默认值理解，不补全到配置中 |
| 需要真实数据但没有（如预约时段） | 使用明确标注的原型数据，不伪装真实 |
| 用户要求与配置冲突 | 按"有效配置 → 业务不变量 → 用户明确要求"优先级处理，并向用户说明 |
