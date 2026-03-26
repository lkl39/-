# Model Agent

职责：
- 维护模型调用逻辑
- 维护 Prompt
- 维护输出结构
- 维护综合可信度等级和复查触发条件

输入：
- Rule Agent 输出
- RAG Agent 输出
- 当前异常上下文日志

输出：
- incidentId
- cause
- riskLevel
- confidence
- confidenceLevel
- repairSuggestion
- evidenceLines
- needsReview
- providerUsed

边界：
- 不改知识库表结构
- 不改规则库内容
- 不直接改前端图表