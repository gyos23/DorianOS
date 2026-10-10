/**
 * Smart, resilient project matcher for DorianOS and OmniFocus 4.
 * Handles renumbering (1 -> 2, 3 -> 1), renaming ("Find" -> "Land", "Health" -> "Wealth"),
 * variable whitespace, emoji decorations, and semantic synonyms.
 */

export function cleanProjectString(s = "") {
  return s
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\d+/g, " ") // Strip numbers (1, 2, 3) so renumbering doesn't break matching
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function matchProjectNames(target, candidate) {
  if (!target || !candidate) return false;
  const t = target.toLowerCase().trim();
  const c = candidate.toLowerCase().trim();

  // 1. Exact or substring match
  if (t === c || t.includes(c) || c.includes(t)) return true;

  // 2. Cleaned without emojis and numbers
  const cleanT = cleanProjectString(t);
  const cleanC = cleanProjectString(c);

  if (cleanT && cleanC && (cleanT.includes(cleanC) || cleanC.includes(cleanT))) {
    return true;
  }

  // 3. Semantic keyword clustering for known life pillars & core ventures
  // Forward: "Find Next Role" <-> "Land Next Role"
  const isRoleT = t.includes("role") || t.includes("land") || t.includes("find next");
  const isRoleC = c.includes("role") || c.includes("land") || c.includes("find next");
  if (isRoleT && isRoleC) return true;

  // Freedom: "Sell 300 Planners" <-> "300 Planners"
  const isPlanT = t.includes("planner") || t.includes("300");
  const isPlanC = c.includes("planner") || c.includes("300");
  if (isPlanT && isPlanC) return true;

  // Finance: "Financial Health" <-> "Improve Financial Wealth" <-> "Runway"
  const isFinT = t.includes("financ") || t.includes("wealth") || t.includes("runway");
  const isFinC = c.includes("financ") || c.includes("wealth") || c.includes("runway");
  if (isFinT && isFinC) return true;

  return false;
}
