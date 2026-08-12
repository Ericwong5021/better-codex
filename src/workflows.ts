export type WorkflowNodeKind = "agent" | "gate";

export type WorkflowScoreCriterion = {
  id: string;
  title: string;
  maximum: number;
  hard_minimum?: number;
};

export type WorkflowScorecard = {
  minimum_score: number;
  maximum_attempts: number;
  retry_node: string;
  criteria: WorkflowScoreCriterion[];
};

export type WorkflowReceiptRequirement = {
  minimum: number;
};

export type WorkflowMemoryCapture = {
  key: string;
};

export type WorkflowPublishPackageRequirement = {
  minimum_targets: number;
};

export type WorkflowNodeTemplate = {
  id: string;
  title: string;
  role: string;
  summary: string;
  prompt: string;
  kind: WorkflowNodeKind;
  dependencies: string[];
  agent?: string;
  scorecard?: WorkflowScorecard;
  receipt?: WorkflowReceiptRequirement;
  memory?: WorkflowMemoryCapture;
  publish_package?: WorkflowPublishPackageRequirement;
  internal?: boolean;
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

const publicationScorecard = (retryNode: string): WorkflowScorecard => ({
  minimum_score: 85,
  maximum_attempts: 3,
  retry_node: retryNode,
  criteria: [
    { id: "fact_traceability", title: "事实可追溯", maximum: 30, hard_minimum: 27 },
    { id: "insight", title: "洞察与独特观点", maximum: 20 },
    { id: "hook", title: "开场钩子", maximum: 15 },
    { id: "human_voice", title: "个人表达与去 AI 味", maximum: 15 },
    { id: "platform_fit", title: "平台适配", maximum: 10 },
    { id: "asset_readiness", title: "素材可执行性", maximum: 5 },
    { id: "risk_control", title: "风险控制", maximum: 5 },
  ],
});

const sharedReviewAgent: WorkflowAgentTemplate = { id: "reviewer", name: "独立内容审校", name_en: "Independent Reviewer", description: "按事实、洞察、钩子、个人表达与平台适配独立评分", instructions: "你是独立内容审校。逐项核验事实证据、观点质量、钩子、个人表达、平台适配、素材可执行性和发布风险。明确阻断问题并如实评分，不得为放行抬分。", avatar: "icon:shield" };
const sharedRevisionAgent: WorkflowAgentTemplate = { id: "reviser", name: "内容返工", name_en: "Content Reviser", description: "根据逐项评分和阻断问题提交完整修订版本", instructions: "你是内容返工编辑。读取完整审校输出、分项评分和硬失败，逐条修复并提交可再次评分的完整成品，不得只解释而不修改。", avatar: "icon:refresh" };
const sharedPublisherAgent: WorkflowAgentTemplate = { id: "publisher", name: "发布包运营", name_en: "Publication Operator", description: "整理最终内容、素材路径、平台参数和人工发布清单", instructions: "你是发布运营。只整理经人工批准的最终发布包，包含文案、素材、参数、发布时间、检查项与回填项。不得未经明确批准执行外部发布。", avatar: "icon:wrench" };
const sharedAnalystAgent: WorkflowAgentTemplate = { id: "analyst", name: "内容增长复盘", name_en: "Growth Analyst", description: "用真实发布结果沉淀经验、风格记忆和下一轮假设", instructions: "你是内容增长分析师。只依据真实回执和可见数据复盘，沉淀人工修改规律、有效结构、禁用表达和下一轮实验。数据不足时明确等待，不得伪造结论。", avatar: "icon:database" };

function publicationTail(input: { reviewDependencies: string[]; revisionPrompt: string; packagePrompt: string; memoryKey: string }): WorkflowNodeTemplate[] {
  return [
    {
      id: "review",
      title: "Director 独立评分",
      role: "独立内容审校",
      summary: "按统一量表检查事实、洞察、钩子、个人表达、平台适配与风险。",
      prompt: "独立审查所有上游产物。先给出证据核验、分项判断、硬失败、修改要求和可发布性结论，再按工作流协议输出结构化评分。不得为了放行而抬高分数。",
      kind: "agent",
      dependencies: input.reviewDependencies,
      agent: "reviewer",
      scorecard: publicationScorecard("revision"),
    },
    {
      id: "revision",
      title: "低分返工",
      role: "返工编辑",
      summary: "仅在评分不达标时按完整审校反馈返工并再次送审。",
      prompt: input.revisionPrompt,
      kind: "agent",
      dependencies: [],
      agent: "reviser",
      internal: true,
    },
    {
      id: "publish_gate",
      title: "发布确认",
      role: "主理人",
      summary: "人工确认最终版本、平台、时间和外部操作范围。",
      prompt: "检查审校结果和最终版本。明确确认发布平台、账号、发布时间、素材及外部操作范围后，再将此任务标记为已完成。",
      kind: "gate",
      dependencies: ["review", "revision"],
    },
    {
      id: "package",
      title: "发布包整理",
      role: "发布运营",
      summary: "生成可交付给人工或发布适配器的规范化发布包。",
      prompt: input.packagePrompt,
      kind: "agent",
      dependencies: ["publish_gate"],
      agent: "publisher",
      publish_package: { minimum_targets: 1 },
    },
    {
      id: "published_gate",
      title: "发布结果回填",
      role: "主理人",
      summary: "发布完成后回填可验证公开链接与实际发布时间。",
      prompt: "完成外部发布后回填各平台公开链接、实际发布时间和可见状态。确认公开页面可访问后再完成任务。",
      kind: "gate",
      dependencies: ["package"],
      receipt: { minimum: 1 },
    },
    {
      id: "retrospective",
      title: "效果与风格复盘",
      role: "增长分析",
      summary: "基于真实回执沉淀可复用风格记忆和下一轮实验。",
      prompt: "读取本轮全部产物、人工裁决、发布回执与可见修改，复盘有效结构、人工修改规律、平台差异、瓶颈和下一轮实验，并按工作流协议输出风格记忆。数据不足时明确等待窗口。",
      kind: "agent",
      dependencies: ["published_gate"],
      agent: "analyst",
      memory: { key: input.memoryKey },
    },
  ];
}

export const selfMediaWorkflowTemplate: WorkflowTemplate = {
  id: "self-media-campaign",
  version: 2,
  name: "自媒体 Campaign",
  name_en: "Creator Campaign",
  description: "从事实研究、选题决策到多平台生产、独立审校、发布确认与复盘的 Codex 原生工作流。",
  description_en: "A Codex-native creator workflow from research and topic approval through multi-channel production, review, publishing and retrospective.",
  category: "自媒体",
  estimated_sessions: 8,
  agents: [
    { id: "researcher", name: "内容研究", name_en: "Content Research", description: "核对事实、受众问题和趋势信号，建立可追溯的选题证据", instructions: "你是内容研究编辑。先核对工作区里的真实资料，再输出事实、受众问题、趋势信号、风险边界和选题候选。区分已证实事实与推断，不得虚构数据、案例或来源。", avatar: "icon:reviewer" },
    { id: "lead_writer", name: "母内容主笔", name_en: "Lead Writer", description: "把确认后的选题写成统一叙事和事实口径的母内容", instructions: "你是母内容主笔。根据已确认选题和证据包完成可复用母稿，统一核心观点、事实引用、叙事结构、视觉方向和行动号召。所有重要主张必须能追溯到上游证据。", avatar: "icon:docs" },
    { id: "content_reviser", name: "内容返工", name_en: "Content Reviser", description: "根据独立审校反馈统一修订各平台产物", instructions: "你是内容返工编辑。读取原始平台稿和独立审校的逐项评分、硬失败与修改要求，统一修订全部受影响产物。不得删除可靠事实或回避审校问题，完成后提交可再次评分的完整发布版本。", avatar: "icon:refresh" },
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
      prompt: "独立审查所有平台产物。逐项检查事实可追溯性、前后口径、品牌表达、平台规范、敏感风险和素材缺口。先给出逐项判断、阻断问题、修改建议和可发布版本清单，再按工作流要求输出结构化评分。不得为了放行而抬高分数。",
      kind: "agent",
      dependencies: ["short_post", "carousel", "video"],
      agent: "content_reviewer",
      scorecard: publicationScorecard("revision"),
    },
    {
      id: "revision",
      title: "内容返工室",
      role: "返工编辑",
      summary: "仅在评分不达标时，根据完整审校反馈修订各平台产物。",
      prompt: "根据上游审校的逐项评分、硬失败与修改建议，修订短内容、图文和视频发布包。逐条回应问题并输出可再次审校的完整版本，不得只解释而不修改。",
      kind: "agent",
      dependencies: [],
      agent: "content_reviser",
      internal: true,
    },
    {
      id: "publish_gate",
      title: "发布确认",
      role: "主理人",
      summary: "人工确认发布版本、平台、时间与外部操作范围。",
      prompt: "检查独立审校结论，确认最终发布版本、平台、发布时间和账号。外部发布属于不可逆操作；只有明确同意后才将此任务标记为已完成。",
      kind: "gate",
      dependencies: ["review", "revision"],
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
      publish_package: { minimum_targets: 1 },
    },
    {
      id: "published_gate",
      title: "发布结果回填",
      role: "主理人",
      summary: "人工完成发布并回填公开链接、发布时间和首轮数据。",
      prompt: "完成外部发布后，在此任务中回填各平台公开链接、实际发布时间和可见状态。确认公开页面可访问后，将此任务标记为已完成。",
      kind: "gate",
      dependencies: ["package"],
      receipt: { minimum: 1 },
    },
    {
      id: "retrospective",
      title: "Campaign 复盘室",
      role: "增长分析",
      summary: "基于发布结果沉淀本轮经验、复用资产与下一轮假设。",
      prompt: "读取本轮全部产物、人工确认、发布回填和可见修改，完成 Campaign 复盘。总结有效钩子、平台差异、事实或制作瓶颈、可复用资产、待观察指标和下一轮 3 个实验假设，并按工作流要求输出可供下一轮复用的风格记忆。没有足够数据时明确等待窗口，不要伪造效果结论。",
      kind: "agent",
      dependencies: ["published_gate"],
      agent: "growth_analyst",
      memory: { key: "creator-style" },
    },
  ],
};

export const hotspotLongformWorkflowTemplate: WorkflowTemplate = {
  id: "hotspot-longform",
  version: 1,
  name: "热点 → 深度长文",
  name_en: "Trend to Long-form",
  description: "聚合趋势信号、去重聚类，经 4D 深挖生成证据可追溯的公众号或博客长文。",
  description_en: "Turn clustered trend signals into evidence-backed long-form articles through a four-dimension research pass.",
  category: "热点长文",
  estimated_sessions: 8,
  agents: [
    { id: "trend_scout", name: "热点雷达", name_en: "Trend Scout", description: "聚合 RSS、榜单、搜索与社区信号并完成去重聚类", instructions: "你是热点雷达编辑。读取用户提供的 RSSHub、TrendRadar、榜单、搜索或社区素材，按事件去重聚类，记录来源、时间、新鲜度、热度和与账号定位的关联。未提供实时来源时明确说明，不得把模型记忆冒充当前热点。", avatar: "icon:reviewer" },
    { id: "deep_researcher", name: "4D 深挖", name_en: "4D Researcher", description: "从历时、共时、利益相关者和反事实四个维度形成证据图谱", instructions: "你是深度研究编辑。围绕已确认选题，从历时演化、同期横向比较、利益相关者与反事实四个维度研究，输出来源卡、关键证据、争议、未知项和可发表观点。区分事实、引用、推断与观点。", avatar: "icon:database" },
    { id: "longform_writer", name: "长文主笔", name_en: "Long-form Writer", description: "把 4D 证据图谱写成有个人立场的完整长文", instructions: "你是深度长文主笔。依据证据图谱写出标题、导语、核心判断、论证、反方观点、案例、结尾与行动号召。保留个人语气，重要主张可追溯，不堆砌资料。", avatar: "icon:docs" },
    sharedReviewAgent,
    sharedRevisionAgent,
    sharedPublisherAgent,
    sharedAnalystAgent,
  ],
  nodes: [
    {
      id: "signals",
      title: "趋势信号聚合",
      role: "热点雷达",
      summary: "汇总 RSS、榜单、搜索与社区信号，按事件去重聚类。",
      prompt: "读取本轮输入及工作区内已有趋势材料，形成 Trend Cluster。每个聚类列出来源、发生时间、新鲜度、核心事件、热度信号、受众关联与证据缺口，并筛出 5 个候选。若没有实时来源，清楚标注数据边界。",
      kind: "agent",
      dependencies: [],
      agent: "trend_scout",
    },
    {
      id: "topic_gate",
      title: "热点选题确认",
      role: "主理人",
      summary: "人工确认值得追的热点、账号角度与事实边界。",
      prompt: "检查趋势聚类，确认一个主选题、目标读者、账号独特角度、发布时间窗口和不应触碰的事实边界。确认后完成任务。",
      kind: "gate",
      dependencies: ["signals"],
    },
    {
      id: "research_4d",
      title: "4D 深度研究",
      role: "深度研究编辑",
      summary: "从历时、共时、利益相关者和反事实维度建立证据图谱。",
      prompt: "围绕已确认热点完成 4D 研究：纵向追踪事件与概念演化；横向比较同期案例和不同观点；梳理相关方利益与行动；提出反事实与关键未知项。输出可引用来源卡、证据强弱、争议图谱和 3 个非共识观点。",
      kind: "agent",
      dependencies: ["topic_gate"],
      agent: "deep_researcher",
    },
    {
      id: "article",
      title: "深度长文创作",
      role: "长文主笔",
      summary: "基于证据图谱创作兼具事实密度与个人观点的长文。",
      prompt: "写出可直接进入编辑阶段的长文：提供 5 个标题、导语、核心判断、章节结构、完整正文、反方观点回应、引用清单、配图建议和结尾行动号召。明确个人判断，不使用空泛 AI 套话。",
      kind: "agent",
      dependencies: ["research_4d"],
      agent: "longform_writer",
    },
    ...publicationTail({
      reviewDependencies: ["article"],
      revisionPrompt: "根据长文审校的完整反馈修订标题、结构、证据引用、观点和表达，逐条处理硬失败并提交完整可发布长文。",
      packagePrompt: "整理公众号、博客或长文平台发布包，包含最终标题、摘要、正文、引用、封面文案、配图位、标签、发布时间和发布检查项。不得自行发布。",
      memoryKey: "hotspot-longform-style",
    }),
  ],
};

export const commentMiningWorkflowTemplate: WorkflowTemplate = {
  id: "comment-topic-mining",
  version: 1,
  name: "评论 → 反推选题",
  name_en: "Comments to Topics",
  description: "从公开评论或自有评论数据中聚类痛点、语言与购买异议，反推选题并生成内容。",
  description_en: "Cluster audience language, pain points and objections from comments, then turn them into validated content topics.",
  category: "评论洞察",
  estimated_sessions: 8,
  agents: [
    { id: "comment_analyst", name: "评论洞察", name_en: "Comment Analyst", description: "清洗评论、保护隐私并聚类痛点、异议、情绪与原话", instructions: "你是评论研究员。仅处理用户合法提供或公开可引用的评论数据，清理垃圾与重复项，去除可识别个人信息，聚类问题、异议、误解、情绪和受众原话。不得从个别评论泛化总体结论。", avatar: "icon:reviewer" },
    { id: "topic_strategist", name: "选题策略", name_en: "Topic Strategist", description: "把评论簇转为有证据的内容机会矩阵", instructions: "你是选题策略编辑。依据评论簇的频次、强度、业务相关性、内容缺口和可证明性建立选题矩阵，为每个方向提供目标读者、核心承诺、差异化角度和风险。", avatar: "icon:layout" },
    { id: "audience_writer", name: "受众语言主笔", name_en: "Audience-language Writer", description: "使用真实受众语言创作主内容和平台版本", instructions: "你是受众语言主笔。围绕确认选题，吸收评论中的自然表达但不泄露个人信息，写出有同理心、能回应真实异议且事实可靠的母内容和平台版本。", avatar: "icon:docs" },
    sharedReviewAgent,
    sharedRevisionAgent,
    sharedPublisherAgent,
    sharedAnalystAgent,
  ],
  nodes: [
    {
      id: "comments",
      title: "评论数据清洗",
      role: "评论研究员",
      summary: "清洗来源、去重、脱敏并建立可追溯评论样本。",
      prompt: "读取用户提供的评论文件、公开页面采集结果或自有导出数据。记录来源与样本范围，去重、过滤垃圾内容、脱敏个人信息，输出有效样本、代表性原话和数据局限。没有合法来源时停止并说明缺口。",
      kind: "agent",
      dependencies: [],
      agent: "comment_analyst",
    },
    {
      id: "clusters",
      title: "痛点与异议聚类",
      role: "评论研究员",
      summary: "聚类高频问题、情绪、误解、购买异议和受众自然表达。",
      prompt: "将有效评论聚类为问题、目标、情绪、误解、反对理由、购买异议与高共鸣表达。为每簇提供样本数、强度、代表性原话、可能原因和不能下的结论。",
      kind: "agent",
      dependencies: ["comments"],
      agent: "comment_analyst",
    },
    {
      id: "topics",
      title: "选题机会矩阵",
      role: "选题策略",
      summary: "按需求强度、账号匹配和可证明性反推内容机会。",
      prompt: "把评论簇转为选题矩阵，按需求强度、内容缺口、账号匹配、可证明性和转化价值排序。每个候选写清目标读者、核心问题、内容承诺、独特角度、证据需求与发布形态。",
      kind: "agent",
      dependencies: ["clusters"],
      agent: "topic_strategist",
    },
    {
      id: "topic_gate",
      title: "选题人工确认",
      role: "主理人",
      summary: "人工选择一个评论驱动选题及其目标平台。",
      prompt: "检查选题矩阵和评论证据，确认主选题、目标受众、核心承诺、目标平台及隐私边界。确认后完成任务。",
      kind: "gate",
      dependencies: ["topics"],
    },
    {
      id: "content",
      title: "受众语言创作",
      role: "内容主笔",
      summary: "用真实受众语言回应核心痛点并形成多平台内容包。",
      prompt: "围绕确认选题创作母内容与目标平台版本。保留受众自然语言和真实异议，但去除可识别信息；输出钩子、完整内容、常见异议回应、视觉建议、评论引导和事实依据。",
      kind: "agent",
      dependencies: ["topic_gate"],
      agent: "audience_writer",
    },
    ...publicationTail({
      reviewDependencies: ["content"],
      revisionPrompt: "根据审校反馈修订评论驱动内容，修复泛化、隐私、事实、钩子和平台适配问题，提交完整版本。",
      packagePrompt: "整理目标平台发布包，包含最终文案、视觉素材、标签、评论引导、隐私检查、发布时间和发布后需要观察的问题簇。不得自行发布。",
      memoryKey: "comment-topic-style",
    }),
  ],
};

export const sourceToPodcastWorkflowTemplate: WorkflowTemplate = {
  id: "source-to-podcast",
  version: 1,
  name: "资料 → 播客与短音频",
  name_en: "Sources to Podcast",
  description: "把文章、PDF、链接与工作区资料转为可核查播客脚本、短音频切片和发布包。",
  description_en: "Turn articles, PDFs, links and workspace sources into a verifiable podcast script, short audio clips and a publication package.",
  category: "播客音频",
  estimated_sessions: 9,
  agents: [
    { id: "source_editor", name: "资料核验", name_en: "Source Editor", description: "解析资料、建立来源卡与可引用事实边界", instructions: "你是资料编辑。解析用户提供的文章、PDF、链接和工作区文件，为每条重要主张建立来源卡，区分原文事实、作者观点、你的推断和未知项。无法读取的材料明确列出。", avatar: "icon:reviewer" },
    { id: "podcast_writer", name: "播客编剧", name_en: "Podcast Writer", description: "把来源包写成自然对话、有节奏且可追溯的播客脚本", instructions: "你是播客编剧。基于来源包设计单人或双人脚本，包含冷开场、章节、自然转场、例子、反方观点、引用提示和结尾行动号召。口语自然，不制造资料外事实。", avatar: "icon:docs" },
    { id: "audio_producer", name: "音频制作", name_en: "Audio Producer", description: "生成 TTS 制作清单、时间轴、短切片和听感校验项", instructions: "你是音频制作人。根据终稿生成角色与发音表、停顿与重音、音乐音效提示、章节时间轴、TTS 制作清单和短音频切片脚本。若没有可用音频工具，输出可执行制作包而不声称已生成音频。", avatar: "icon:terminal" },
    sharedReviewAgent,
    sharedRevisionAgent,
    sharedPublisherAgent,
    sharedAnalystAgent,
  ],
  nodes: [
    {
      id: "sources",
      title: "资料解析与来源卡",
      role: "资料编辑",
      summary: "解析文章、PDF、链接和文件，建立可引用来源包。",
      prompt: "读取所有可访问资料，为每条重要主张记录来源、位置、日期、原意、可公开边界和置信度。输出 Source Pack、冲突信息、未知项及无法读取的材料。不得补写来源没有的信息。",
      kind: "agent",
      dependencies: [],
      agent: "source_editor",
    },
    {
      id: "angle_gate",
      title: "节目角度确认",
      role: "主理人",
      summary: "人工确认听众、节目形式、时长与核心观点。",
      prompt: "检查来源包，确认目标听众、单人或双人形式、目标时长、节目核心观点、必须引用内容和禁区。确认后完成任务。",
      kind: "gate",
      dependencies: ["sources"],
    },
    {
      id: "script",
      title: "播客脚本创作",
      role: "播客编剧",
      summary: "形成自然口语、章节清晰且引用可追溯的完整脚本。",
      prompt: "创作完整播客脚本：标题与简介、冷开场、章节时间预算、逐句或分段台词、引用提示、自然转场、反方观点、结尾和 show notes。所有关键事实标记来源卡编号。",
      kind: "agent",
      dependencies: ["angle_gate"],
      agent: "podcast_writer",
    },
    {
      id: "clips",
      title: "短音频切片设计",
      role: "播客编剧",
      summary: "从完整脚本提炼可独立成立的短音频片段。",
      prompt: "从完整脚本设计 3 至 5 个 30 至 90 秒短音频切片。每个切片提供钩子、完整台词、目标时长、字幕、封面文案、视觉建议和导流文案，不能断章取义。",
      kind: "agent",
      dependencies: ["script"],
      agent: "podcast_writer",
    },
    {
      id: "production",
      title: "音频制作包",
      role: "音频制作人",
      summary: "输出角色、发音、时间轴、TTS、音乐音效和听感检查清单。",
      prompt: "整理完整音频制作包：角色和音色建议、专有名词发音表、停顿重音、章节时间轴、音乐音效提示、TTS 或真人录制步骤、响度与导出规范、完整节目和短切片资产清单。明确哪些资产尚未实际生成。",
      kind: "agent",
      dependencies: ["script", "clips"],
      agent: "audio_producer",
    },
    ...publicationTail({
      reviewDependencies: ["production"],
      revisionPrompt: "根据审校反馈修订播客脚本、引用、口语表达、短切片与制作包，逐条修复硬失败并提交完整版本。",
      packagePrompt: "整理播客与短音频发布包：最终音频或待制作资产路径、标题、简介、show notes、章节、字幕、封面、短切片、平台参数和发布检查项。不得声称未生成资产已完成。",
      memoryKey: "podcast-voice-style",
    }),
  ],
};

export const productShortVideoWorkflowTemplate: WorkflowTemplate = {
  id: "product-short-video",
  version: 1,
  name: "产品资料 → 短视频",
  name_en: "Product to Short Video",
  description: "从真实产品资料提炼卖点，生成脚本、镜头、字幕、素材清单与多平台短视频发布包。",
  description_en: "Turn verified product materials into scripts, shots, captions, asset manifests and multi-platform short-video packages.",
  category: "产品视频",
  estimated_sessions: 9,
  agents: [
    { id: "product_researcher", name: "产品事实核验", name_en: "Product Researcher", description: "建立功能、受众、证据、竞品和禁用承诺的事实包", instructions: "你是产品研究编辑。只依据真实产品资料、可运行界面、截图、演示、用户反馈和可验证公开信息建立事实包。区分已实现、配置可用、计划中与推测，禁止夸大功能或伪造效果。", avatar: "icon:reviewer" },
    { id: "video_strategist", name: "短视频策略", name_en: "Short-video Strategist", description: "把产品事实转为受众痛点、内容角度、钩子和证明方式", instructions: "你是短视频内容策略。把产品事实映射到具体受众、使用场景、问题、价值承诺和现场证明方式，输出可拍摄角度矩阵。卖点必须有对应证据或画面。", avatar: "icon:layout" },
    { id: "script_director", name: "短视频编导", name_en: "Short-video Director", description: "生成口播、镜头、节奏、字幕和平台版本", instructions: "你是短视频编导。基于已确认角度生成 15、30、60 秒脚本与逐镜头分镜，包含钩子、画面证据、口播、字幕、转场、节奏、封面和行动号召。不得使用无法拍到或无法证明的内容。", avatar: "icon:terminal" },
    { id: "asset_producer", name: "视频资产统筹", name_en: "Video Asset Producer", description: "核对真实素材并形成可执行拍摄、录屏和剪辑清单", instructions: "你是视频资产统筹。清点真实产品图、录屏、B-roll、品牌资产、字幕、音乐和音效，标记已有、待生成、待拍摄与不可用资产，输出时间轴和剪辑交付清单。不得把建议素材写成已完成素材。", avatar: "icon:wrench" },
    sharedReviewAgent,
    sharedRevisionAgent,
    sharedPublisherAgent,
    sharedAnalystAgent,
  ],
  nodes: [
    {
      id: "facts",
      title: "产品事实与素材盘点",
      role: "产品研究编辑",
      summary: "核对产品能力、目标人群、证据、现有素材和宣传禁区。",
      prompt: "读取产品资料和工作区证据，建立 Product Proof Pack：已实现能力、目标人群与场景、关键优势、限制、真实界面或结果证据、现有素材、待补素材、竞品差异和禁用承诺。每个卖点标记证据位置。",
      kind: "agent",
      dependencies: [],
      agent: "product_researcher",
    },
    {
      id: "angles",
      title: "短视频角度矩阵",
      role: "内容策略",
      summary: "把产品事实映射成不同受众、钩子、证明动作与平台机会。",
      prompt: "基于 Product Proof Pack 设计 6 个短视频角度。每个角度包含目标受众、具体痛点、3 秒钩子、核心承诺、现场证明画面、内容节奏、目标平台、制作成本和风险，按预期价值与可执行性排序。",
      kind: "agent",
      dependencies: ["facts"],
      agent: "video_strategist",
    },
    {
      id: "angle_gate",
      title: "视频方向确认",
      role: "主理人",
      summary: "人工确认角度、目标平台、时长、出镜形式与宣传边界。",
      prompt: "检查角度矩阵，确认主角度、目标平台、目标时长、真人出镜或纯录屏、核心行动号召及宣传禁区。确认后完成任务。",
      kind: "gate",
      dependencies: ["angles"],
    },
    {
      id: "scripts",
      title: "脚本与分镜设计",
      role: "短视频编导",
      summary: "输出不同长度的口播脚本、逐镜头画面与字幕。",
      prompt: "围绕确认角度制作 15、30、60 秒三个脚本版本。逐镜头列出时间码、画面、产品证据、口播、字幕、动作、转场与音效，并提供封面标题、发布文案和评论引导。每个卖点必须在画面或来源中可证明。",
      kind: "agent",
      dependencies: ["angle_gate"],
      agent: "script_director",
    },
    {
      id: "assets",
      title: "素材与剪辑清单",
      role: "视频资产统筹",
      summary: "将脚本变成可拍摄、可录屏、可剪辑的资产时间轴。",
      prompt: "逐镜头核对真实素材，输出资产清单和剪辑时间轴。标记每项资产为已有、待录屏、待拍摄、待生成或缺失，给出文件路径、尺寸、时长、字幕、音乐音效、导出规格和替代方案。不能把资产建议冒充实际文件。",
      kind: "agent",
      dependencies: ["scripts"],
      agent: "asset_producer",
    },
    ...publicationTail({
      reviewDependencies: ["assets"],
      revisionPrompt: "根据审校反馈修订短视频角度、脚本、镜头、产品证明、字幕和素材清单，移除夸大或不可执行内容并提交完整版本。",
      packagePrompt: "整理抖音、视频号、B 站、小红书等目标平台发布包，包含最终视频资产或待制作清单、封面、标题、文案、标签、字幕、比例、时长、平台参数和检查项。不得声称未制作视频已存在。",
      memoryKey: "product-video-style",
    }),
  ],
};

export const multilingualDistributionWorkflowTemplate: WorkflowTemplate = {
  id: "multilingual-distribution",
  version: 1,
  name: "母内容 → 多语言分发",
  name_en: "Master Content to Localized Distribution",
  description: "锁定事实与品牌真值，完成术语库、文化本地化、逐语言审校和多平台发布包。",
  description_en: "Lock source truth and brand voice, then produce glossary-backed cultural localization, per-locale review and platform packages.",
  category: "多语言分发",
  estimated_sessions: 9,
  agents: [
    { id: "source_curator", name: "母内容真值", name_en: "Source Curator", description: "锁定可翻译母稿、事实、品牌术语与不可变元素", instructions: "你是母内容编辑。读取原始内容、证据与品牌规范，建立翻译 Source of Truth，标记事实、专有名词、固定表达、可改写部分、不可翻译项和风险。不得自行修正未经授权的事实。", avatar: "icon:reviewer" },
    { id: "localizer", name: "文化本地化", name_en: "Cultural Localizer", description: "按目标市场重写语气、案例、单位、钩子和行动号召", instructions: "你是多语言本地化编辑。不是逐字翻译，而是在保留事实与品牌真值的前提下，按目标地区的文化、平台、语气、单位、日期、惯用表达和行动号召重写。对无法自然本地化的内容提出替代方案。", avatar: "icon:docs" },
    { id: "locale_reviewer", name: "语言与文化审校", name_en: "Locale Reviewer", description: "逐语言回译核对事实、术语、自然度与文化风险", instructions: "你是语言与文化审校。逐目标语言检查事实漂移、术语一致性、语法、自然度、文化风险、单位日期和平台规范，并用回译摘要证明核心含义未改变。", avatar: "icon:shield" },
    { id: "distribution_editor", name: "多平台分发编辑", name_en: "Distribution Editor", description: "按语言和平台生成标题、正文、视觉文字与发布参数", instructions: "你是国际内容分发编辑。根据通过审校的本地化内容，按每个语言与平台生成标题、正文、视觉文字、标签、替代文本、发布时间建议和字符限制检查。", avatar: "icon:layout" },
    sharedReviewAgent,
    sharedRevisionAgent,
    sharedPublisherAgent,
    sharedAnalystAgent,
  ],
  nodes: [
    {
      id: "source_truth",
      title: "母内容与术语真值",
      role: "母内容编辑",
      summary: "锁定事实、证据、品牌语气、术语和不可变元素。",
      prompt: "读取母内容、来源与品牌材料，输出 Localization Source Pack：可翻译母稿、事实清单、来源、品牌语气、术语表、专有名词、固定 CTA、不可翻译或必须保留项、可自由改写项和风险。",
      kind: "agent",
      dependencies: [],
      agent: "source_curator",
    },
    {
      id: "locale_gate",
      title: "语言与市场确认",
      role: "主理人",
      summary: "人工确认目标语言、地区、平台、受众与品牌边界。",
      prompt: "检查 Source Pack，确认目标语言及地区、目标受众、平台、语气、本地化自由度、发布时间区和必须保留的品牌元素。确认后完成任务。",
      kind: "gate",
      dependencies: ["source_truth"],
    },
    {
      id: "localization",
      title: "文化本地化",
      role: "本地化编辑",
      summary: "按目标市场重写钩子、语气、案例、单位与行动号召。",
      prompt: "为每个已确认语言和地区生成自然本地化版本。保留事实真值和品牌核心，调整钩子、语序、语气、文化参照、单位、日期与 CTA；每个重要改写附原因，并列出无法确定的本地化问题。",
      kind: "agent",
      dependencies: ["locale_gate"],
      agent: "localizer",
    },
    {
      id: "locale_review",
      title: "逐语言回译审校",
      role: "语言与文化审校",
      summary: "检查事实漂移、术语、自然度、文化风险并给出回译摘要。",
      prompt: "逐语言审校本地化稿。核对事实与数字、术语一致性、语法、母语自然度、文化敏感性、平台规范、单位和日期；提供核心段落回译摘要、问题清单和修订后的各语言终稿。",
      kind: "agent",
      dependencies: ["localization"],
      agent: "locale_reviewer",
    },
    {
      id: "distribution",
      title: "多语言平台适配",
      role: "分发编辑",
      summary: "按语言和平台生成最终标题、正文、视觉文字与参数。",
      prompt: "把通过语言审校的终稿适配到每个目标平台。逐语言列出标题、正文、短版、视觉文字、替代文本、标签、链接与 UTM 约定、字符限制、发布时间区和素材变化，保持版本一一对应。",
      kind: "agent",
      dependencies: ["locale_review"],
      agent: "distribution_editor",
    },
    ...publicationTail({
      reviewDependencies: ["distribution"],
      revisionPrompt: "根据独立评分修订所有受影响语言版本，处理事实漂移、术语、文化、本地表达和平台适配问题，提交完整多语言发布包。",
      packagePrompt: "整理按语言、地区和平台分组的最终发布包，包含文案、视觉文字、素材、替代文本、链接参数、时区、发布时间和逐版本检查项。不得自行发布。",
      memoryKey: "multilingual-brand-style",
    }),
  ],
};

export const builtInWorkflowTemplates = [
  selfMediaWorkflowTemplate,
  hotspotLongformWorkflowTemplate,
  commentMiningWorkflowTemplate,
  sourceToPodcastWorkflowTemplate,
  productShortVideoWorkflowTemplate,
  multilingualDistributionWorkflowTemplate,
];

export function workflowTemplate(id: string) {
  return builtInWorkflowTemplates.find(template => template.id === id);
}
