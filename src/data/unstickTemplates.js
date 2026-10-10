/**
 * Tailored unstick action templates for high-priority commitments.
 * Categorized by priority ID and pillar.
 */

export const UNSTICK_TEMPLATES = {
  // Specific priority templates
  "p-forward-role": [
    "Tailor resume & submit 2 applications for Senior PM / Delivery Manager",
    "Direct LinkedIn InMail to 3 hiring managers at target aviation/tech firms",
    "Follow up on active pipeline applications from last week",
    "Refine 3 STAR interview stories on enterprise delivery & ops turnaround",
    "Review & update portfolio / case studies on recent delivery wins",
  ],
  "p-freedom-planners": [
    "Draft outreach email to 5 local high schools / school districts",
    "Record 1 behind-the-scenes video/Reel demonstrating planner layout",
    "Follow up with previous buyers for reviews and referral bundles",
    "Review ad spend & Shopify / landing page conversion drop-offs",
    "Identify 3 niche educator or productivity creators for partnership",
    "Prepare batch shipping supplies & packaging for incoming orders",
  ],
  "p-finance-runway": [
    "Reconcile Wise balance & Lunch Money recurring expenses",
    "Confirm minimum payments scheduled for AMEX Biz, Apple Card, AMEX Delta",
    "Audit discretionary subscriptions to freeze until next contract",
    "Review upcoming 30-day cash outflow against available checking buffer",
    "Simulate impact of $2k contractor invoice on cash runway horizon",
  ],

  // Pillar-wide fallbacks
  forward: [
    "Identify 3 target companies and map out internal hiring champions",
    "Tailor 2 executive resumes highlighting high-impact delivery leadership",
    "Draft reach-out message to former colleagues for warm introduction",
    "Schedule 1 informational coffee chat / networking screen",
  ],
  freedom: [
    "Draft next product release announcement / social proof email",
    "Optimize store checkout flow and remove conversion friction points",
    "Ship customer order bundle and include handwritten thank-you card",
    "Brainstorm 3 cross-sell ideas for existing customer base",
  ],
  finance: [
    "Perform weekly cash-flow check against Lunch Money recurring budget",
    "Audit high-interest debt balances and update avalanche paydown schedule",
    "Review bank feeds and categorize uncategorized transactions",
  ],
  fortitude: [
    "Schedule 4 gym or cardio sessions into calendar for the upcoming week",
    "Plan weekly high-protein grocery haul and batch meal prep",
    "Protect 8-hour sleep window and establish 10 PM digital wind-down",
  ],
  family: [
    "Block uninterrupted weekend family day / outing on calendar",
    "Review household schedule, upcoming appointments, and chore rhythm",
    "Plan one dedicated 1-on-1 date / conversation check-in",
  ],
};

export function getTemplatesForPriority(priority) {
  if (!priority) return [];
  if (priority.id && UNSTICK_TEMPLATES[priority.id]) {
    return UNSTICK_TEMPLATES[priority.id];
  }
  if (priority.pillar && UNSTICK_TEMPLATES[priority.pillar]) {
    return UNSTICK_TEMPLATES[priority.pillar];
  }
  return [
    "Review blockers and define the single next atomic step",
    "Break current bottleneck down into 3 sub-tasks",
    "Schedule a 30-minute focus block to finish next action",
  ];
}
