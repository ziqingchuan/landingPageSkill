# 用户配置字段说明

这份文档是 `user_config_info.json` 的字段说明书和程序数据契约，用于解释字段含义、类型、允许值、默认值和字段级约束。配置的生成与校验由用户侧程序负责；AI 只用本文档理解配置，不负责生成、补全、修复或校验。文中的示例不是当前项目数据。

## 一、读取原则

- 用户侧程序依据本文档一次性生成并校验 `user_config_info.json`；只有合规结果才能传入页面生成流程。
- AI 读取实际 `user_config_info.json` 时只做语义理解，不执行 schema 校验，也不得改写配置。
- 配置文件中的开关、字段和科目优先级高于默认页面想法。
- 本文档决定字段如何读取；`business-rules.md` 只约束业务行为，页面编排由 AI 根据实际配置自主决定，视觉执行参考 `frontend-design.md`。
- 内容真实性不属于字段契约，统一遵守 `business-rules.md`。

## 二、根字段

| 字段名 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `version` | `string` | 是 | 配置契约版本。当前建议为 `2.0`。 |
| `project` | `object` | 是 | 页面基础信息与生成方向。 |
| `delivery` | `object` | 是 | 转化流程、联系方式、约课及多娃/拓科配置。 |
| `fields` | `array` | 是 | 表单字段及其顺序、阶段、必填状态和归属。 |
| `leadQuestions` | `array` | 否 | 从标准题库选择的学习需求问题。默认 `[]`。 |

## 三、`project`

| 字段名 | 类型 | 必填 | 允许值/默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `name` | `string` | 是 | 2～50 个字符 | 落地页名称，用于页面标题、项目标识和运营识别。 |
| `subject` | `string` | 是 | `中文`、`数学`、`英文` | 当前页面的主科目。 |
| `language` | `string` | 否 | `简体中文`、`English`；缺失时推断并告警 | 页面默认语言。 |
| `languageSwitch` | `boolean` | 否 | 默认 `false` | 是否在落地页展示语言切换入口。 |
| `adScene` | `string` | 是 | 自由文本 | 使用或投放场景，例如微信朋友圈广告、抖音信息流。影响话术、转化组件和合规表达。 |
| `theme` | `string` | 是 | 自由文本 | 页面营销主题，例如"暑期特惠班"。影响首屏角度、文案和视觉表达。 |
| `notes` | `string` | 否 | 默认空字符串 | 用户补充的结构、语气和视觉要求。程序原样汇总；不得覆盖结构化字段或核心功能开关。 |

## 四、`delivery`

| 字段名 | 类型 | 必填 | 允许值/默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `devices` | `string[]` | 否 | `pc`、`mobile`；缺失或空数组时为 `["mobile"]` 并告警 | 目标终端，至少包含一项。两项同时存在时优先保证移动端填写体验。 |
| `contactMode` | `string` | 是 | `phone`、`email`、`either` | 用户进线方式。`either` 表示手机号或邮箱任选其一，不是两项都必填。 |
| `flowMode` | `string` | 是 | `direct`、`lead_first` | `direct` 从联系方式开始；`lead_first` 先逐页完成前置需求单元。没有有效单元时同样直接进入联系方式。 |
| `booking` | `boolean` | 是 | — | 是否启用自主约课及时间段选择。关闭时不得出现时间段选择器。 |
| `multiChild` | `boolean` | 是 | — | 是否允许完成当前孩子流程后继续为其他孩子填写或约课。 |
| `maxChildren` | `integer` | 条件必填 | `1`～`3` | `multiChild=false` 时强制规范化为 `1`；开启但缺失时默认 `2` 并告警。 |
| `multiSubject` | `boolean` | 否 | 默认 `false` | 是否允许完成当前科目流程后继续选择其他科目。 |
| `extraSubjects` | `string[]` | 条件必填 | `中文`、`数学`、`英文` 的子集 | `multiSubject=true` 时至少一项；不得包含 `project.subject`，不得出现未支持科目。 |
| `syncCalendar` | `boolean` | 否 | 默认 `false` | 是否在完成约课后提供日历同步。仅在 `booking=true` 时生效。 |
| `phoneVerify` | `boolean` | 否 | 默认 `false` | 是否对已展示的手机号字段提供验证码/验证交互。 |
| `emailVerify` | `boolean` | 否 | 默认 `false` | 是否对已展示的邮箱字段提供验证码/验证交互。 |
| `verificationStage` | `string` | 否 | `lead`、`contact`、`booking`；默认 `contact` | 验证码出现的流程阶段。`lead` 仅在 `flowMode=lead_first` 时有效；`booking` 仅在 `booking=true` 时有效。详见 `business-rules.md` 第 7.4 节。 |

### 联系方式规则

- `contactMode=phone`：必须启用 `phone`。
- `contactMode=email`：必须启用 `email`。
- `contactMode=either`：必须同时提供手机号和邮箱入口，但采用"任选其一"的组合校验；不能把两个字段分别标记为必填。
- `phoneVerify=true` 只对实际收集的手机号生效；`emailVerify=true` 同理。
- 验证码是单一流程能力，与当前实际使用的进线字段一对一绑定；不分别配置手机号验证码和邮箱验证码。
- `contactMode=phone` 时验证手机号，`contactMode=email` 时验证邮箱，`contactMode=either` 时验证用户实际选择的联系方式。

### 组合约束

- `booking=false` 时，`syncCalendar` 不生效；程序不得据此生成预约时段配置。
- `multiChild=false` 时，程序把 `maxChildren` 规范化为 `1`；开启时必须生成 `1`～`3` 范围内的有效值。
- `multiSubject=false` 时，程序把 `extraSubjects` 规范化为空数组；开启时必须至少包含一个合法且不同于 `project.subject` 的科目。
- `verificationStage=lead` 仅在 `flowMode=lead_first` 时有效；`verificationStage=booking` 仅在 `booking=true` 时有效。其他组合下回退到 `contact`。
- 这些字段组合产生的页面行为由 `business-rules.md` 定义；本文档只规定配置能否生成及如何规范化。

## 五、`fields`

`fields` 使用数组，以保留展示顺序和转化阶段。每个字段对象结构如下：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `key` | `string` | 是 | 稳定字段标识。旧字段名 `id` 兼容读取，但应规范化为 `key`。 |
| `label` | `string` | 是 | 默认展示名称。 |
| `alias` | `string` | 否 | 页面自定义展示名称；为空时使用 `label`。 |
| `type` | `string` | 是 | `text`、`phone`、`email`、`select` 等控件类型。 |
| `stage` | `string` | 是 | `lead`、`contact`、`booking`。`lead` 表示需求/定级资料，`contact` 表示联系方式及资料补充，`booking` 表示真实预约。具体状态顺序由 `business-rules.md` 定义。 |
| `required` | `boolean` | 是 | 是否必填。硬规则字段会被强制设为 `true`。 |
| `enabled` | `boolean` | 是 | 是否展示并收集。 |
| `locked` | `boolean` | 否 | 是否由业务规则锁定，锁定字段不能关闭或删除。 |
| `conditional` | `boolean` | 否 | 是否仅在满足科目等条件时展示。 |
| `owner` | `string` | 是 | `parent` 或 `child`，用于多娃流程中判断是否复用。 |

### 已知字段

| key | 含义 | 默认类型 | 默认阶段 | 归属 | 硬规则 |
| --- | --- | --- | --- | --- | --- |
| `childName` | 孩子称呼 | `text` | `contact` | `child` | 可配置。旧 key 为 `name`。 |
| `phone` | 家长手机号 | `phone` | `contact` | `parent` | 由 `contactMode` 决定是否强制启用。 |
| `email` | 家长邮箱 | `email` | `contact` | `parent` | 由 `contactMode` 决定是否强制启用。 |
| `age` | 孩子年龄 | `select` | `lead` | `child` | 中文课程必须启用、必填并锁定。 |
| `level` | 中文水平 | `select` | `lead` | `child` | 仅中文课程展示；中文课程必须启用、必填并锁定。 |
| `grade` | 孩子年级 | `select` | `lead` | `child` | 数学和英文课程必须启用、必填并锁定。 |
| `region` | 时区/国家 | `text` | `contact` | `parent` | 所有科目必须启用、必填并锁定。 |
| `commLang` | 沟通语言 | `select` | `contact` | `parent` | 可配置。旧 key 为 `language`。 |

### 字段通用规则

1. `enabled=true` 不等于必填，是否必填以 `required` 为准；但硬规则字段必须同时启用和必填。
2. 业务锁定字段应设置 `locked=true`。当前代码中的 `forced` 与 `locked` 含义相同，序列化时统一输出 `locked`。
3. `owner=parent` 的字段在多娃追加流程中可复用；`owner=child` 的字段需要为每个孩子重新收集。
4. `flowMode=direct` 时不永久改写字段 `stage`；`stage=lead` 的启用字段进入联系方式之后的资料补充阶段，不能因跳过前置问题而被丢弃。
5. 隐私同意不是 `fields` 配置项；其展示、必选和提交行为由 `business-rules.md` 定义。

## 六、`leadQuestions`

用于配置 `flowMode=lead_first` 的前置学习需求阶段。每项结构如下：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `questionId` | `string` | 是 | 标准题库中的稳定问题 ID。 |
| `required` | `boolean` | 是 | 是否必答。 |
| `sortOrder` | `integer` | 是 | 从 `1` 开始且不可重复，决定展示顺序。 |

规则：

- 问题正文、科目、题型和选项从标准题库读取，不在配置中重复维护。
- 当前题库题型均为多选题，提交选项使用稳定 `optionId`。
- 默认只添加当前主科目的题目；跨科题可以保留，但必须产生 warning，不能静默删除。
- `flowMode=direct` 时保留已配置问题，不执行删除或规范化；问题是否参与当前页面流程由 `business-rules.md` 定义。

当前标准题库 ID：

| questionId | 科目 | 分类 |
| --- | --- | --- |
| `zh_goal_001` | 中文 | 学习期望 |
| `math_goal_001` | 数学 | 学习期望 |
| `math_difficulty_001` | 数学 | 学习困难 |
| `en_goal_001` | 英文 | 学习期望 |
| `en_difficulty_001` | 英文 | 学习困难 |

## 七、选择型字段默认选项

当字段配置或题库未显式提供选项时，使用以下默认值。

### 年龄 `age`

`age` 必须使用选择控件。服务范围是提示和后续顾问判断依据，不应用来删减表单选项。

| 科目 | 选项 | 服务范围提示 |
| --- | --- | --- |
| 中文 | `1岁`～`18岁`、`18岁+` | 3～18岁 |
| 数学 | `1岁`～`15岁`、`15岁+` | 6～15岁 |
| 英文 | `1岁`～`12岁`、`12岁+` | 5～12岁 |

### 中文水平 `level`

仅在主科目为中文时展示：

| 稳定值 | 页面展示 |
| --- | --- |
| `no_experience` | 无中文学习经验 |
| `daily_conversation` | 没学过，但能进行日常交流 |
| `under_1_year` | <1 年学习经验 |
| `1_to_2_years` | 1-2 年学习经验 |
| `over_2_years` | 2+ 年学习经验 |
| `native_speaker` | 母语是中文 |

### 年级 `grade`

默认选项为 `幼儿园`、`G1`～`G12`。

### 沟通语言 `commLang`

| 稳定值 | 页面展示 |
| --- | --- |
| `zh` | 中文 |
| `en` | English |


## 八、完整示例

```json
{
  "version": "2.0",
  "project": {
    "name": "中文暑期试听课",
    "subject": "中文",
    "language": "简体中文",
    "languageSwitch": true,
    "adScene": "微信朋友圈广告",
    "theme": "暑期成长计划",
    "notes": "整体风格温暖、可信，突出个性化学习路径"
  },
  "delivery": {
    "devices": ["pc", "mobile"],
    "contactMode": "either",
    "flowMode": "lead_first",
    "booking": true,
    "multiChild": true,
    "maxChildren": 3,
    "multiSubject": true,
    "extraSubjects": ["英文"],
    "syncCalendar": true,
    "phoneVerify": true,
    "emailVerify": false,
    "verificationStage": "contact"
  },
  "fields": [
    { "key": "age", "label": "孩子年龄", "type": "select", "stage": "lead", "required": true, "enabled": true, "locked": true, "owner": "child" },
    { "key": "level", "label": "中文水平", "type": "select", "stage": "lead", "required": true, "enabled": true, "locked": true, "conditional": true, "owner": "child" },
    { "key": "childName", "label": "孩子称呼", "type": "text", "stage": "contact", "required": true, "enabled": true, "owner": "child" },
    { "key": "phone", "label": "家长手机号", "type": "phone", "stage": "contact", "required": false, "enabled": true, "owner": "parent" },
    { "key": "email", "label": "家长邮箱", "type": "email", "stage": "contact", "required": false, "enabled": true, "owner": "parent" },
    { "key": "region", "label": "时区/国家", "type": "text", "stage": "contact", "required": true, "enabled": true, "locked": true, "owner": "parent" },
    { "key": "commLang", "label": "沟通语言", "type": "select", "stage": "contact", "required": true, "enabled": true, "owner": "parent" }
  ],
  "leadQuestions": [
    { "questionId": "zh_goal_001", "required": true, "sortOrder": 1 }
  ]
}
```

> 示例中 `contactMode=either`，所以 `phone` 和 `email` 单项均为 `required=false`；提交时执行"二者至少填写一个"的组合校验。`verificationStage=contact` 表示验证码在联系方式阶段出现，验证用户实际选择的进线方式。
