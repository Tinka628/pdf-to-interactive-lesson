# How We Used Claude Code to Improve LLM Output Quality from 70% to 97%

A practical guide to systematically improving LLM-generated content using AI-assisted benchmarking, prompt engineering, and iterative measurement. This documents the actual prompts and workflow we used — not the theory, but the real back-and-forth with Claude Code that got us there.

## The Setup

We have a pipeline that takes a PDF, OCRs it, and uses an LLM (MiniMax-M2.5 on Together AI) to generate interactive lessons — each with a question, answer, and explanation. The output is structured JSON validated by Zod schemas.

We had no idea how good or bad the output was. The app worked, lessons rendered, but were the answers actually correct? Were they making things up?

## Step 1: "Build me a benchmark"

The first thing we did was ask Claude Code to create an evaluation framework. The prompt was essentially:

> "Create a benchmark script that generates courses from our test PDFs, then uses a separate LLM judge to verify every question/answer pair against the source content."

We didn't specify the architecture — Claude Code designed the judge prompt, the two-pass verification (initial verdict + contradiction check), the per-question-type evaluation, and the JSON output format.

**What we learned:** Don't try to design your eval framework upfront. Describe what you want to measure and let the agent figure out the mechanics. The judge prompt it wrote was better than what we would have hand-crafted — it included things like "check that the answer INDEX actually points to the right choice" which turned out to catch a real bug later.

**First result: 70% accuracy.** That was the wake-up call.

## Step 2: "Is the judge broken or is the model broken?"

70% seemed too low. Before optimizing anything, we needed to trust our measurement. We asked:

> "A lot of these look like judge failures, not real errors. Can you analyze the incorrect answers?"

Claude Code read through the failed cases and found that the judge (DeepSeek-V3.1) was itself producing unparseable responses — marking correct answers as wrong because its own JSON output was malformed.

**Fix:** Switched the judge to Claude Opus 4.6. Accuracy immediately jumped to 92%.

**Lesson:** Always validate your evaluator first. If your eval is noisy, you'll optimize for noise. We wasted zero time "fixing" problems that didn't exist because we checked the judge quality before touching the generation.

## Step 3: "What are the actual failure modes?"

With a reliable judge, we looked at the remaining 8% of failures:

> "Show me all the incorrect answers grouped by question type."

The breakdown was revealing:

```
short-answer:     83%
true-false:       92%
multiple-choice:  100%
flow-diagram:     92%
```

Short-answer was the weakest. Reading through the failures, we found the model was asking about things like exact URLs and code snippets that had OCR artifacts, and embedding unverified translations in questions.

**Fix:** Added constraints to the generation prompt:
- "Do NOT ask about exact URLs, code snippets, or strings that may have formatting issues"
- "Do NOT embed unverified claims or translations in the question itself"

This was a targeted prompt change based on observed failure patterns, not guesswork.

## Step 4: "Now benchmark a different dimension"

Correct answers aren't enough. We asked:

> "Create a grounding benchmark — check if the generated content is actually supported by the source PDF, not hallucinated."

This was a separate script measuring three sub-dimensions:
- **Self-contained:** Does the answer stand alone without saying "as mentioned in the passage"?
- **Concrete:** Does it give a specific answer, not a vague restatement?
- **Grounded:** Is every claim actually in the source?

**First grounding result: 68% grounded.** A third of answers contained plausible-sounding facts that weren't in the source PDF.

## Step 5: "Why is grounding so low? Analyze the gaps."

> "Read the prompts in create-lesson.ts and tell me where the grounding gaps are."

Claude Code identified three specific gaps:
1. Multiple-choice had zero grounding instructions — distractors were invented
2. The validation prompt asked "is this correct?" but never "is this in the source?"
3. Flow diagram prompts had no grounding constraints at all

**Fix:** Added targeted instructions at each gap:

```
CRITICAL: Every fact, claim, and detail MUST come directly from the source
content. Do NOT infer, elaborate, or add information not explicitly stated.
```

Plus a new validation criterion:

```
GROUNDING: Are ALL facts and claims EXPLICITLY stated in or directly
supported by the source? Flag any claims that appear plausible but are
NOT in the source (hallucination).
```

**Result: 68% → 88% grounded.** A 20-point improvement from prompt changes alone.

## Step 6: "Run it again with more iterations"

Single runs are noisy. We asked:

> "Add an --iterations flag and run 3 iterations to get more stable numbers."

This was straightforward — Claude Code added the flag, accumulated results across iterations, and computed aggregate stats. Three iterations gave us enough signal to distinguish real improvements from variance.

## Step 7: "The MC accuracy is stuck at 86-89%. Can you isolate the issue?"

Multiple-choice was the weakest link. We asked Claude Code to dig in:

> "Let's try to isolate the issue. Maybe we can look at just the MC failures."

It analyzed every MC failure and found a pattern: **~60% of "wrong" answers were index misalignment.** The model would write the correct answer as choice B but set the answer index to 0 (pointing to choice A). The content was right, the pointer was wrong.

**This is the kind of insight you only get from reading failure cases systematically.** We wouldn't have found this by staring at prompts.

## Step 8: "Fix the index problem"

> "Let's fix this. Maybe we always put the correct answer at index 0 and then shuffle."

Claude Code implemented `shuffleMultipleChoice()`:
1. Prompt tells the model to always put the correct answer first
2. After generation, Fisher-Yates shuffle randomizes the order
3. Answer index is updated to match

This decouples "generate correct content" from "assign correct index" — the model only has to get the content right, and the code handles the rest.

**Result:** MC accuracy went from 89% → 90% (remaining errors are genuine content mistakes).

## Step 9: "Let's use the same judge for apples-to-apples comparison"

We'd been switching judges across runs (Opus, Llama, Sonnet 4, Sonnet 4.6) which made trend comparison unreliable:

> "Why aren't we using Sonnet 4.6 for apples-to-apples comparison?"
>
> "And should we use temp 0?"

Good instinct. We standardized on Sonnet 4.6 at temperature 0, which also required adding multi-provider support to the benchmark scripts (direct Anthropic API when OpenRouter credits ran out).

## Step 10: "Show me the trends"

> "Is there a trends you can provide us with on how we improved over time?"

Claude Code read through all ~60 saved benchmark JSON files, identified the key milestones, and produced the comparison table. Having everything saved as JSON from the start made this trivial.

---

## The Workflow Pattern

Looking back, the pattern that worked was:

```
1. Measure     → "Build me a benchmark for X"
2. Validate    → "Is the measurement trustworthy?"
3. Diagnose    → "What are the actual failure modes?"
4. Fix         → Targeted change based on diagnosis
5. Re-measure  → "Run it again, same judge, same config"
6. Repeat      → Pick the next weakest dimension
```

Each cycle took 1-2 hours including generation time. The total improvement happened over about a week.

### What we DIDN'T do

- **We didn't guess at improvements.** Every prompt change was motivated by reading actual failure cases.
- **We didn't change the model.** MiniMax-M2.5 went from 70% to 97% through pipeline improvements. The model was never the bottleneck.
- **We didn't over-engineer.** The MC shuffle is ~15 lines of code. The grounding fix was adding paragraphs to existing prompts. No architectural changes.
- **We didn't optimize all dimensions at once.** We fixed structural issues first, then accuracy, then grounding, then deduplication. Each dimension was isolated and measured independently.

### Prompts that worked well

The most effective prompts to Claude Code were:

**Diagnostic prompts:**
- "Show me all the incorrect answers grouped by question type"
- "Read the prompts in create-lesson.ts and tell me where the grounding gaps are"
- "Can you analyze if these are real errors or judge failures?"

**Action prompts:**
- "Create a benchmark script that does X" (let it design the approach)
- "Fix the index problem" (state the problem, not the solution)
- "Run it again with the same judge so we can compare"

**The pattern:** Describe the problem or what you want to learn. Let the agent figure out how. Review the results together. Repeat.

### Prompts that didn't work

- Asking for improvements without data: "Make the answers better" → nowhere to go without knowing what's wrong
- Changing multiple things at once → can't tell what helped
- Using a different judge each time → trends become meaningless

---

## Cost and Time

- **Generation model:** MiniMax-M2.5 on Together AI (~$0.001-0.003 per lesson)
- **Judge model:** Sonnet 4.6 via Anthropic API (~$0.01-0.03 per judgment)
- **Full benchmark run:** 5 PDFs × 5 iterations × ~10 lessons = ~250 judgments ≈ $5-8
- **Wall time per full run:** ~30 minutes (generation + judging)

The entire improvement process (dozens of runs over a week) cost under $100 in API calls. The most expensive part was the judge, not the generation.

## Tools

- **Claude Code** — drove the entire process: wrote benchmarks, analyzed failures, implemented fixes, ran evaluations
- **Together AI** — hosted the generation model (MiniMax-M2.5)
- **Anthropic API** — hosted the judge model (Sonnet 4.6)
- **Bun** — ran the TypeScript benchmark scripts
- **Zod** — structural validation of generated JSON

No ML training, no fine-tuning, no custom models. Just prompt engineering, post-processing, and systematic measurement.
