
function nxIntentIsSelfInquiry(input) {
  const text = String(input || '').trim();
  if (!text) return false;
  // Genuine requests for external evidence must remain web research.
  if (/^(?:(?:no|actually)[,!.\s]+)?(?:please\s+)?(?:search|research|look\s+up|browse|find\s+(?:online|reports?|sources?))\b/i.test(text)) return false;
  if (/\b(?:is|was)\s+(?:the\s+)?nyx(?:\s+ai)?\s+(?:website|site|server|domain|service)\s+(?:up|down|offline|online|reachable|accessible)\b/i.test(text)) return false;
  if (/\b(?:issues?|problems?|bugs?|errors?)\s+(?:did|do|can|have)\s+you\s+(?:find|discover|identify|notice|see)\s+(?:with|in|at|on|about)\s+\S/i.test(text)) return false;
  const identity=/^(?:who (?:are|r) you|what (?:are|is) (?:nyx(?: ai)?|your name)|what do you do|what can you do|tell me (?:about yourself|who you are)|introduce yourself|describe yourself|what is your (?:purpose|role|name)|who (?:made|created|built) you|are you (?:an?\s+)?(?:ai|assistant|chatbot))\s*[?.!]*$/i.test(text);
  if(identity)return true;
  const ownsProblem = /\b(?:your|nyx(?:'s|’s))\b.{0,42}\b(?:issues?|problems?|bugs?|errors?|mistakes?|limitations?|failures?|status|capabilities|search|answers?|responses?|features?|weaknesses?)\b/i.test(text);
  const troubleWithSelf = /\b(?:issues?|problems?|faults?|trouble|wrong)\b.{0,25}\b(?:with|about|for)\s+(?:you|nyx)\b/i.test(text);
  const issuesThenSelf = /\b(?:issues?|problems?|bugs?|errors?|mistakes?|limitations?|failures?|troubles?|difficulties|challenges?)\b.{0,24}\b(?:do|did|have|had|has|are|were|can|could|will|would|does)\s+(?:you|nyx)\b/i.test(text);
  const selfThenIssues = /\b(?:you|nyx)\b.{0,34}\b(?:have|had|having|are\s+having|were\s+having|facing|encountering|experiencing|struggling\s+with|suffering\s+from)\b.{0,18}\b(?:issues?|problems?|bugs?|errors?|mistakes?|trouble|failures?)\b/i.test(text);
  const repairInquiry = /\b(?:what\s+went\s+wrong|what\s+did\s+you\s+get\s+wrong|why\s+did\s+you|what\s+did\s+you\s+misunderstand|are\s+you\s+working|did\s+you\s+fix|have\s+you\s+fixed|can\s+you\s+search\s+properly)\b/i.test(text);
  const selfStatus = /\b(?:are\s+you|is\s+nyx|how\s+are\s+you|what\s+is\s+your)\b.{0,38}\b(?:working|failing|operating|functioning|status|limitations?|capabilities|doing\s+right\s+now|problems?|issues?)\b/i.test(text);
  return ownsProblem || troubleWithSelf || issuesThenSelf || selfThenIssues || repairInquiry || selfStatus;
}
