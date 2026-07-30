# 用户配置字段说明

这份文档是 `user_config_info.json` 的字段说明书和程序数据契约，用于解释字段含义、类型、允许值、默认值和字段级约束。配置的生成与校验由用户侧程序负责；AI 只用本文档理解配置，不负责生成、补全、修复或校验。文中的示例不是当前项目数据。

当前配置契约版本：**3.0**。

## 一、读取原则

- 用户侧程序依据本文档一次性生成并校验 `user_config_info.json`；只有合规结果才能传入页面生成流程。
- AI 读取实际 `user_config_info.json` 时只做语义理解，不执行 schema 校验，也不得改写配置。
- 配置文件中的开关、字段和科目优先级高于默认页面想法。
- 本文档决定字段如何读取；`business-rules.md` 只约束业务行为，页面编排由 AI 根据实际配置自主决定，视觉执行参考 `frontend-design.md`。
- 内容真实性不属于字段契约，统一遵守 `business-rules.md`。
- **`conversionFlow` 是转化流程的唯一事实来源**：它同时定义"有什么"和"顺序是什么"。AI 必须严格按照 `conversionFlow` 数组顺序和各阶段内 `items` 数组顺序生成页面流程，不得自行调整顺序或增删节点。

## 二、根字段

| 字段名 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `version` | `string` | 是 | 配置契约版本。当前为 `3.0`。 |
| `project` | `object` | 是 | 页面基础信息与生成方向。 |
| `delivery` | `object` | 是 | 转化能力开关、多娃/拓科等全局配置。 |
| `conversionFlow` | `array` | 是 | **转化流程定义**。按数组顺序描述各阶段及阶段内的字段、问题和功能节点。同时决定顺序和内容。 |

## 三、`project`

| 字段名 | 类型 | 必填 | 允许值/默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `name` | `string` | 是 | 2～50 个字符 | 落地页名称，用于页面标题、项目标识和运营识别。 |
| `subject` | `string` | 是 | `中文`、`数学`、`英文` | **进线科目**。用户首次进入页面时的主科目，决定科目条件字段的适用性。 |
| `language` | `string` | 否 | `简体中文`、`English`；| 页面默认语言。 |
| `languageSwitch` | `boolean` | 否 | 默认 `false` | 是否在落地页展示语言切换入口。 |
| `adScene` | `string` | 是 | 自由文本 | 使用或投放场景，例如微信朋友圈广告、抖音信息流。影响话术、转化组件和合规表达。 |
| `theme` | `string` | 是 | 自由文本 | 页面营销主题，例如"暑期特惠班"。影响首屏角度、文案和视觉表达。 |
| `notes` | `string` | 否 | 默认空字符串 | 用户补充的结构、语气和视觉要求。程序原样汇总；不得覆盖结构化字段或核心功能开关。 |

## 四、`delivery`

| 字段名 | 类型 | 必填 | 允许值/默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `devices` | `string[]` | 否 | `pc`、`mobile`；缺失或空数组时为 `["mobile"]` 并告警 | 目标终端，至少包含一项。两项同时存在时优先保证移动端填写体验。 |
| `contactMode` | `string` | 是 | `phone`、`email`、`either` | 用户进线方式。`either` 表示手机号或邮箱任选其一，不是两项都必填。所有科目共用同一联系方式模式。 |
| `flowMode` | `string` | 是 | `direct`、`lead_first` | 流程模式。`direct` 表示无前置需求阶段（`conversionFlow` 中不应包含 `lead` 阶段）；`lead_first` 表示有前置需求阶段。该字段与 `conversionFlow` 的阶段组成应保持一致。 |
| `booking` | `boolean` | 是 | — | 是否启用自主约课及时间段选择。关闭时 `conversionFlow` 中不应包含 `booking` 阶段。 |
| `multiChild` | `boolean` | 是 | — | 是否允许为多个孩子预约/报名。开启时孩子选择页提供添加新孩子入口。 |
| `maxChildren` | `integer` | 条件必填 | `1`～`3` | `multiChild=false` 时强制规范化为 `1`；开启但缺失时默认 `2` 并告警。最大孩子数量。 |
| `multiSubject` | `boolean` | 否 | 默认 `false` | 是否允许选择其他科目（拓科）。关闭时结果页只展示进线科目。 |
| `extraSubjects` | `string[]` | 条件必填 | `中文`、`数学`、`英文` 的子集 | `multiSubject=true` 时至少一项；不得包含 `project.subject`，不得出现未支持科目。拓科科目列表。 |
| `syncCalendar` | `boolean` | 否 | 默认 `false` | 是否在完成约课后提供日历同步。仅在 `booking=true` 且 `conversionFlow` 的 `complete` 阶段包含 `calendarSync` 时生效。 |

### 联系方式规则

- `contactMode=phone`：`conversionFlow` 中必须出现 `phone` 字段，不应出现 `email` 字段。
- `contactMode=email`：`conversionFlow` 中必须出现 `email` 字段，不应出现 `phone` 字段。
- `contactMode=either`：`conversionFlow` 中应同时出现 `phone` 和 `email` 字段，但采用"任选其一"的组合校验；两个字段不能分别标记为必填（应至少一个有效）。
- 验证码（`verification` 节点）验证的对象由 `contactMode` 和用户实际选择决定：`phone` 模式验证手机号，`email` 模式验证邮箱，`either` 模式验证用户当前选择的方式。

### 组合约束

- `booking=false` 时，`syncCalendar` 不生效；`conversionFlow` 中不应出现 `booking` 阶段和 `calendarSync` 节点。
- `multiChild=false` 时，程序把 `maxChildren` 规范化为 `1`；开启时必须生成 `1`～`3` 范围内的有效值。
- `multiSubject=false` 时，程序把 `extraSubjects` 规范化为空数组；开启时必须至少包含一个合法且不同于 `project.subject` 的科目。
- `flowMode=direct` 时，`conversionFlow` 中不应包含 `lead` 阶段。
- 这些字段组合产生的页面行为由 `business-rules.md` 定义；本文档只规定配置能否生成及如何规范化。

## 五、`conversionFlow`

`conversionFlow` 是转化流程的**唯一事实来源**。它用两层数组结构同时描述"有哪些内容"和"顺序是什么"：

- **外层数组顺序**：各转化阶段（stage）的先后执行顺序
- **内层 `items` 数组顺序**：每个阶段内部字段、问题和功能节点的先后顺序

AI 必须严格按照这两层顺序生成页面流程，不得自行调整。

### 阶段列表

| stage | 含义 | 是否必须出现 |
| --- | --- | --- |
| `lead` | 前置需求阶段：需求问题、定级字段等 | 仅 `flowMode=lead_first` 时出现 |
| `contact` | 联系方式阶段：手机号/邮箱、验证码、沟通语言等 | 必须出现 |
| `booking` | 预约阶段：孩子信息、时区、预约时段选择等 | 仅 `booking=true` 时出现 |
| `complete` | 完成阶段：提交、日历同步、结果展示等 | 必须出现 |

### 阶段结构

每个阶段对象结构：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `stage` | `string` | 是 | 阶段标识：`lead`、`contact`、`booking`、`complete` |
| `items` | `array` | 是 | 该阶段内的节点列表，按数组顺序展示 |

### Item 节点类型

每个 item 通过 `kind` 字段区分类型：

#### 1. `field` — 表单字段

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `kind` | `string` | 是 | 固定为 `"field"` |
| `key` | `string` | 是 | 字段标识，对应已知字段（见下方"已知字段表"） |
| `required` | `boolean` | 是 | 是否必填（针对进线科目首次流程） |

#### 2. `question` — 前置需求问题

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `kind` | `string` | 是 | 固定为 `"question"` |
| `questionId` | `string` | 是 | 标准题库中的稳定问题 ID，题目正文和选项从题库读取 |
| `required` | `boolean` | 是 | 是否必答（针对进线科目首次流程） |

#### 3. `verification` — 验证码节点

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `kind` | `string` | 是 | 固定为 `"verification"` |

说明：
- 验证码是单一流程能力，验证当前实际使用的进线字段（手机号或邮箱）。
- 该节点出现在哪个阶段，验证码就在哪个阶段展示。
- 验证码容器使用 `data-verification-stage` 属性标记其所属阶段。

#### 4. `booking` — 预约时段选择

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `kind` | `string` | 是 | 固定为 `"booking"` |

说明：
- 仅在 `booking=true` 时出现，位于 `booking` 阶段内。
- 表示日期和时段选择的交互区域。
- 数据采用MOCK形式。

#### 5. `calendarSync` — 日历同步入口

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `kind` | `string` | 是 | 固定为 `"calendarSync"` |

说明：
- 仅在 `syncCalendar=true` 且 `booking=true` 时出现。
- 位于 `complete` 阶段，提交成功后展示。

#### complete 阶段的固有行为（非配置项）

`complete` 阶段始终包含以下行为，它们是流程的固有部分，**不需要也不应该在 `conversionFlow` 中配置**：

- **提交**：`complete` 阶段始终有提交按钮，触发最终提交，包含防重复提交、加载状态、成功/失败反馈。
- **结果展示**：`complete` 阶段最后始终展示结果页，`booking=false` 时为简洁祝贺页，`booking=true` 时为预约总览页。

这两项行为由业务规则自动保证，与 `conversionFlow` 的 `complete` 阶段中是否配置其他节点无关。

### 已知字段表

下表列出所有已知字段及其类型、默认归属和科目适用性：

| key | 含义 | 类型 | 归属 | 中文 | 数学 | 英文 |
| --- | --- | --- | --- | --- | --- | --- |
| `childName` | 孩子称呼 | `text` | `child` | 可配置 | 必须启用、必填 | 必须启用、必填 |
| `phone` | 家长手机号 | `phone` | `parent` | 由 `contactMode` 决定 | 由 `contactMode` 决定 | 由 `contactMode` 决定 |
| `email` | 家长邮箱 | `email` | `parent` | 由 `contactMode` 决定 | 由 `contactMode` 决定 | 由 `contactMode` 决定 |
| `age` | 孩子年龄 | `select` | `child` | 必须启用、必填 | 不强制（可配置） | 不强制（可配置） |
| `level` | 中文水平 | `select` | `child` | 必须启用、必填 | **不适用** | **不适用** |
| `grade` | 孩子年级 | `select` | `child` | 不强制（可配置） | 必须启用、必填 | 必须启用、必填 |
| `region` | 时区/国家 | `text` | `parent` | 必须启用、必填 | 必须启用、必填 | 必须启用、必填 |
| `commLang` | 沟通语言 | `select` | `parent` | 不强制（可配置） | 不强制（可配置） | 不强制（可配置） |

说明：

- **通用字段**（`childName`、`phone`、`email`、`region`、`commLang`）：在所有科目中均适用。其中 `phone` / `email` 由 `contactMode` 决定是否强制；`region` 所有科目均强制。
- **科目条件字段**（`age`、`level`、`grade`）：不同科目下适用性不同。切换科目时按上表重新判断该字段是否展示、是否必填。
- "必须启用、必填"表示该科目下此字段强制开启、必填；"不适用"表示该科目下此字段不展示、不校验、不提交；"不强制（可配置）"表示可由配置决定是否启用。
- `conversionFlow` 描述的是**进线科目**的流程。拓科科目流程中，字段适用性按科目硬规则重新判断（可能增减字段），但阶段结构和功能节点保持一致。
- `owner=parent` 的字段在所有孩子、所有科目间复用；`owner=child` 的字段归属于具体孩子，换孩子时切换到对应记录。

### 前置问题题库

`kind=question` 的节点通过 `questionId` 引用标准题库。题目正文和选项从题库读取，不在配置中重复维护。

**双语支持：**

- 题库中每道题包含 `questionText`（中文默认文案）和 `questionTextEn`（英文文案）。
- 每个选项包含 `text`（中文）和 `textEn`（英文）。
- AI 生成页面时，根据 `project.language` 选择对应语言：
  - `简体中文` 时使用 `questionText` 和 `text`
  - `English` 时使用 `questionTextEn` 和 `textEn`
- `optionId` 是中英双语的稳定标识符，无论展示哪种语言，提交数据始终使用 `optionId`。

当前标准题库 ID：

| questionId | 科目 | 分类 | 题型 |
| --- | --- | --- | --- |
| `zh_goal_001` | 中文 | 学习期望 | 多选 |
| `zh_level_001` | 中文 | 学习经验 | 单选 |
| `math_goal_001` | 数学 | 学习期望 | 多选 |
| `math_difficulty_001` | 数学 | 学习困难 | 多选 |
| `en_goal_001` | 英文 | 学习期望 | 多选 |
| `en_difficulty_001` | 英文 | 学习困难 | 多选 |

规则：

- 题目正文、题型和选项从标准题库读取。
- 提交选项使用稳定 `optionId`，与展示语言无关。
- **前置问题只在首次进线流程中展示**（第一个孩子 + 进线科目）。后续拓科或拓娃的追加流程中，不展示也不校验前置问题，只填写必要的表单字段。

### 通用规则

1. 隐私同意不是 `conversionFlow` 配置项；其展示、必选和提交行为由 `business-rules.md` 定义。
2. `conversionFlow` 中出现的 `field` 节点即表示启用并展示；未出现的字段不展示、不校验、不提交。
3. `required` 只针对进线科目首次流程；拓科/拓娃流程中字段必填性按科目硬规则重新判断。
4. 科目条件字段（如数学的 `grade`、中文的 `level`）在对应拓科科目下必须启用，即使进线科目 `conversionFlow` 中未出现也不影响拓科时的硬规则。

## 六、选择型字段默认选项

当 `conversionFlow` 或题库未显式提供选项时，使用以下默认值。

### 年龄 `age`

`age` 必须使用选择控件。服务范围是提示和后续顾问判断依据，不应用来删减表单选项。

| 科目 | 选项 | 服务范围提示 |
| --- | --- | --- |
| 中文 | `1岁`～`18岁`、`18岁+` | 3～18岁 |
| 数学 | `1岁`～`15岁`、`15岁+` | 6～15岁 |
| 英文 | `1岁`～`12岁`、`12岁+` | 5～12岁 |

### 中文水平 `level`

仅在科目为中文时展示：

| 稳定值 | 页面展示 |
| --- | --- |
| `no_experience` | 无中文学习经验 |
| `daily_conversation` | 没学过，但能进行日常交流 |
| `under_1_year` | <1 年学习经验 |
| `1_to_2_years` | 1-2 年学习经验 |
| `over_2_years` | 2+ 年学习经验 |
| `native_speaker` | 母语是中文 |

### 年级 `grade`

仅在科目为数学或英文时为必填：

默认选项为 `幼儿园`、`G1`～`G12`。

### 沟通语言 `commLang`

| 稳定值 | 页面展示 |
| --- | --- |
| `zh` | 中文 |
| `en` | English |

## 七、完整示例

```json
{
  "version": "3.0",
  "project": {
    "name": "中秋中文课程落地页",
    "subject": "中文",
    "language": "简体中文",
    "languageSwitch": true,
    "adScene": "Google 信息流广告投放",
    "theme": "中秋传统文化中文体验课",
    "notes": "整体采用高级新中式风格，以中国红、暗金和宣纸色为主。文案语气温情典雅，突出亲子共读、文化传承和家庭团圆。"
  },
  "delivery": {
    "devices": [
      "pc",
      "mobile"
    ],
    "contactMode": "phone",
    "flowMode": "lead_first",
    "booking": true,
    "multiChild": true,
    "maxChildren": 3,
    "multiSubject": true,
    "extraSubjects": [
      "数学",
      "英文"
    ],
    "syncCalendar": true
  },
  "conversionFlow": [
    {
      "stage": "lead",
      "items": [
        {
          "kind": "field",
          "key": "age",
          "required": true
        },
        {
          "kind": "question",
          "questionId": "zh_goal_001",
          "required": true
        },
        {
          "kind": "field",
          "key": "level",
          "required": true
        }
      ]
    },
    {
      "stage": "contact",
      "items": [
        {
          "kind": "field",
          "key": "phone",
          "required": true
        },
        {
          "kind": "verification"
        },
        {
          "kind": "field",
          "key": "commLang",
          "required": true
        }
      ]
    },
    {
      "stage": "booking",
      "items": [
        {
          "kind": "field",
          "key": "childName",
          "required": true
        },
        {
          "kind": "field",
          "key": "region",
          "required": true
        },
        {
          "kind": "booking"
        }
      ]
    },
    {
      "stage": "complete",
      "items": [
        {
          "kind": "calendarSync"
        }
      ]
    }
  ]
}
```

> 示例说明：
> - 使用 `conversionFlow` 统一描述转化流程。
> - 进线科目为中文，`lead` 阶段依次展示：年龄 → 学习期望问题 → 中文水平。
> - `contact` 阶段依次展示：手机号 → 验证码 → 沟通语言。
> - `booking` 阶段依次展示：孩子称呼 → 时区/国家 → 预约时段选择。
> - `complete` 阶段：配置了 `calendarSync`（日历同步）；提交和结果展示是该阶段的固有行为，无需配置。
> - `flowMode=lead_first` 与 `conversionFlow` 包含 `lead` 阶段一致；`booking=true` 与包含 `booking` 阶段一致。
> - 拓科科目（数学、英文）的流程中，科目条件字段按硬规则重新判断（如数学出现 `grade`、不出现 `level`），但阶段结构和功能节点保持。
