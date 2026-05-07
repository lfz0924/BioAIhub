# BioIntelligenceHub v2 工具库文档

> 这套文档的目标不是简单列清单，而是把每个工具卡片写成“能直接拿去改网页”的说明稿。
> 当前范围：17 个工具卡片，按四个分类组织。
> 读法建议：先看分类总览，再点进单个工具页看“指导架构”和“中文使用示例”。

## 文档怎么读

这套页面统一采用同一结构：
- 这个工具做什么
- 适合什么问题
- 指导架构
- 推荐使用流程
- 中文使用示例
- 常见误区
- 和相邻工具的区别
- 给网页改造 AI 的提示

这样写的目的，是让后续网页改版时可以直接把正文拆成卡片、折叠面板或详情页，而不是再重新整理一次语义。

## 建议阅读顺序

### 1. 文献发现
先用这些工具把研究问题变成可检索、可判断、可扩展的材料。
- [PubMed](discovery/pubmed.md) - 先建立检索边界
- [ChatGPT](discovery/chatgpt.md) - 先做关键词脑暴和检索式整理
- [Consensus](discovery/consensus.md) - 先看证据方向是否一致
- [ResearchRabbit](discovery/researchrabbit.md) - 先看引用网络和种子论文
- [Google AI Studio](discovery/gemini.md) - 先做多文档长文本归纳
- [Wispaper](discovery/wispaper.md) - 先读懂单篇复杂论文

### 2. 深度分析
这组工具负责把文献变成结构化表格、中文摘要或可长期复用的知识库。
- [Elicit](analysis/elicit.md) - 先抽字段、做比较表
- [SciSpace](analysis/scispace.md) - 先读 PDF、解释图表和公式
- [Kimi AI](analysis/kimi.md) - 先做批量合成和多篇总结
- [ima.qq.com](analysis/ima.md) - 先建个人知识库，再做跨文档问答

### 3. 学术写作
这组工具负责让英文表达更自然、引用更可靠。
- [Paperpal](writing/paperpal.md) - 先做语言润色
- [Ludwig.guru](writing/ludwig.md) - 先查短语是否地道
- [Scite.ai](writing/scite.md) - 先查引用是否被支持或被反驳

### 4. 学术绘图
这组工具负责把科研内容变成示意图、流程图、封面图或信息图。
- [Gemini Image](image-gen/gemini-image.md) - 先做快速草图
- [ChatGPT (GPT Image 2)](image-gen/chatgpt-image.md) - 先做精确提示词执行
- [Flowith](image-gen/flowith.md) - 先做多分支视觉探索
- [Lovart](image-gen/lovart.md) - 先做成品导向输出

## 给后续网页更新的建议

1. 每个工具页都可以拆成“概述、流程、示例、误区、对比”五个折叠区。
2. 工具卡片的按钮文案最好和文档中的“按钮入口”保持一致，减少跳转认知成本。
3. 如果要做页面导航，建议按“文献发现 -> 深度分析 -> 学术写作 -> 学术绘图”的顺序展示。
4. 示例部分可以直接作为网页里的可复制提示词，适合后续 AI 自动填充。
