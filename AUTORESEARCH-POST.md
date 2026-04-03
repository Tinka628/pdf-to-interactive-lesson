# Autoresearch: How We Used Claude Code to Systematically Improve a Product Over Two Weeks

We spent two weeks improving a PDF-to-interactive-lesson app using Claude Code as both the implementer and the researcher. The approach was simple: measure something, diagnose the problem, fix it, re-measure. Repeat across every dimension of the product. No planning docs, no sprint boards — just a tight loop of conversation, benchmarking, and shipping.

This post documents the actual methodology, the prompts we used, and the key inflection points. It's written for people who want to do the same thing on their own codebase.

## What is "autoresearch"?

We're using this term loosely. The idea is: instead of manually investigating what's wrong with your product, you use an AI coding agent to both **research the problem** and **implement the fix**, in a continuous loop. The human's job is to steer — to ask the right diagnostic questions and decide what to measure next. The agent does the legwork.

The loop looks like this:

```
Human: "Build me a benchmark for X"
Agent: [writes benchmark script, runs it, returns baseline]
Human: "What's actually failing?"
Agent: [analyzes failures, identifies root cause]
Human: "Fix it"
Agent: [implements fix]
Human: "Run the benchmark again"
Agent: [re-runs, reports delta]
Human: "Ship it. Now let's look at Y."
```

Each cycle took 1-2 hours. Over two weeks, we ran this loop across five separate dimensions of the product. Here's the chronological story.

---

## The Starting Point

The app takes a PDF, OCRs it, and uses an LLM to generate interactive lessons with questions, answers, and explanations. It worked — lessons rendered, users could take quizzes. But we had zero data on how well it actually worked.

We didn't know:
- Whether the OCR was actually extracting text correctly
- Whether the generated answers were factually correct
- Whether the content was grounded in the source PDF or hallucinated
- Whether the LLM was generating duplicate questions across modules
- How fast or slow the pipeline actually was

We started with a single open-ended prompt.

## Week 1: Infrastructure and Architecture

### Day 1-2: OCR Pipeline Discovery (March 18)

**The prompt that started it all:**

> "Can you do a deep dive into how we would make this product more robust? Or to make it simpler — less code, same speed and quality for the output of courses."

Claude Code explored the codebase and came back with a diagnosis we didn't expect. The pipeline was making up to 68 LLM calls per PDF — 10 for OCR alone (one vision-model call per page). The immediate question was: is this working?

**The follow-up that mattered:**

> "How do you know we wouldn't get regressions from these changes?"

Claude Code was honest: "I don't. There are no tests. There's no data on how often content validation actually catches real problems."

This led to the key decision: **benchmark first, change second.**

> "I think we benchmark/baseline. Get a baseline of what happens if we test 2-3 PDFs on current state. Then we can use that against swapping out the OCR library."

Claude Code built a baseline benchmark script, ran it against 3 test PDFs, and the results were a wake-up call:

| PDF | Time | First-pass Rate | Fix Attempts |
|-----|------|-----------------|--------------|
| together-embeddings (8p) | 74s | 22% | 8 |
| attention-is-all-you-need (15p) | 132s | 92% | 1 |
| claude-code-best-practices (24p) | 93s | 44% | — |

22% first-pass rate on a simple 8-page blog post. Something was very wrong.

**The diagnostic prompt:**

> "Explain this a bit more — Improve the generator (prompt quality / content truncation) — 52.8% first-pass is low"

Claude Code dug into the logs and found the root cause: **the OCR was completely broken.** Every single page across two PDFs returned: *"I don't see a document image attached to your request."* The vision model wasn't receiving valid images. The canvas polyfill was broken, producing corrupt images, and the pipeline was silently treating the refusal message as "content." The course generator then generated lessons about topics that had zero relation to the source PDF — and the validator caught them, leading to the low first-pass rate.

The key numbers:

| OCR Method | Avg Time | Chars/page | Failed Pages | Cost |
|------------|----------|-----------|-------------|------|
| Vision model (current) | 31.4s | 204 | **47/47** | API tokens |
| PyMuPDF direct | 330ms | 1,776 | 0 | Free |
| mupdf WASM | 79ms | 1,798 | 0 | Free |

100% OCR failure rate. The app was generating courses from refusal messages.

**The simplification prompt:**

> "All the OCR stuff for TS is just dead code? And PyMuPDF in the Flask app is amazing? So you're suggesting to kill all the TS OCR stuff?"

We replaced the entire vision-model OCR pipeline with `mupdf` (MuPDF's official WASM build) — same engine as PyMuPDF, but runs directly in Node.js on Vercel. No Python API, no Railway deployment, no vision model API calls. A smoke test on Vercel preview confirmed it worked.

**Commit: `250e117` — "Replace broken vision-model OCR pipeline with mupdf WASM"**

This eliminated an entire service dependency and fixed the foundation that everything else built on.

### Day 3-6: Architecture Simplification (March 24-25)

With working OCR, we turned to the generation pipeline itself. The original approach used XML output with a bespoke parser:

> "How would you simplify this app by keeping the quality of the gen course and same speed it generates?"

Claude Code identified the highest-impact change: replace XML generation with JSON + Zod structured output. The XML pipeline had:
- XML generation prompts → `extractXml()` → `createXMLParser()` → `postProcessLesson()`
- A 671-line structure validator
- A 369-line fix-lesson retry system
- Custom flattening logic for choices, answer type conversion, etc.

The JSON + Zod replacement was dramatically simpler — the Zod schema defines the shape, the LLM outputs JSON, and validation errors feed back into retries automatically.

| Metric | Before (XML) | After (JSON + Zod) |
|--------|-------------|-------------------|
| Generation speed | 67.5s/course | 23.5s/course |
| First-pass rate | 57% | 100% |
| Lines of code | 2,204 | 940 |

**Commit: `8be0913` — "Replace XML generation pipeline with JSON + Zod structured output"**

A 57% reduction in code, 2.9x faster, and 100% structural validity on first pass. The retry loop (which now feeds Zod validation errors back to the model) was so effective that lessons almost never needed fixing.

### Parallel: UI and UX (March 24-25)

While architecture work was happening, separate sessions tackled user-facing issues:

- Progress tracking was rewritten to fix multiple navigation bugs (`0c8ece1`)
- A credit system was added: 3 free courses + 50 free grading calls (`7d46e95`)
- "How it works" section, favicon, social links, module selector polish — all shipped in small PRs

Each of these followed the same pattern: identify the problem, fix it, ship it, move on. No big refactors. Small, isolated PRs.

---

## Week 2: Quality Benchmarking

With a solid foundation (working OCR, clean architecture, functional UI), we shifted to output quality. This is where the autoresearch loop ran the tightest.

### Dimension 1: Duplicate Questions (March 25)

**The prompt:**

> "Let's create another worktree and work on this problem. We want to bench current understanding of how many duplicated questions are in the modules. Get a current baseline."

Claude Code built a deduplication benchmark, ran it across 5 PDFs at 5 iterations, and found a 20.5% duplication rate. When generating 3 modules with 3-4 lessons each, the model frequently repeated the same questions across modules.

**The fix:** Switch from parallel to sequential lesson generation. Each module now receives the list of all previously asked questions in the course, with explicit instructions not to repeat them.

**Result:** 20.5% → 0% duplication. Stayed at 0% across all subsequent runs.

**Commit: `32e5322` — "Eliminate duplicate questions across course modules"**

### Dimension 2: Answer Correctness (March 25-26)

**The prompt:**

> "What we need to baseline right now is if the model created the correct answer. I want you to come back with a baseline on what answers the result got wrong."

Claude Code wrote an answer-correctness benchmark using an LLM judge (initially DeepSeek-V3.1) that checks each question/answer pair against the source content.

**First result: 70% accuracy.**

Before touching anything, we questioned the measurement:

> "A lot of these look like judge failures, not real errors."

Claude Code analyzed the failures and confirmed — the judge itself was producing unparseable JSON responses, marking correct answers as wrong.

**Fix 1:** Switch judge to Claude Opus 4.6. Accuracy jumped to 92%.

> "Use Opus for judge. And yes, run all benchmarks to see where we stand."

**Fix 2:** Analyze remaining failures by question type. Short-answer was weakest at 83% — the model was asking about exact URLs and code snippets with OCR artifacts. Added constraints to the generation prompt: *"Do NOT ask about exact URLs, code snippets, or strings that may have formatting issues."*

**Result: 70% → 92% → 94% → 97%** over successive targeted fixes.

**Key lesson: validate your evaluator first.** We nearly started "fixing" a generation pipeline that was actually performing at 92% — the 70% score was measurement noise.

### Dimension 3: Answer Grounding (March 26-27)

Correct answers aren't enough. We created a new benchmark dimension:

> "We had a question and answer where the answer said it was in the brief, but I never saw it in the source PDF. What eval should we look at for this one?"

Claude Code designed a grounding benchmark measuring three sub-dimensions:
- **Self-contained:** Does the answer stand alone without referencing "the passage"?
- **Concrete:** Does it give a specific answer, not a vague restatement?
- **Grounded:** Is every claim actually in the source?

**First grounding result: 68%.** A third of answers contained plausible-sounding facts that weren't in the source PDF — hallucinated distractors, elaborated explanations, inferred conclusions.

**The diagnostic prompt:**

> "Read the prompts in create-lesson.ts and tell me where the grounding gaps are."

Claude Code identified three specific gaps:
1. Multiple-choice had zero grounding instructions — distractors were invented freely
2. The validation prompt checked "is this correct?" but never "is this in the source?"
3. Flow diagram prompts had no grounding constraints at all

**The fix was entirely prompt engineering** — no code changes to the pipeline:

```
CRITICAL: Every fact, claim, and detail MUST come directly from the source
content. Do NOT infer, elaborate, or add information not explicitly stated.
```

Plus a new validation criterion for the retry loop:

```
GROUNDING: Are ALL facts and claims EXPLICITLY stated in or directly
supported by the source? Flag any claims that appear plausible but are
NOT in the source (hallucination).
```

**Result: 68% → 88% grounded.** A 20-point improvement from prompt changes alone. No model change, no architecture change.

**Commit: `d99354c` — "Improve answer grounding from 68% to 88%"**

### Dimension 4: MC Index Alignment (March 30-31)

Multiple-choice accuracy was stuck at 86-89%. We isolated the issue:

> "Let's try solve the index problem. Maybe we can isolate the issue first."

Claude Code analyzed every MC failure and found a mechanical bug: **~60% of "wrong" MC answers were index misalignment.** The model would write the correct answer as choice B but set the answer index to 0 (choice A). The content was right, the pointer was wrong.

**The fix was 15 lines of code:** A `shuffleMultipleChoice()` function that:
1. Tells the model to always put the correct answer as the first choice
2. Fisher-Yates shuffles all choices after generation
3. Updates the answer index to match

This decouples "generate correct content" from "assign correct index." The model only has to get the content right; code handles the rest.

**Result:** MC accuracy 89% → 90%. Remaining errors are genuine content mistakes, not mechanical bugs.

**Commit: `91d303e` — "Fix MC index misalignment and improve benchmark infrastructure"**

### Dimension 5: Benchmark Infrastructure (Ongoing)

A meta-dimension. Early benchmarks used different judges across runs, making comparison unreliable:

> "Why aren't we using Sonnet 4.6 for apples-to-apples comparison?"

We standardized: Sonnet 4.6 judge, temperature 0, `--iterations=N` flag for statistical confidence, multi-provider support (direct Anthropic API → OpenRouter fallback). Benchmark results saved as timestamped JSON files for trend tracking.

> "Do we save these evals somewhere with a timestamp so we can reflect to see if we improved?"

Yes — every run dumps results to `data/benchmarks/` as JSON. This made it trivial to later produce trend comparisons across the full improvement arc.

---

## Model Comparison

We also tested whether switching the generation model would help:

> "Let's run all evals on Kimi, Qwen, GLM-5, MiniMax, 120B. But first do a quick smoke test to see if they actually work."

| Model | Accuracy | Speed | Notes |
|-------|----------|-------|-------|
| GLM-5 | 93-100% | ~46s/lesson | Best accuracy, 10x slowest |
| MiniMax-M2.5 | 88-97%* | ~2s/lesson | Fastest, chosen as default |
| GPT-OSS-120B | 92% | ~6s/lesson | Solid all-round |
| Kimi-K2.5 | 0% | — | Reasoning model, empty output |
| Qwen 3.5 397B | 0% | — | Reasoning model, empty output |

*MiniMax accuracy improved from 88% to 97% through pipeline fixes, not model changes.

**Decision:** The cheapest, fastest model (MiniMax-M2.5 at 2s/lesson) matched the most expensive model's accuracy after code-level improvements. The model was never the bottleneck — the pipeline was.

---

## The Final Numbers

| Dimension | Start | End | How |
|-----------|-------|-----|-----|
| OCR quality | 0% (broken) | 100% | Replaced vision model with mupdf WASM |
| Generation speed | 67.5s/course | 23.5s/course | XML → JSON + Zod |
| Structural first-pass | 57% | ~98% | Zod validation + retry loop |
| Answer accuracy | 70% | 97% | Fixed judge, prompt constraints, MC shuffle |
| Grounded in source | 68% | 88%+ | Anti-hallucination prompt engineering |
| Duplicate questions | 20.5% | 0% | Sequential generation with dedup context |
| Codebase size | 2,204 lines (pipeline) | 940 lines | Removed dead code, simplified architecture |

---

## The Methodology, Extracted

Looking back, every improvement followed the same 6-step loop:

### 1. Measure
> "Build me a benchmark for X"

Don't specify how. Describe what you want to measure and let the agent design the evaluation. The benchmark scripts it wrote were better than what we would have hand-crafted — they included things like checking answer indices against choices, which caught a real bug later.

### 2. Validate the measurement
> "Is the judge broken, or is the model broken?"

Before optimizing anything, verify your evaluator. Our first accuracy score was 70% — but half the "errors" were judge parse failures. Switching to a reliable judge revealed the true baseline was 92%. We nearly wasted time "fixing" a 22-point gap that didn't exist.

### 3. Diagnose
> "What are the actual failure modes? Show me the failing cases grouped by type."

Don't guess at what's wrong. Read the failures systematically. The MC index misalignment bug was invisible from the outside — every answer looked wrong, but the content was right and the pointer was wrong. You only find this by reading failure cases.

### 4. Fix (targeted)
> "Fix the index problem" — not "make the answers better"

State the problem, not the solution. Let the agent figure out the implementation. And change one thing at a time — if you change the prompt AND the model AND the post-processing, you can't tell what helped.

### 5. Re-measure (same conditions)
> "Run it again, same judge, same config, 5 iterations"

Same judge, same temperature, same PDFs. Otherwise you're comparing noise. The `--iterations` flag was critical for distinguishing real improvements from variance.

### 6. Ship and move on
> "Create a PR for these changes. Now let's look at Y."

Small, isolated PRs. Don't batch unrelated improvements. Ship the OCR fix before starting on structured output. Ship structured output before starting on answer quality. Each dimension gets its own branch and PR.

### What we didn't do

- **We didn't plan upfront.** No roadmap, no prioritized backlog. Each session started with "what's the worst thing right now?" and worked from there.
- **We didn't change the model.** MiniMax-M2.5 went from 70% to 97% through pipeline improvements. The model was never the bottleneck.
- **We didn't over-engineer.** The MC shuffle is 15 lines. The grounding fix was adding paragraphs to existing prompts. The dedup fix was passing a list of prior questions. No new abstractions, no new services.
- **We didn't optimize all dimensions at once.** Fix the foundation (OCR), then the architecture (XML→JSON), then the quality dimensions one at a time. Each measured independently.

---

## The Prompts That Drove It

The most effective prompts fell into three categories:

**Diagnostic prompts** (understanding the problem):
- "Can you do a deep dive into how we would make this product more robust?"
- "How do you know we wouldn't get regressions from these changes?"
- "Show me all the incorrect answers grouped by question type"
- "Read the prompts in create-lesson.ts and tell me where the grounding gaps are"

**Action prompts** (implementing the fix):
- "Build me a benchmark for X" (let it design the approach)
- "Fix the index problem" (state the problem, not the solution)
- "Create another worktree and work on this problem"

**Verification prompts** (closing the loop):
- "Run all benchmarks to see where we stand"
- "Use the same judge so we can compare apples-to-apples"
- "Run 5 iterations to make sure it's not a fluke"
- "Show me the trends — how did we improve over time?"

**Prompts that didn't work:**
- "Make the answers better" — nowhere to go without data
- Changing multiple things between measurements — can't attribute improvements
- Using a different judge/config each run — trends become meaningless

---

## Cost

- **Generation model:** MiniMax-M2.5 on Together AI (~$0.001-0.003 per lesson)
- **Judge model:** Sonnet 4.6 via Anthropic API (~$0.01-0.03 per judgment)
- **Full benchmark run:** 5 PDFs × 5 iterations × ~10 lessons = ~250 judgments ≈ $5-8
- **Total over two weeks:** Under $100 in API calls for dozens of benchmark runs
- **Human time:** ~2-3 hours per day of steering, reviewing results, and deciding what to measure next

No ML training, no fine-tuning, no custom models. Prompt engineering, post-processing, and systematic measurement — all driven through conversation with a coding agent.

---

## Tools

- **Claude Code** — drove the entire process: explored codebase, wrote benchmarks, analyzed failures, implemented fixes, ran evaluations, created PRs
- **Together AI** — hosted the generation model (MiniMax-M2.5)
- **Anthropic API** — hosted the judge model (Sonnet 4.6)
- **Git worktrees** — isolated each improvement on its own branch
- **Bun** — ran TypeScript benchmark scripts
- **Zod** — structural validation of generated JSON

---

## The Meta-Lesson

The approach works because the agent is good at the tedious parts — writing benchmark scripts, parsing failure logs, implementing small fixes, running evaluations across multiple configurations — and the human is good at the strategic parts: deciding what to measure, questioning the measurement itself, choosing what to fix next.

The prompts that moved the needle were almost never about the fix. They were about the measurement. "Build me a benchmark for X" and "is this measurement trustworthy?" drove more improvement than any prompt about the actual code changes.

If you want to try this on your own project:

1. Pick the dimension you're least confident about
2. Ask your agent to build a benchmark for it
3. Run the benchmark and read the failures — not the summary, the actual failures
4. Fix the most common failure mode
5. Re-run with identical conditions
6. Repeat until the numbers stop moving, then pick the next dimension

The whole thing is just the scientific method, automated.
