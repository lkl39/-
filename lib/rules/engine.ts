import { defaultDetectionRules } from "@/lib/rules/default-rules";
import type { DetectedIncident, DetectionRule } from "@/lib/rules/types";

function normalizeSourceType(sourceType: string) {
  return sourceType.trim().toLowerCase() || "custom";
}

function isRuleEnabled(rule: DetectionRule, sourceType: string) {
  if (rule.enabled === false) {
    return false;
  }

  if (!rule.sourceTypes || rule.sourceTypes.length === 0) {
    return true;
  }

  return rule.sourceTypes.includes(sourceType);
}

function matchesRule(line: string, rule: DetectionRule) {
  if (rule.matchType === "keyword") {
    return line.toLowerCase().includes(rule.pattern.toLowerCase());
  }

  return new RegExp(rule.pattern, rule.flags).test(line);
}

function isStackTraceNoiseLine(line: string) {
  return (
    /^at\s+[\w.$/<>-]+\(/.test(line) ||
    /^\.\.\.\s+\d+\s+(?:more|common frames omitted)/i.test(line) ||
    /^Suppressed:\s+/i.test(line)
  );
}

export function detectLogIncidents(
  content: string,
  sourceType: string,
  databaseRules: DetectionRule[] = [],
) {
  const normalizedSourceType = normalizeSourceType(sourceType);
  const rules = [...defaultDetectionRules, ...databaseRules].filter((rule) =>
    isRuleEnabled(rule, normalizedSourceType),
  );

  const lines = content.split(/\r\n|\r|\n/);
  const incidents: DetectedIncident[] = [];

  lines.forEach((line, index) => {
    const normalizedLine = line.trim();

    if (!normalizedLine || isStackTraceNoiseLine(normalizedLine)) {
      return;
    }

    const matchedRule = rules.find((rule) => matchesRule(normalizedLine, rule));

    if (!matchedRule) {
      return;
    }

    incidents.push({
      ruleId: matchedRule.id,
      ruleName: matchedRule.name,
      errorType: matchedRule.errorType,
      riskLevel: matchedRule.riskLevel,
      lineNumber: index + 1,
      rawText: normalizedLine,
    });
  });

  return incidents;
}
