export type NormalizedRuleImport = {
  name: string;
  description: string | null;
  pattern: string;
  matchType: "keyword" | "regex";
  flags: string | null;
  errorType: string;
  riskLevel: "low" | "medium" | "high";
  sourceTypes: string[];
  enabled: boolean;
};

export type NormalizedKnowledgeImport = {
  title: string;
  category: string | null;
  keywords: string | null;
  symptom: string | null;
  possibleCause: string | null;
  solution: string | null;
  source: string | null;
};
