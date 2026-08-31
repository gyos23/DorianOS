// Shared by of-bridge.js and bridge-supervisor.js: which browser origins are
// allowed to talk to these localhost servers. A fixed production URL isn't
// enough — every PR gets its own Vercel preview URL
// (dorian-os-<branch-or-hash>-gyos23s-projects.vercel.app), so the pattern
// below covers any preview deployment of this project under this Vercel
// team, not just the one production domain.
const ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost:5173$/,
  /^http:\/\/localhost:4173$/,
  /^https:\/\/dorian-os\.vercel\.app$/,
  /^https:\/\/dorian-os-[a-z0-9-]+-gyos23s-projects\.vercel\.app$/,
];

function isAllowedOrigin(origin) {
  if (!origin) return true; // no Origin header — same-origin or non-browser request
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

module.exports = { isAllowedOrigin };
