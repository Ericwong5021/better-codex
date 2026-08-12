export type WorkflowNodeKind = "agent" | "gate";

export type WorkflowNodeTemplate = {
  id: string;
  title: string;
  role: string;
  summary: string;
  prompt: string;
  kind: WorkflowNodeKind;
  dependencies: string[];
  agent?: string;
};

export type WorkflowAgentTemplate = {
  id: string;
  name: string;
  name_en: string;
  description: string;
  instructions: string;
  avatar: string;
};

export type WorkflowTemplate = {
  id: string;
  version: number;
  name: string;
  name_en: string;
  description: string;
  description_en: string;
  category: string;
  estimated_sessions: number;
  agents: WorkflowAgentTemplate[];
  nodes: WorkflowNodeTemplate[];
};

export const selfMediaWorkflowTemplate: WorkflowTemplate = {
  id: "self-media-campaign",
  version: 1,
  name: "自媒体 Campaign",
  name_en: "Creator Campaign",
  description: "从事实研究、选题决策到多平台生产、独立审校、发布确认与复盘的 Codex 原生工作流。",
  description_en: "A Codex-native creator workflow from research and topic approval through multi-channel production, review, publishing and retrospective.",
  category: "自媒体",
  estimated_sessions: 8,
  agents: [
    { id: "researcher", name: "内容研究", name_en: "Content Research", description: "核对事实、受众问题和趋势信号，建立可追溯的选题证据", instructions: "你是内容研究编辑。先核对工作区里的真实资料，再输出事实、受众问题、趋势信号、风险边界和选题候选。区分已证实事实与推断，不得虚构数据、案例或来源。", avatar: "icon:reviewer" },
    { id: "lead_writer", name: "母内容主笔", name_en: "Lead Writer", description: "把确认后的选题写成统一叙事和事实口径的母内容", instructions: "你是母内容主笔。根据已确认选题和证据包完成可复用母稿，统一核心观点、事实引用、叙事结构、视觉方向和行动号召。所有重要主张必须能追溯到上游证据。", avatar: "icon:docs" },
    { id: "short_editor", name: "短内容编辑", name_en: "Short-form Editor", description: "将母内容改编为微博、即刻、X 等平台短稿", instructions: "你是短内容编辑。保持母内容的事实边界，把它改编成适合短内容平台的钩子、主稿、精简稿、配图建议、标签和互动引导。不得制造母稿中不存在的结论。", avatar: "icon:sparkles" },
    { id: "carousel_editor", name: "图文编辑", name_en: "Carousel Editor", description: "将母内容改编为公众号、小红书等结构化图文", instructions: "你是图文编辑。把母内容改编成标题、封面文案、逐页结构、正文、视觉提示、标签和互动问题，控制每页信息密度并保持事实口径一致。", avatar: "icon:layout" },
    { id: "video_director", name: "视频编导", name_en: "Video Director", description: "将母内容改编为短视频口播、分镜和发布文案", instructions: "你是视频编导。把母内容改编成三秒钩子、完整口播、分镜节奏、画面与字幕提示、封面标题和发布文案，不得添加无法证明的数据或案例。", avatar: "icon:terminal" },
    { id: "content_reviewer", name: "内容审校", name_en: "Content Reviewer", description: "独立检查事实、品牌表达、平台适配和发布风险", instructions: "你是独立内容审校。交叉检查各平台产物的事实可追溯性、前后口径、品牌表达、平台规范、敏感风险和素材缺口。明确列出阻断问题、修改建议和可发布版本。", avatar: "icon:shield" },
    { id: "publishing_operator", name: "发布运营", name_en: "Publishing Operator", description: "整理最终文案、素材、平台参数和发布检查清单", instructions: "你是发布运营。根据人工确认结果整理各平台最终文案、素材路径、封面、标签、发布时间、发布前检查项和发布后数据回填项。不得自行执行外部发布。", avatar: "icon:wrench" },
    { id: "growth_analyst", name: "内容复盘", name_en: "Growth Analyst", description: "根据真实发布结果沉淀经验、资产和下一轮实验", instructions: "你是内容增长分析师。根据真实发布回填总结有效钩子、平台差异、制作瓶颈、可复用资产、待观察指标和下一轮实验假设。数据不足时明确等待，不得伪造效果结论。", avatar: "icon:database" },
  ],
  nodes: [
    {
      id: "research",
      title: "事实研究室",
      role: "研究编辑",
      summary: "收集产品事实、受众问题、趋势信号与可引用证据，形成选题候选。",
      prompt: "核对输入材料和工作区里的真实证据，提炼受众问题、内容机会、可公开事实与风险边界。输出 Content Brief 和 Proof Pack，并给出 3 个按价值排序的选题候选。不要把未经验证的信息写成事实。",
      kind: "agent",
      dependencies: [],
      agent: "researcher",
    },
    {
      id: "topic_gate",
      title: "选题确认",
      role: "主理人",
      summary: "人工确认主选题、核心观点和不应触碰的边界。",
      prompt: "检查研究结果，确认本轮主选题、核心观点、目标平台和事实边界。需要调整时回到上游会话补充；确认后将此任务标记为已完成。",
      kind: "gate",
      dependencies: ["research"],
    },
    {
      id: "master",
      title: "母内容创作室",
      role: "主笔编辑",
      summary: "基于已确认选题写出完整母稿，统一叙事、证据和行动号召。",
      prompt: "根据已确认的 Content Brief 与 Proof Pack 写出一份可复用母内容。包含标题方向、开场钩子、完整论证、事实引用、视觉素材建议、行动号召和平台改写约束。所有重要主张必须能追溯到上游证据。",
      kind: "agent",
      dependencies: ["topic_gate"],
      agent: "lead_writer",
    },
    {
      id: "short_post",
      title: "短内容改编室",
      role: "短内容编辑",
      summary: "产出适合微博、即刻、X 等短内容平台的发布稿。",
      prompt: "把母内容改编成短内容发布包。给出 3 个钩子、1 份主稿、1 份精简稿、配图建议、标签与评论区引导。保留事实边界，不制造母稿没有的结论。",
      kind: "agent",
      dependencies: ["master"],
      agent: "short_editor",
    },
    {
      id: "carousel",
      title: "图文改编室",
      role: "图文编辑",
      summary: "产出适合公众号、小红书等图文平台的结构化发布包。",
      prompt: "把母内容改编成图文发布包。输出标题备选、封面文案、逐页图文结构、正文、视觉提示、标签和互动问题。保证逐页信息密度合理，事实与母稿一致。",
      kind: "agent",
      dependencies: ["master"],
      agent: "carousel_editor",
    },
    {
      id: "video",
      title: "视频改编室",
      role: "视频编导",
      summary: "产出适合抖音、视频号、B 站的口播和分镜方案。",
      prompt: "把母内容改编成视频制作包。输出 3 秒钩子、完整口播、分镜节奏、画面与字幕提示、封面标题、发布文案和评论区引导。不要添加无法证明的数据或案例。",
      kind: "agent",
      dependencies: ["master"],
      agent: "video_director",
    },
    {
      id: "review",
      title: "独立审校室",
      role: "事实与品牌审校",
      summary: "交叉检查各平台稿件的事实、表达、平台适配与发布风险。",
      prompt: "独立审查所有平台产物。逐项检查事实可追溯性、前后口径、品牌表达、平台规范、敏感风险和素材缺口。输出阻断问题、建议修改和可发布版本清单；有阻断问题时明确要求返工。",
      kind: "agent",
      dependencies: ["short_post", "carousel", "video"],
      agent: "content_reviewer",
    },
    {
      id: "publish_gate",
      title: "发布确认",
      role: "主理人",
      summary: "人工确认发布版本、平台、时间与外部操作范围。",
      prompt: "检查独立审校结论，确认最终发布版本、平台、发布时间和账号。外部发布属于不可逆操作；只有明确同意后才将此任务标记为已完成。",
      kind: "gate",
      dependencies: ["review"],
    },
    {
      id: "package",
      title: "发布包整理室",
      role: "发布运营",
      summary: "整理最终文案、素材、平台参数和发布检查清单。",
      prompt: "根据发布确认结果整理 Publication Package。按平台列出最终文案、素材路径、封面、标签、发布时间、发布前检查项和发布后需要回填的数据。不要自行执行外部发布。",
      kind: "agent",
      dependencies: ["publish_gate"],
      agent: "publishing_operator",
    },
    {
      id: "published_gate",
      title: "发布结果回填",
      role: "主理人",
      summary: "人工完成发布并回填公开链接、发布时间和首轮数据。",
      prompt: "完成外部发布后，在此任务中回填各平台公开链接、实际发布时间和可见状态。确认公开页面可访问后，将此任务标记为已完成。",
      kind: "gate",
      dependencies: ["package"],
    },
    {
      id: "retrospective",
      title: "Campaign 复盘室",
      role: "增长分析",
      summary: "基于发布结果沉淀本轮经验、复用资产与下一轮假设。",
      prompt: "读取本轮全部产物与发布回填，完成 Campaign 复盘。总结有效钩子、平台差异、事实或制作瓶颈、可复用资产、待观察指标和下一轮 3 个实验假设。没有足够数据时明确等待窗口，不要伪造效果结论。",
      kind: "agent",
      dependencies: ["published_gate"],
      agent: "growth_analyst",
    },
  ],
};

export const builtInWorkflowTemplates = [selfMediaWorkflowTemplate];

export function workflowTemplate(id: string) {
  return builtInWorkflowTemplates.find(template => template.id === id);
}
