[![Push To Prod](https://substackcdn.com/image/fetch/$s_!-l5-!,w_40,h_40,c_fill,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F89a13663-f57e-455d-89f3-7d63667b36d9_256x256.png)](https://getpushtoprod.substack.com/)

# [Push To Prod](https://getpushtoprod.substack.com/)

SubscribeSign in

![User's avatar](https://substackcdn.com/image/fetch/$s_!TZHr!,w_64,h_64,c_fill,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F694c6280-9dff-48ef-88ae-b74037c443b6_800x800.jpeg)

Discover more from Push To Prod

John is staff engineers from Meta. Every week, they share practical AI workflows, tools, and engineering insights. no hype, just what actually works in production.

Over 5,000 subscribers

Subscribe

By subscribing, you agree Substack's [Terms of Use](https://substack.com/tos), and acknowledge its [Information Collection Notice](https://substack.com/ccpa#personal-data-collected) and [Privacy Policy](https://substack.com/privacy).

Already have an account? Sign in

# How the Creator of Claude Code Actually Uses Claude Code

### 13 tips from Boris Cherny

[![John Kim's avatar](https://substackcdn.com/image/fetch/$s_!TZHr!,w_36,h_36,c_fill,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F694c6280-9dff-48ef-88ae-b74037c443b6_800x800.jpeg)](https://substack.com/@realjohnkim)

[John Kim](https://substack.com/@realjohnkim)

Feb 21, 2026

49

7

2

Share

[![](https://substackcdn.com/image/fetch/$s_!KGef!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fe60bdcfa-5168-423e-908d-cb1fd76ebc0b.heic)](https://substackcdn.com/image/fetch/$s_!KGef!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fe60bdcfa-5168-423e-908d-cb1fd76ebc0b.heic)

Back in January, Boris Cherny, the creator of Claude Code, posted a thread breaking down his entire workflow. I had a chance to meet with him and ask questions, and I found his setup genuinely enlightening. I’ve been replicating a lot of it into my own workflow since.

His setup is surprisingly vanilla. Claude Code works great out of the box, and Boris doesn’t customize it much. But the way he orchestrates everything around it is where the real leverage comes from.

Below I wrote out my thoughts on his full posts and also made a video if you prefer to watch it.

Here are 13 tips from Boris

His Claude Code Workflow Is Insane - YouTube

Tap to unmute

[His Claude Code Workflow Is Insane](https://www.youtube.com/watch?v=WpQZlKiy3zo) [John Kim](https://www.youtube-nocookie.com/channel/UCiZotp9tZ4uXgXEjHDUYzBQ)

John Kim30.9K subscribers

[Watch on](https://www.youtube.com/watch?v=WpQZlKiy3zo)

Subscribe

* * *

## 1\. Run 5 Claudes in Parallel

[![Boris running 5 Claude instances in parallel terminal tabs](https://substackcdn.com/image/fetch/$s_!Hyzp!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fa09a16d0-2253-4f9b-bb0d-36f8020a79d5_1926x1374.png)](https://substackcdn.com/image/fetch/$s_!Hyzp!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fa09a16d0-2253-4f9b-bb0d-36f8020a79d5_1926x1374.png)

Boris runs five Claude Code instances in his terminal simultaneously. He numbers his tabs 1 through 5 and uses system notifications to know when a Claude needs input.

I work very similarly. I use iTerm hotkeys (Cmd+1, Cmd+2, etc) to switch between instances and Cmd+left/right bracket to switch tabs within each. One additional thing I do is rename each tab to the project I’m working on, like “push-to-prod” or “anime-pomodoro.” It keeps the mental context clear when you’re bouncing between sessions.

* * *

## 2\. Run 5-10 Web Claudes Too

[![Boris running web Claude sessions on claude.ai/code](https://substackcdn.com/image/fetch/$s_!ZqJX!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fd3b3ab4b-0fee-4680-a5af-1d8d3a899a47_1912x1652.png)](https://substackcdn.com/image/fetch/$s_!ZqJX!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fd3b3ab4b-0fee-4680-a5af-1d8d3a899a47_1912x1652.png)

Boris also runs 5 to 10 sessions on claude.ai/code in parallel with his local instances. He hands off local sessions to web, manually kicks off sessions in Chrome, and teleports back and forth between them. He even starts sessions from his phone using the Claude iOS app every morning.

The teleport feature was new to me. You can push a local session to the web and pick it up from any device. The phone sync is particularly interesting. I can see myself kicking off sessions before bed and checking results in the morning.

* * *

## 3\. Opus with Thinking, Always

[![Boris on using Opus with thinking for everything](https://substackcdn.com/image/fetch/$s_!fE4K!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F4ff01d11-cfde-49bb-9346-9a2e929bf64a_1912x486.png)](https://substackcdn.com/image/fetch/$s_!fE4K!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F4ff01d11-cfde-49bb-9346-9a2e929bf64a_1912x486.png)

Boris uses Opus with thinking for everything. Even though it’s bigger and slower than Sonnet, he says you have to steer it less and it’s better at tool use, so it’s almost always faster in the end.

I also default to Opus. You can switch models mid-session with `/model`. And if you have multiple sessions running in parallel, the slower speed per session doesn’t really matter. You’re not sitting there waiting. You’re orchestrating.

* * *

## 4\. Share Your CLAUDE.md

[![Boris's team sharing a single CLAUDE.md checked into Git](https://substackcdn.com/image/fetch/$s_!QTzQ!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Ff376ae0d-63f3-4919-a5e9-f1a0cb2e5ffd_1898x1632.png)](https://substackcdn.com/image/fetch/$s_!QTzQ!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Ff376ae0d-63f3-4919-a5e9-f1a0cb2e5ffd_1898x1632.png)

The Claude Code team shares a single CLAUDE.md for their entire repo. They check it into Git and the whole team contributes multiple times a week. Anytime Claude does something incorrectly, they add it to the CLAUDE.md so it knows not to do it next time.

I asked Boris what his personal CLAUDE.md looks like. He said it’s basically two lines pointing to the team’s shared one. The whole idea is compound engineering: building institutional knowledge directly into the codebase so every Claude session gets smarter. I do this too. My Pomodoro app has a CLAUDE.md with iOS navigation flows, design patterns, and project-specific conventions. You can bootstrap one with `/init`.

* * *

## 5\. Add Claude in Code Reviews

[![Boris tagging @claude on PRs to update CLAUDE.md](https://substackcdn.com/image/fetch/$s_!uSg_!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fe3798e35-1ce9-434f-9f7f-c3145a6a5979_1912x1584.png)](https://substackcdn.com/image/fetch/$s_!uSg_!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fe3798e35-1ce9-434f-9f7f-c3145a6a5979_1912x1584.png)

During code review, Boris tags @claude on his coworkers’ PRs and adds something to CLAUDE.md as part of the PR. They use the Claude Code GitHub Action for this. It’s their version of Dan Shipper’s Compounding Engineering.

This is powerful. When Boris spots an anti-pattern in a PR, he doesn’t just leave a comment. He tells Claude to update the CLAUDE.md so the pattern is caught automatically next time. The feedback loop is: human spots issue, Claude updates the rules, future Claude sessions avoid the issue entirely.

* * *

## 6\. Plan Mode First

[![Boris using Plan mode before writing code](https://substackcdn.com/image/fetch/$s_!HDIs!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F80283652-0e9a-4eb5-8127-945b5ef3b7e4_1914x930.png)](https://substackcdn.com/image/fetch/$s_!HDIs!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F80283652-0e9a-4eb5-8127-945b5ef3b7e4_1914x930.png)

Most of Boris’s sessions start in Plan mode (Shift+Tab twice). If his goal is to write a Pull Request, he uses Plan mode to go back and forth with Claude until he likes the plan. Then he switches to auto-accept edits mode and Claude can usually one-shot it.

I use Plan mode constantly, not just for PRs. I use it for deep dives into different parts of a codebase, investigating bugs, exploring performance optimization options. Plan mode is essentially a way to build really good prompts. You’re doing the orchestration to bring all the context Claude needs into a single session so it can execute correctly.

* * *

## 7\. Slash Commands for Everything

[![Boris using slash commands for every inner-loop workflow](https://substackcdn.com/image/fetch/$s_!c3lP!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F229faf3e-2bb3-4b80-a97f-ea9e7b17b1d0_1916x1118.png)](https://substackcdn.com/image/fetch/$s_!c3lP!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F229faf3e-2bb3-4b80-a97f-ea9e7b17b1d0_1916x1118.png)

Boris uses slash commands for every inner-loop workflow he does many times a day. This saves repeated prompting and means Claude can use these workflows too. Commands are checked into Git and live in `.claude/commands/`.

For example, he uses a `/commit-push-pr` command every day. The command uses inline bash to precompute Git status so it runs quickly. Creating these is easy. Just ask Claude Code to make one for you. Describe what you want and it’ll create the skill file. Slash commands, skills, subagents, MCPs. Let Claude Code set them all up.

* * *

## 8\. Custom Subagents

[![Boris's custom subagents for code simplification and verification](https://substackcdn.com/image/fetch/$s_!SCKJ!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fe8cfb726-5ae7-4791-8290-1b2ba3c54ea3_1910x1554.png)](https://substackcdn.com/image/fetch/$s_!SCKJ!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fe8cfb726-5ae7-4791-8290-1b2ba3c54ea3_1910x1554.png)

Boris uses a few subagents regularly. Code Simplifier simplifies code after Claude is done working. Verify App has detailed instructions for testing Claude Code end to end.

Subagents are really about protecting context. They’re useful when you want side effects or when you just want the result of a Claude instance running without caring how it got there. The new Agent Teams feature (with Opus 4.6) takes this further, with subagents that have different roles and share context through a master orchestrator.

* * *

## 9\. Post Tool Use Hooks

[![Boris using post tool use hooks for code formatting](https://substackcdn.com/image/fetch/$s_!qkeT!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F8addbae6-a9db-4d1d-b582-b2783100e823_1910x1100.png)](https://substackcdn.com/image/fetch/$s_!qkeT!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F8addbae6-a9db-4d1d-b582-b2783100e823_1910x1100.png)

The Claude Code team uses a post tool use hook to format code after Claude edits it. Claude usually generates well-formatted code out of the box, and the hook handles the last 10% to avoid formatting errors in CI later.

These are similar to pre-commit hooks. Nothing revolutionary, but it’s another example of automating the tedious stuff so you never think about it.

* * *

## 10\. /permissions, Not --dangerously-skip

[![Boris using /permissions instead of dangerously-skip](https://substackcdn.com/image/fetch/$s_!bcfs!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F38ada46c-b7b4-47f3-986a-9f7520152e4b_1912x1576.png)](https://substackcdn.com/image/fetch/$s_!bcfs!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F38ada46c-b7b4-47f3-986a-9f7520152e4b_1912x1576.png)

Boris doesn’t use `--dangerously-skip-permissions`. Instead, he uses `/permissions` to pre-allow common bash commands that he knows are safe in his environment. These are checked into `.claude/settings.json` and shared with the team.

This is compound engineering again. You put these settings into the codebase and share them with the team. Everyone agrees on the safe defaults. The team needs to be AI-native first, and that means agreeing on these patterns together.

* * *

## 11\. MCP for All Tools

[![Boris using MCP servers for Slack, BigQuery, and Sentry](https://substackcdn.com/image/fetch/$s_!QxAb!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fd8e9b311-7cbe-4b3b-aa75-5ae6575c5821_1916x1026.png)](https://substackcdn.com/image/fetch/$s_!QxAb!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fd8e9b311-7cbe-4b3b-aa75-5ae6575c5821_1916x1026.png)

Claude Code uses all of Boris’s tools for him. It searches and posts to Slack via MCP, runs BigQuery queries for analytics, grabs error logs from Sentry. MCP configurations are checked into Git and shared with teams.

Be careful with MCPs though. They can blow up your context window. Only use them for specific things that are outside normal coding, like Slack, analytics, and error logs. Also watch out for prompt injection. Always have Claude Code review an MCP before you install it.

* * *

## 12\. Long Running Tasks

[![Boris on managing long running Claude tasks](https://substackcdn.com/image/fetch/$s_!3w7-!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F001f4e02-2ab2-426e-ab57-6211142f1b8b_1912x968.png)](https://substackcdn.com/image/fetch/$s_!3w7-!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F001f4e02-2ab2-426e-ab57-6211142f1b8b_1912x968.png)

For very long running tasks, Boris either prompts Claude to verify its work with a background agent when it’s done, uses an agent-stop hook for deterministic verification, or uses the Ralph Wiggin plugin for autonomous looping.

I’m less bullish on fully autonomous loops. The hype has died down a bit. You need a near-perfect spec for it to work well, and that’s a lot of upfront work. But for side projects where you don’t care as much, it’s fine to spec it out and let it run overnight.

* * *

## 13\. Give Claude a Way to Verify Its Work

[![Boris on giving Claude verification feedback loops](https://substackcdn.com/image/fetch/$s_!C95h!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F9f2b775c-db7c-49e4-8d92-549ed29846a2_1912x1564.png)](https://substackcdn.com/image/fetch/$s_!C95h!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F9f2b775c-db7c-49e4-8d92-549ed29846a2_1912x1564.png)

This is probably the most important tip. Give Claude a way to verify its own work. If Claude has that feedback loop, it will 2-3x the quality of final results.

Boris’s team tests every change using the Chrome extension. Claude opens the browser, tests the UI, and iterates until it works. It’s a different form of end-to-end testing. You don’t write the test. Claude just knows how to navigate and validate.

* * *

## The Bigger Picture

Think about what your workflow looked like six months ago compared to this. We were still manually coding. Now we’re running multiple Claude instances at all times, playing StarCraft with our codebase, filing PRs from one session while debugging in another while kicking off a review in a third.

The mental context switching is probably the bottleneck at this point, not the coding. Challenge yourself to try some of these patterns this week. Even adopting two or three of them will fundamentally change how you work.

* * *

#### Subscribe to Push To Prod

Launched 6 months ago

John is staff engineers from Meta. Every week, they share practical AI workflows, tools, and engineering insights. no hype, just what actually works in production.

Subscribe

By subscribing, you agree Substack's [Terms of Use](https://substack.com/tos), and acknowledge its [Information Collection Notice](https://substack.com/ccpa#personal-data-collected) and [Privacy Policy](https://substack.com/privacy).

[![Ravindranath Iruvuri's avatar](https://substackcdn.com/image/fetch/$s_!doBR!,w_32,h_32,c_fill,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fb8d77a71-d133-40c5-b77f-9401e48529e2_1746x1746.jpeg)](https://substack.com/profile/84750699-ravindranath-iruvuri)[![Taylor Dolezal's avatar](https://substackcdn.com/image/fetch/$s_!4Ebm!,w_32,h_32,c_fill,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F9c2427bb-1ac8-4237-9e59-5c58b580fa6a_1333x2000.jpeg)](https://substack.com/profile/132472347-taylor-dolezal)[![Victor Guerra's avatar](https://substackcdn.com/image/fetch/$s_!Kuxb!,w_32,h_32,c_fill,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fbbfe1c28-770f-461c-95fb-71b6e1885da9_144x144.png)](https://substack.com/profile/2476051-victor-guerra)[![Haripriya Naidu's avatar](https://substackcdn.com/image/fetch/$s_!yPPO!,w_32,h_32,c_fill,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fecec9c95-94dc-4c8e-af72-b0151f30ae48_1170x1170.jpeg)](https://substack.com/profile/53127360-haripriya-naidu)[![Dele's avatar](https://substackcdn.com/image/fetch/$s_!wrbI!,w_32,h_32,c_fill,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Feb503fcd-5d6a-42bd-8a93-fdba6acffc53_144x144.png)](https://substack.com/profile/6834785-dele)

49 Likes∙

[2 Restacks](https://substack.com/note/p-188744185/restacks?utm_source=substack&utm_content=facepile-restacks)

49

7

2

Share

#### Discussion about this post

CommentsRestacks

![User's avatar](https://substackcdn.com/image/fetch/$s_!TnFC!,w_32,h_32,c_fill,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack.com%2Fimg%2Favatars%2Fdefault-light.png)

[![Harsh Bhardwaj | AI & Startups's avatar](https://substackcdn.com/image/fetch/$s_!Yo5K!,w_32,h_32,c_fill,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F0d777f5f-6113-4368-ac13-7b7cd4ea01e1_731x731.jpeg)](https://substack.com/profile/386289022-harsh-bhardwaj-ai-and-startups?utm_source=comment)

[Harsh Bhardwaj \| AI & Startups](https://substack.com/profile/386289022-harsh-bhardwaj-ai-and-startups?utm_source=substack-feed-item)

[Mar 17](https://getpushtoprod.substack.com/p/how-the-creator-of-claude-code-actually/comment/229293408 "Mar 17, 2026, 3:55 PM")

Boris's workflow is gold — especially the post-tool-use hook for formatting. Been using Claude Code in terminal for weeks now, and adding 'respect existing style' changed everything. How do you handle large codebases without token limits biting? Loving this series!

Like

Reply

Share

[![JP's avatar](https://substackcdn.com/image/fetch/$s_!kp97!,w_32,h_32,c_fill,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F83e3e9a7-050c-4966-9734-06564009caf8_256x256.jpeg)](https://substack.com/profile/30421304-jp?utm_source=comment)

[JP](https://substack.com/profile/30421304-jp?utm_source=substack-feed-item)

[Mar 12](https://getpushtoprod.substack.com/p/how-the-creator-of-claude-code-actually/comment/226623169 "Mar 12, 2026, 2:32 AM")

The vanilla approach is interesting. Boris keeping it simple tracks with what I've found too. The one area where I've gone heavier on config is hooks. Once you set up a SessionStart hook to validate deps and a Stop hook to run the test suite, you stop having to think about whether the agent remembered to do it.

Claude Code's hook system is powerful but Codex CLI just shipped its own version with a much simpler config format. Two events, one JSON file. I did a comparison across both plus Cursor here [https://reading.sh/codex-cli-has-hooks-now-stop-stuffing-agents-md-c181465fe271](https://reading.sh/codex-cli-has-hooks-now-stop-stuffing-agents-md-c181465fe271) if you're curious how they stack up.

Boris's point about permissions is solid though. The /permissions approach is way better than dangerously-skip-permissions for shared team configs.

Like

Reply

Share

[5 more comments...](https://getpushtoprod.substack.com/p/how-the-creator-of-claude-code-actually/comments)

TopLatestDiscussions

[The Right Way to Learn AI Coding in 2026](https://getpushtoprod.substack.com/p/the-right-way-to-learn-ai-coding)

[“Vibe coding is ruining a generation of developers.”](https://getpushtoprod.substack.com/p/the-right-way-to-learn-ai-coding)

Dec 11, 2025•[John Kim](https://substack.com/@realjohnkim)

1,015

42

138

![](https://substackcdn.com/image/fetch/$s_!-LTU!,w_320,h_213,c_fill,f_auto,q_auto:good,fl_progressive:steep,g_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F7de60063-51da-4b25-89c8-2473bc6314f1_1376x768.jpeg)

[Why Can’t I Enjoy Anything Anymore](https://getpushtoprod.substack.com/p/why-cant-i-enjoy-anything-anymore)

[is there something wrong with me?](https://getpushtoprod.substack.com/p/why-cant-i-enjoy-anything-anymore)

Feb 1•[John Kim](https://substack.com/@realjohnkim)

727

90

80

![](https://substackcdn.com/image/fetch/$s_!gDOd!,w_320,h_213,c_fill,f_auto,q_auto:good,fl_progressive:steep,g_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F530de193-bcf7-436f-9b93-ea5fa82783af_1376x768.png)

[How to Progress Faster Than Anyone Else In Your Career](https://getpushtoprod.substack.com/p/how-to-progress-faster-than-anyone)

[velocity in your career can be engineered](https://getpushtoprod.substack.com/p/how-to-progress-faster-than-anyone)

Dec 24, 2025•[John Kim](https://substack.com/@realjohnkim)

601

20

56

![](https://substackcdn.com/image/fetch/$s_!q7Zl!,w_320,h_213,c_fill,f_auto,q_auto:good,fl_progressive:steep,g_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F02557ca7-6a15-4bf1-90ac-f6baff2e8465_1376x768.jpeg)

See all

### Ready for more?

Subscribe

© 2026 John Kim · [Privacy](https://substack.com/privacy) ∙ [Terms](https://substack.com/tos) ∙ [Collection notice](https://substack.com/ccpa#personal-data-collected)

[Start your Substack](https://substack.com/signup?utm_source=substack&utm_medium=web&utm_content=footer) [Get the app](https://substack.com/app/app-store-redirect?utm_campaign=app-marketing&utm_content=web-footer-button)

[Substack](https://substack.com/) is the home for great culture