/**
 * 转化流程解析脚本
 *
 * 根据 user_config_info.json 中的 conversionFlow 配置，从标准题库中匹配对应的题目内容，
 * 并输出完整的流程解析结果（各阶段、各节点的完整信息）。
 *
 * 核心设计：
 *   - conversionFlow 是转化流程的唯一事实来源（两层数组顺序）
 *   - question 节点通过 questionId 引用题库，题目内容从题库读取
 *   - 题库支持中英双语；根据 project.language 选择对应语言
 *   - 输出完整的流程模型，包含每个阶段、每个节点的完整信息
 *
 * 用法（CLI）：
 *   ts-node resolve-conversion-flow.ts --config ../path/to/user_config_info.json
 *   ts-node resolve-conversion-flow.ts --config ../path/to/user_config_info.json --bank ../path/to/question-bank.json --lang en
 *
 * 用法（模块导入）：
 *   import { resolveConversionFlow } from './resolve-conversion-flow';
 *   const result = resolveConversionFlow(userConfig, questionBank);
 */

import * as fs from 'fs';
import * as path from 'path';

// ===== 类型定义 =====

export interface QuestionOption {
  optionId: string;
  text: string;
  textEn: string;
}

export interface Question {
  questionId: string;
  subject: string;
  category: string;
  type: 'multi_select' | 'single_select';
  questionText: string;
  questionTextEn: string;
  questionTextNote?: string;
  questionTextNoteEn?: string;
  options: QuestionOption[];
}

export interface QuestionBank {
  version: string;
  description: string;
  questions: Question[];
}

// 按语言筛选后的题目（只包含当前语言的文案）
export interface LocalizedQuestion {
  questionId: string;
  subject: string;
  category: string;
  type: 'multi_select' | 'single_select';
  questionText: string;
  questionTextNote?: string;
  options: { optionId: string; text: string }[];
}

// conversionFlow 节点类型
// 注意：submit 和 result 不是配置项，是 complete 阶段的固有行为，不在此处声明
export type FlowItemKind =
  | 'field'
  | 'question'
  | 'verification'
  | 'booking'
  | 'calendarSync';

export interface FieldItem {
  kind: 'field';
  key: string;
  required: boolean;
}

export interface QuestionItem {
  kind: 'question';
  questionId: string;
  required: boolean;
}

export interface VerificationItem {
  kind: 'verification';
}

export interface BookingItem {
  kind: 'booking';
}

export interface CalendarSyncItem {
  kind: 'calendarSync';
}

export type FlowItem =
  | FieldItem
  | QuestionItem
  | VerificationItem
  | BookingItem
  | CalendarSyncItem;

export interface FlowStage {
  stage: 'lead' | 'contact' | 'booking' | 'complete';
  items: FlowItem[];
}

export interface UserConfig {
  version: string;
  project: {
    name: string;
    subject: string;
    language?: string;
    languageSwitch?: boolean;
    adScene: string;
    theme: string;
    notes?: string;
  };
  delivery: {
    devices: string[];
    contactMode: 'phone' | 'email' | 'either';
    flowMode: 'direct' | 'lead_first';
    booking: boolean;
    multiChild: boolean;
    maxChildren: number;
    multiSubject: boolean;
    extraSubjects: string[];
    syncCalendar: boolean;
  };
  conversionFlow: FlowStage[];
}

// 解析后的节点（question 节点补充了当前语言的题库内容）
export interface ResolvedQuestionItem extends QuestionItem {
  question: LocalizedQuestion;
}

export type ResolvedFlowItem =
  | FieldItem
  | ResolvedQuestionItem
  | VerificationItem
  | BookingItem
  | CalendarSyncItem;

export interface ResolvedFlowStage {
  stage: 'lead' | 'contact' | 'booking' | 'complete';
  items: ResolvedFlowItem[];
}

export interface ResolveResult {
  projectSubject: string;
  pageLanguage: string;
  stages: ResolvedFlowStage[];
  questionCount: number;
  missedQuestionIds: string[];
  /** 所有出现的 field key 列表（按出现顺序） */
  fieldKeys: string[];
}

// ===== 核心逻辑 =====

/**
 * 根据语言代码，从题库中提取当前语言的文案，返回 LocalizedQuestion。
 */
export function localizeQuestion(question: Question, language: string): LocalizedQuestion {
  const isEnglish = language === 'English' || language === 'en' || language === 'english';
  return {
    questionId: question.questionId,
    subject: question.subject,
    category: question.category,
    type: question.type,
    questionText: isEnglish ? question.questionTextEn : question.questionText,
    questionTextNote: isEnglish ? question.questionTextNoteEn : question.questionTextNote,
    options: question.options.map((opt) => ({
      optionId: opt.optionId,
      text: isEnglish ? opt.textEn : opt.text,
    })),
  };
}

/**
 * 解析 conversionFlow，补充 question 节点的题库内容，返回完整流程模型。
 *
 * @param userConfig - user_config_info.json 解析后的对象
 * @param questionBank - question-bank.json 解析后的对象
 * @returns 完整的流程解析结果
 */
export function resolveConversionFlow(
  userConfig: UserConfig,
  questionBank: QuestionBank
): ResolveResult {
  const projectSubject = userConfig.project.subject;
  const pageLanguage = userConfig.project.language ?? '简体中文';
  const conversionFlow = userConfig.conversionFlow ?? [];

  // 建立题库索引
  const bankMap = new Map<string, Question>();
  for (const q of questionBank.questions) {
    bankMap.set(q.questionId, q);
  }

  const missedQuestionIds: string[] = [];
  const fieldKeys: string[] = [];
  let questionCount = 0;

  const stages: ResolvedFlowStage[] = conversionFlow.map((stage) => {
    const resolvedItems: ResolvedFlowItem[] = stage.items.map((item) => {
      if (item.kind === 'field') {
        if (!fieldKeys.includes(item.key)) {
          fieldKeys.push(item.key);
        }
        return item;
      }
      if (item.kind === 'question') {
        const question = bankMap.get(item.questionId);
        if (!question) {
          missedQuestionIds.push(item.questionId);
          return item as ResolvedQuestionItem;
        }
        // 校验科目匹配
        if (question.subject !== projectSubject) {
          console.warn(
            `[warn] 题目科目不匹配: questionId=${item.questionId} ` +
            `的科目是"${question.subject}"，但 project.subject 是"${projectSubject}"。`
          );
        }
        questionCount++;
        return {
          ...item,
          question: localizeQuestion(question, pageLanguage),
        };
      }
      return item;
    });

    return {
      stage: stage.stage,
      items: resolvedItems,
    };
  });

  return {
    projectSubject,
    pageLanguage,
    stages,
    questionCount,
    missedQuestionIds,
    fieldKeys,
  };
}

/**
 * 仅提取前置问题（lead 阶段中的 question 节点），按出现顺序。
 * 返回的题目已按页面语言本地化。
 */
export function extractLeadQuestions(
  userConfig: UserConfig,
  questionBank: QuestionBank
): { question: LocalizedQuestion; required: boolean; sortIndex: number }[] {
  const result = resolveConversionFlow(userConfig, questionBank);
  const leadStage = result.stages.find((s) => s.stage === 'lead');
  if (!leadStage) return [];

  const questions: { question: LocalizedQuestion; required: boolean; sortIndex: number }[] = [];
  let idx = 0;
  for (const item of leadStage.items) {
    if (item.kind === 'question' && (item as ResolvedQuestionItem).question) {
      questions.push({
        question: (item as ResolvedQuestionItem).question,
        required: item.required,
        sortIndex: idx++,
      });
    }
  }
  return questions;
}

/**
 * 获取指定科目的所有可用题库 ID 列表（用于配置校验或提示）。
 * 如果传入 language，返回当前语言的题目文案。
 */
export function getAvailableQuestionIds(
  questionBank: QuestionBank,
  subject?: string,
  language?: string
): { questionId: string; subject: string; category: string; questionText: string }[] {
  const lang = language ?? '简体中文';
  return questionBank.questions
    .filter((q) => !subject || q.subject === subject)
    .map((q) => ({
      questionId: q.questionId,
      subject: q.subject,
      category: q.category,
      questionText: lang === 'English' ? q.questionTextEn : q.questionText,
    }));
}

// ===== CLI 入口 =====

function main(): void {
  const args = process.argv.slice(2);
  const configFlag = args.indexOf('--config');
  const bankFlag = args.indexOf('--bank');
  const langFlag = args.indexOf('--lang');

  if (configFlag === -1 || !args[configFlag + 1]) {
    console.error('用法: ts-node resolve-conversion-flow.ts --config <user_config_info.json 路径> [--bank <question-bank.json 路径>] [--lang en|zh]');
    console.error('');
    console.error('选项:');
    console.error('  --config  用户配置文件路径（必填）');
    console.error('  --bank    题库文件路径（可选，默认使用同级 references/question-bank.json）');
    console.error('  --lang    强制指定语言（可选，默认从配置 project.language 读取）');
    process.exit(1);
  }

  const configPath = path.resolve(args[configFlag + 1]);
  const defaultBankPath = path.resolve(__dirname, '../references/question-bank.json');
  const bankPath = bankFlag !== -1 && args[bankFlag + 1]
    ? path.resolve(args[bankFlag + 1])
    : defaultBankPath;

  if (!fs.existsSync(configPath)) {
    console.error(`错误: 配置文件不存在: ${configPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(bankPath)) {
    console.error(`错误: 题库文件不存在: ${bankPath}`);
    process.exit(1);
  }

  const userConfig: UserConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // 如果 CLI 指定了 --lang，覆盖配置中的语言
  if (langFlag !== -1 && args[langFlag + 1]) {
    const langMap: Record<string, string> = { en: 'English', zh: '简体中文' };
    userConfig.project.language = langMap[args[langFlag + 1]] ?? args[langFlag + 1];
    console.warn(`[info] 已通过 --lang 覆盖页面语言为: ${userConfig.project.language}`);
  }

  const questionBank: QuestionBank = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));

  const result = resolveConversionFlow(userConfig, questionBank);

  // 输出 JSON 结果到 stdout
  console.log(JSON.stringify(result, null, 2));

  // 告警输出到 stderr
  if (result.missedQuestionIds.length > 0) {
    console.warn(`\n[warn] 以下 questionId 在题库中未找到: ${result.missedQuestionIds.join(', ')}`);
  }
  console.warn(`\n[info] 页面语言: ${result.pageLanguage}`);
  console.warn(`[info] 流程阶段数: ${result.stages.length}`);
  console.warn(`[info] 问题总数: ${result.questionCount}`);
  console.warn(`[info] 字段总数: ${result.fieldKeys.length}`);
}

// 如果被直接执行（非导入），运行 CLI
if (require.main === module) {
  main();
}