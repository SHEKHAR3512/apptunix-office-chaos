/**
 * Allowlisted command parser for the fictional terminal. Input is tokenised and matched
 * against a fixed table; anything else is rejected. Nothing here can reach an operating
 * system — the result is only ever an action id understood by the PuzzleEngine.
 */

export interface ParsedCommand { ok: true; action: string; argv: string[] }
export interface RejectedCommand { ok: false; message: string }

interface Rule { pattern: RegExp; action: string | ((m: RegExpMatchArray) => string) }

/** Commands accepted by the DevOps console (Mission 06). Case-insensitive, extra spaces ignored. */
export const PIPELINE_RULES: Rule[] = [
  { pattern: /^help$/, action: "help" },
  { pattern: /^clear$/, action: "clear" },
  { pattern: /^(pipeline\s+)?status$/, action: "status" },
  { pattern: /^(pipeline\s+)?logs?(\s+--tail)?$/, action: "logs" },
  { pattern: /^ls(\s+-la?)?$/, action: "ls" },
  { pattern: /^cat\s+(\.env\.example|deploy\.yml|readme\.md)$/, action: (m) => `cat:${m[1]}` },
  { pattern: /^env\s+(check|diff)$/, action: "env-check" },
  { pattern: /^env\s+pull(\s+--from\s+vault)?(\s+--env\s+production)?$/, action: "env-pull" },
  { pattern: /^npm\s+(run\s+)?test$/, action: "test" },
  { pattern: /^(deploy|pipeline\s+run)(\s+--env)?\s*(production|prod)?$/, action: "deploy" },
  { pattern: /^(deploy|pipeline\s+run)\s+--skip-tests.*$/, action: "skip-tests" },
  { pattern: /^rm\s+-rf\s+node_modules.*$/, action: "rm-node-modules" },
  { pattern: /^git\s+(status|log)(\s+.*)?$/, action: "git-status" },
  { pattern: /^(chai|coffee|make\s+chai)$/, action: "chai" },
];

const MAX_LEN = 80;

export function parseCommand(input: string, rules: Rule[] = PIPELINE_RULES): ParsedCommand | RejectedCommand {
  const line = input.trim().replace(/\s+/g, " ");
  if (!line) return { ok: false, message: "" };
  if (line.length > MAX_LEN) return { ok: false, message: "Command too long." };
  // no shell metacharacters — pipes, redirects, substitution, chaining are all refused
  if (/[;&|`$<>\\]/.test(line)) return { ok: false, message: "This simulated terminal doesn't support pipes, redirects or chaining." };
  const lower = line.toLowerCase();
  for (const r of rules) {
    const m = lower.match(r.pattern);
    if (m) return { ok: true, action: typeof r.action === "string" ? r.action : r.action(m), argv: lower.split(" ") };
  }
  return { ok: false, message: `${lower.split(" ")[0]}: command not found (type \`help\` — this is a simulated terminal)` };
}
