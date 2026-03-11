export type MatchType = "keyword" | "regex";

export type DetectionRule = {
  id: string;
  name: string;
  description: string;
  matchType: MatchType;
  pattern: string;
  flags?: string;
  errorType: string;
  riskLevel: "low" | "medium" | "high";
  sourceTypes?: string[];
  enabled?: boolean;
};

export type DetectedIncident = {
  ruleId: string;
  ruleName: string;
  errorType: string;
  riskLevel: "low" | "medium" | "high";
  lineNumber: number;
  rawText: string;
};
