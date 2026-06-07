[Sitemap](https://ai.sulat.com/sitemap/sitemap.xml)

[Open in app](https://play.google.com/store/apps/details?id=com.medium.reader&referrer=utm_source%3DmobileNavBar&source=post_page---top_nav_layout_nav-----------------------------------------)

Sign up

[Sign in](https://medium.com/m/signin?operation=login&redirect=https%3A%2F%2Fai.sulat.com%2Fhow-the-creator-of-claude-code-actually-uses-it-13-practical-moves-2bf02eec032a&source=post_page---top_nav_layout_nav-----------------------global_nav------------------)

[Medium Logo](https://medium.com/?source=post_page---top_nav_layout_nav-----------------------------------------)

Get app

[Write](https://medium.com/m/signin?operation=register&redirect=https%3A%2F%2Fmedium.com%2Fnew-story&source=---top_nav_layout_nav-----------------------new_post_topnav------------------)

[Search](https://medium.com/search?source=post_page---top_nav_layout_nav-----------------------------------------)

Sign up

[Sign in](https://medium.com/m/signin?operation=login&redirect=https%3A%2F%2Fai.sulat.com%2Fhow-the-creator-of-claude-code-actually-uses-it-13-practical-moves-2bf02eec032a&source=post_page---top_nav_layout_nav-----------------------global_nav------------------)

![Unknown user](https://miro.medium.com/v2/resize:fill:64:64/1*dmbNkD5D-u45r44go_cf0g.png)

[**AI @ Sulat.com**](https://ai.sulat.com/?source=post_page---publication_nav-a7f41c27b282-2bf02eec032a---------------------------------------)

·

Follow publication

[![AI @ Sulat.com](https://miro.medium.com/v2/resize:fill:76:76/1*z43A15sUsEaW5bO0uIGe0A.png)](https://ai.sulat.com/?source=post_page---post_publication_sidebar-a7f41c27b282-2bf02eec032a---------------------------------------)

Deep technical research on AI meets eloquent, accessible writing for everyday people and the technically curious. Subscribe now.

Follow publication

Top highlight

# How the Creator of Claude Code Actually Uses It: 13 Practical Moves

## Use Claude Code the way it’s intended to be used (from Boris Cherny’s point of view)

[![JP Caparas](https://miro.medium.com/v2/resize:fill:64:64/1*C4Jv9qQ1xj3AzEXqPDtwOw.jpeg)](https://jp.sulat.com/?source=post_page---byline--2bf02eec032a---------------------------------------)

[JP Caparas](https://jp.sulat.com/?source=post_page---byline--2bf02eec032a---------------------------------------)

Follow

8 min read

·

Jan 3, 2026

370

3

[Listen](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2Fplans%3Fdimension%3Dpost_audio_button%26postId%3D2bf02eec032a&operation=register&redirect=https%3A%2F%2Fai.sulat.com%2Fhow-the-creator-of-claude-code-actually-uses-it-13-practical-moves-2bf02eec032a&source=---header_actions--2bf02eec032a---------------------post_audio_button------------------)

Share

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*mp9P6xNYxwMNlkLuZblAwQ.png)

Use Claude Code the way it’s intended to be used.

If you already use Claude Code, you’ve probably built your own habits. [In early January 2026, Claude Code’s creator, Boris Cherny, shared his day‑to‑day setup in a long thread](https://nitter.net/bcherny/status/2007179832300581177). He calls it “vanilla”, but it’s actually a disciplined set of small, repeatable moves that add up.

This write‑up distils those moves into a practical playbook you can copy, adapt, and scale inside your own workflow. The goal is not to imitate the exact setup, but to borrow the principles and apply them to your team, your repo, and your constraints.

## Who this is for

- You already use Claude Code and want to get more consistent results.
- You manage or influence a team workflow and want shared guardrails.
- You’re comfortable wiring simple automation (files, hooks, commands).

## The 13 moves (and why they work)

## 1) Run multiple Claudes in parallel — and label them

He runs five terminal sessions at once and numbers the tabs so they’re easy to track. He also relies on system notifications (e.g., iTerm2) so a session can run while he works elsewhere. The point is throughput: you keep momentum across independent tasks without waiting for one session to finish. The numbering sounds trivial, but it makes progress scanning fast when you bounce between tabs.

**Try it:** Start with two sessions, give each a purpose (e.g., “refactor” and “tests”), and keep them separate all the way to commit.

## 2) Mix local and web sessions on purpose

He keeps several browser sessions going alongside local ones — often 5–10 — and hands work off between them. He uses the web UI at `claude.ai/code`, kicks off sessions in Chrome, and even starts sessions on his phone for later. The idea is to use the best interface for the task: terminal when you need tools and git, web when you want a cleaner view or you’re mobile.

**Try it:** Keep one web session for “review and reasoning”, and a local session for “do the edits”.

## 3) Pick a model, then stick with it for coding

He uses a single model (Opus 4.5 with thinking) for almost everything. It may be slower per request, but the reduced back‑and‑forth often makes it faster end‑to‑end. The meta‑lesson: consistency matters more than raw speed.

**Try it:** Commit to one model for a week, measure how much re‑prompting you do, and only then decide if you should change.

## 4) Treat `CLAUDE.md` as living team memory

He maintains a shared `CLAUDE.md` in git and updates it every time Claude gets something wrong. Think of it as a “do not repeat” ledger plus a local style guide. The file is short, focused, and updated in PRs so it stays fresh. His team’s file is only a couple of thousand tokens and covers commands, code style, UI/content guidelines, state management, logging, error handling, debugging, and even the PR template.

Here’s a minimal, editable pattern:

```
# Bash commands
- pnpm test --filter <name>: run a focused test
- pnpm lint: run lint before pushing
​
# Code style
- Prefer early returns over nested ifs
- Use named exports
​
# Workflow
- Write tests first for non-trivial changes
- Update docs when behaviour changes
```

## 5) Start in Plan mode, then switch to auto‑accept edits

When the goal is a PR, he begins in Plan mode (Shift+Tab twice) and iterates on the plan before any code changes. Once the plan is solid, he switches to auto‑accept edits to move quickly. The plan is the safety rail; auto‑accept is the accelerator.

**Try it:** Treat “plan quality” as the real work. If the plan doesn’t feel crisp, keep pushing on it instead of coding.

## 6) Turn inner‑loop prompts into slash commands

Any prompt you repeat gets a slash command. This reduces friction for you and also lets Claude call the same workflow on its own. He keeps those command files in git so the team shares them, and uses inline bash to pre‑compute context (so the model doesn’t have to ask for it).

A lightweight example:

```
---
description: Prep a clean commit and push a PR
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git commit:*), Bash(git push:*)
---
​
# Context
- Status: !`git status -sb`
- Diff: !`git diff --stat`
​
# Task
Draft a commit message, commit, and push the current branch.
```

## 7) Promote recurring roles into subagents

He uses subagents for repeatable tasks like code simplification or end‑to‑end verification. This keeps the main thread focused and gives each subagent a clear mandate.

Minimal subagent template:

```
---
name: verify-app
description: Runs the app, checks key flows, reports issues.
tools: Bash, Read
model: inherit
---
​
Verify the app changes using the project’s standard commands.
Report failures with exact error output and reproduction steps.
```

## 8) Use hooks to make the last 10% deterministic

He uses a `PostToolUse` hook to format code, so formatting never becomes a late surprise. Hooks turn “do this most of the time” into “do this every time”, which is how you avoid CI noise.

Example hook config (simplified):

```
{
  "hooks": {
    "PostToolUse": [\
      {\
        "matcher": "Edit|Write",\
        "hooks": [\
          { "type": "command", "command": "npm run format" }\
        ]\
      }\
    ]
  }
}
```

## 9) Pre‑allow safe tools, don’t default to YOLO

He avoids skipping permissions by default. Instead, he pre‑allows the small set of tools he trusts for a repo via `/permissions` and shared settings (often in `.claude/settings.json`). That’s safer than a blanket skip, and faster than constant prompts.

**Try it:** Create a “safe allowlist” and review it monthly. Keep risky commands off by default.

## 10) Plug Claude into real systems via MCP

He connects Claude to tools like Slack, BigQuery, and Sentry using MCP, then shares the config in `.mcp.json`. This turns Claude from a code editor into a workflow hub.

**Try it:** Start with one system that removes a daily annoyance — logs, analytics, tickets — then expand.

## 11) For long‑running work, add a background verification step

For tasks that take a while, he sets Claude up to verify the work when it finishes. He uses background agents, Stop hooks, or plugins like `ralph‑wiggum` to do this. He’ll also run with relaxed permission modes in a sandbox so the session can run without blocking on prompts. This makes “run and wait” safer, especially when you’re stepping away.

**Try it:** Add a Stop hook that runs a smoke test and posts a short summary to the transcript.

## 12) Give Claude a verification loop (this is the multiplier)

His most important tip: give Claude a way to verify its own work. When it can check outputs — tests, CLI commands, browser behaviour — quality jumps dramatically. He even has Claude test UI changes in a real browser using the Claude Chrome extension.

## Get JP Caparas’s stories in your inbox

Join Medium for free to get updates from this writer.

Subscribe

Subscribe

Remember me for faster sign in

A simple verification ladder:

1. A single command (e.g., `pnpm test --filter ...`)
2. A small test suite
3. A UI check in a browser (manual or automated)
4. A “review pass” by a different subagent

## 13) Share team skills and conventions intentionally

He uses shared skills and settings where it makes sense, while still allowing personal tweaks. The key is to draw the line: what’s team‑critical (shared) vs personal preference (local). Claude Code supports multiple skills directories for exactly this separation.

**Try it:** Keep project skills in git, personal skills in your home directory, and name them clearly so Claude can pick the right one.

## A starter kit you can copy today

If you want a fast‑start, these four artefacts give you 80% of the value:

1. **A short**`CLAUDE.md` with commands, style, and workflow rules
2. **One slash command** for your most common loop
3. **One subagent** for verification or review
4. **One hook** that removes a consistent source of CI noise

## A one‑week adoption plan

This keeps the changes small and testable:

**Day 1:** Create a minimal `CLAUDE.md` and add two “do/don’t” rules

**Day 2:** Turn one repetitive prompt into a slash command

**Day 3:** Add a verification subagent and run it after every change **Day 4:** Add a formatting hook

**Day 5:** Audit permissions and tighten your allowlist

**Day 6:** Connect one MCP tool

**Day 7:** Review what saved time and remove what didn’t

## Common pitfalls to avoid

- **Over‑automation too early:** start with one command or one hook, not ten.
- **Skipping verification:** if you can’t verify, you’re gambling.
- **Messy parallelism:** label sessions and keep tasks independent.
- **Bloated memory files:** keep `CLAUDE.md` short, review it often.

## Essential reading

[**How to get 3x Claude rate limits for $30 a month** \\
\\
**How to get 3x Claude rate limits for $30 a month What I learned switching my Claude Code setup to a $30/month provider…**\\
\\
reading.sh](https://reading.sh/how-to-get-3x-claude-rate-limits-for-30-a-month-1d3fdb8658df?source=post_page-----2bf02eec032a---------------------------------------)

[**The Claude Code team just revealed their setup, pay attention** \\
\\
**Boris' workflow is excellent. His colleagues do it differently. Git worktrees, two-Claude review, voice dictation, and…**\\
\\
reading.sh](https://reading.sh/the-claude-code-team-just-revealed-their-setup-pay-attention-4e5d90208813?source=post_page-----2bf02eec032a---------------------------------------)

[**Claude Code is turning non-programmers into builders. Here's how to start.** \\
\\
**Claude Code is turning non-programmers into builders. Here's how to start. From an 8-year-old making games to a Google…**\\
\\
jpcaparas.medium.com](https://jpcaparas.medium.com/claude-code-is-turning-non-programmers-into-builders-heres-how-to-start-6a70d06cdcfd?source=post_page-----2bf02eec032a---------------------------------------)

[**What Great CLAUDE.md Files Have in Common** \\
\\
**Real examples from real builders, templates you can copy-paste, and a checklist you can bookmark**\\
\\
blog.devgenius.io](https://blog.devgenius.io/what-great-claude-md-files-have-in-common-db482172ad2c?source=post_page-----2bf02eec032a---------------------------------------)

[**The Definitive Guide to Claude Code: From First Install to Production Workflows** \\
\\
**The Definitive Guide to Claude Code: From First Install to Production Workflows A plain language guide for experienced…**\\
\\
jpcaparas.medium.com](https://jpcaparas.medium.com/the-definitive-guide-to-claude-code-from-first-install-to-production-workflows-6d37a6d33e40?source=post_page-----2bf02eec032a---------------------------------------)

[**Ralph Wiggum, explained: the Claude Code loop that keeps going**\\
\\
**(chuckles) I'm inside Claude Code.**\\
\\
blog.devgenius.io](https://blog.devgenius.io/ralph-wiggum-explained-the-claude-code-loop-that-keeps-going-3250dcc30809?source=post_page-----2bf02eec032a---------------------------------------)

[**List: Claude & Claude Code \| Curated by JP Caparas \| Medium** \\
\\
**Claude & Claude Code · Accessible beginner to advanced resources to help you get started with Claude & Claude Code · 94…**\\
\\
jpcaparas.medium.com](https://jpcaparas.medium.com/list/claude-claude-code-5d36c9340fb6?source=post_page-----2bf02eec032a---------------------------------------)

## References

- Boris Cherny, “Claude Code setup thread” (Nitter mirror) — [https://nitter.net/bcherny/status/2007179832300581177](https://nitter.net/bcherny/status/2007179832300581177) Primary source for the 13‑step workflow and follow‑up answers.
- Claude Code Docs: Terminal notifications — [https://code.claude.com/docs/en/terminal-config#iterm-2-system-notifications](https://code.claude.com/docs/en/terminal-config#iterm-2-system-notifications) Details on system notifications mentioned in the setup.
- Claude Code Docs: Slash commands — [https://code.claude.com/docs/en/slash-commands](https://code.claude.com/docs/en/slash-commands) How custom commands work and where to store them.
- Claude Code Docs: Subagents — [https://code.claude.com/docs/en/sub-agents](https://code.claude.com/docs/en/sub-agents) Subagent configuration and best practices.
- Claude Code Docs: Hooks guide — [https://code.claude.com/docs/en/hooks-guide](https://code.claude.com/docs/en/hooks-guide) Event‑driven hooks for formatting, checks, and notifications.
- Claude Code Docs: Skills — [https://code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) Sharing and organising team skills.
- Claude Code Docs: Chrome extension — [https://code.claude.com/docs/en/chrome](https://code.claude.com/docs/en/chrome) For browser‑based verification loops.
- Anthropic Engineering: “Claude Code: Best practices for agentic coding” — [https://www.anthropic.com/engineering/claude-code-best-practices](https://www.anthropic.com/engineering/claude-code-best-practices) Broader context and workflow patterns.
- Anthropics plugins (ralph‑wiggum) — [https://github.com/anthropics/claude-plugins-official/tree/main/plugins/ralph-wiggum](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/ralph-wiggum) Example plugin used for long‑running verification.

## You can do more with this article

Signed into Medium? Here’s how to get more from this piece:

- **Highlight passages** that explain Claude Code you want to reference later
- **Add it to a reading list:** keep it with your AI and developer tools resources
- **Leave a response** below: I’d love to hear how you’re thinking about best practices and “hacks” in your own work
- **Follow me:** if AI, agentic coding, and productivity are topics you care about
- **Share with your team:** especially if you’re looking to maximise productivity and efficiency within the crew

Not on Medium yet? [Create a free account](https://medium.com/m/signin) to unlock these features and build your personal reading library.

[Claude Code](https://medium.com/tag/claude-code?source=post_page-----2bf02eec032a---------------------------------------)

[Vibe Coding](https://medium.com/tag/vibe-coding?source=post_page-----2bf02eec032a---------------------------------------)

[Agentic Ai](https://medium.com/tag/agentic-ai?source=post_page-----2bf02eec032a---------------------------------------)

[Frontier Tech](https://medium.com/tag/frontier-tech?source=post_page-----2bf02eec032a---------------------------------------)

[Terminal](https://medium.com/tag/terminal?source=post_page-----2bf02eec032a---------------------------------------)

370

370

3

[![AI @ Sulat.com](https://miro.medium.com/v2/resize:fill:96:96/1*z43A15sUsEaW5bO0uIGe0A.png)](https://ai.sulat.com/?source=post_page---post_publication_info--2bf02eec032a---------------------------------------)

[![AI @ Sulat.com](https://miro.medium.com/v2/resize:fill:128:128/1*z43A15sUsEaW5bO0uIGe0A.png)](https://ai.sulat.com/?source=post_page---post_publication_info--2bf02eec032a---------------------------------------)

Follow

[**Published in AI @ Sulat.com**](https://ai.sulat.com/?source=post_page---post_publication_info--2bf02eec032a---------------------------------------)

[184 followers](https://ai.sulat.com/followers?source=post_page---post_publication_info--2bf02eec032a---------------------------------------)

· [Last published May 7, 2026](https://ai.sulat.com/how-to-connect-codex-to-fastmail-mcp-3488e8cb2bb7?source=post_page---post_publication_info--2bf02eec032a---------------------------------------)

Deep technical research on AI meets eloquent, accessible writing for everyday people and the technically curious. Subscribe now.

Follow

[![JP Caparas](https://miro.medium.com/v2/resize:fill:96:96/1*C4Jv9qQ1xj3AzEXqPDtwOw.jpeg)](https://jp.sulat.com/?source=post_page---post_author_info--2bf02eec032a---------------------------------------)

[![JP Caparas](https://miro.medium.com/v2/resize:fill:128:128/1*C4Jv9qQ1xj3AzEXqPDtwOw.jpeg)](https://jp.sulat.com/?source=post_page---post_author_info--2bf02eec032a---------------------------------------)

Follow

[**Written by JP Caparas**](https://jp.sulat.com/?source=post_page---post_author_info--2bf02eec032a---------------------------------------)

[2.2K followers](https://jp.sulat.com/followers?source=post_page---post_author_info--2bf02eec032a---------------------------------------)

· [109 following](https://medium.com/@jpcaparas/following?source=post_page---post_author_info--2bf02eec032a---------------------------------------)

Codex Ambassador @ OpenAI. I write technical explainers with a hint of humour and a dash of cynicism. Subscribe now for daily updates.

Follow

[Help](https://help.medium.com/hc/en-us?source=post_page-----2bf02eec032a---------------------------------------)

[Status](https://status.medium.com/?source=post_page-----2bf02eec032a---------------------------------------)

[About](https://medium.com/about?autoplay=1&source=post_page-----2bf02eec032a---------------------------------------)

[Careers](https://medium.com/jobs-at-medium/work-at-medium-959d1a85284e?source=post_page-----2bf02eec032a---------------------------------------)

[Press](mailto:pressinquiries@medium.com)

[Blog](https://blog.medium.com/?source=post_page-----2bf02eec032a---------------------------------------)

[Store](https://medium.com/store)

[Privacy](https://policy.medium.com/medium-privacy-policy-f03bf92035c9?source=post_page-----2bf02eec032a---------------------------------------)

[Rules](https://policy.medium.com/medium-rules-30e5502c4eb4?source=post_page-----2bf02eec032a---------------------------------------)

[Terms](https://policy.medium.com/medium-terms-of-service-9db0094a1e0f?source=post_page-----2bf02eec032a---------------------------------------)

[Text to speech](https://speechify.com/medium?source=post_page-----2bf02eec032a---------------------------------------)

reCAPTCHA

Recaptcha requires verification.

protected by **reCAPTCHA**