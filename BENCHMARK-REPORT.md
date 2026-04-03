# Benchmark Report: Improving PDF-to-Lesson Quality

This document tracks how we systematically improved the quality of generated interactive lessons across four dimensions: structural validity, answer correctness, grounding, and deduplication.

## Final Results

| Dimension | Start | Final | Improvement |
|---|---|---|---|
| Structural first-pass | 57% | ~98% | +41pp |
| Answer accuracy | 70% | 97% | +27pp |
| Grounded in source | 87% | 98% | +11pp |
| Fully grounded (all 3 dims) | 85% | 96% | +11pp |
| Duplicate questions | 12-20% | 0% | Eliminated |

All final numbers measured with Sonnet 4.6 judge, temperature 0, 5 iterations across 5 PDFs.

---

## Phase 1: Structured Output Migration (Mar 18-25)

**Problem:** The original XML-based generation pipeline was slow, fragile, and required a 671-line structure validator plus a 369-line fix-lesson retry system.

**Change:** Replaced XML generation with JSON + Zod schema validation.

**Impact:**
- Generation speed: 67.5s → 23.5s per course (2.9x faster)
- Structural first-pass rate: 57% → 100%
- Codebase: 2,204 → 940 lines (-57%)

The Zod schema catches malformed output immediately and the retry loop (up to 3 attempts) feeds the validation error back to the model, letting it self-correct. This eliminated the need for the bespoke XML parser and structure validator entirely.

## Phase 2: Duplicate Question Elimination (Mar 25)

**Problem:** When generating 3 modules with 3-4 lessons each, the model would frequently repeat the same questions across modules. At 5 iterations the duplication rate hit 20.5%.

**Change:** Switched from parallel to sequential lesson generation with deduplication context.

Each module now receives:
1. A list of all previously asked questions in the course
2. All module titles for topic scoping
3. Explicit instruction not to repeat questions

```
IMPORTANT: Do NOT repeat or closely paraphrase any of these previously asked questions:
- "What title did the Senate give to Octavian?"
- "The Pax Romana lasted nearly 200 years."
...
```

**Impact:** Duplication rate dropped from 20.5% to 0% and stayed there across all subsequent runs.

**Tradeoff:** Sequential generation is slower than parallel, but the quality improvement was worth it.

## Phase 3: Answer Correctness (Mar 25-26)

**Problem:** First accuracy benchmark with a DeepSeek judge scored 70%. Investigation revealed two issues: the judge itself was unreliable (parse failures marking correct answers wrong), and the generation prompts allowed ambiguous questions.

**Changes:**
1. Switched judge to Claude Opus 4.6 — reliable JSON output, no parse failures
2. Strengthened question-type constraints in the generation prompt:
   - Short-answer: must be a fact explicitly stated in source, no URLs or code snippets
   - True-false: must be unambiguously true or false, no double negatives
   - Multiple-choice: all choices must be grounded in source content
3. Added re-judge verification pass: when the judge marks an answer incorrect, a second pass checks for self-contradictions in the judge's reasoning

**Impact:** Accuracy rose from 70% → 92% (Opus judge, 1 iteration) → 94% (3 iterations).

## Phase 4: Answer Grounding (Mar 26-27)

**Problem:** A new grounding benchmark revealed that while answers were factually correct, 32% contained information not explicitly in the source PDF (hallucination). The model would generate plausible-sounding facts for distractor choices and elaborate beyond what the source stated.

**Root cause analysis identified three gaps:**
1. Generation prompt had no global anti-hallucination constraint
2. Multiple-choice had no grounding instruction for distractor choices
3. Validation prompt checked "correctness" but not "grounding"

**Changes:**

Added a grounding preamble to the generation prompt:
```
CRITICAL: Every fact, claim, and detail in your lessons MUST come directly
from the source content below. Do NOT infer, elaborate, or add information
not explicitly stated in the source.
```

Added a 6th validation criterion:
```
GROUNDING: Are ALL facts and claims EXPLICITLY stated in or directly
supported by the source? Flag any claims that appear plausible but are
NOT in the source (hallucination).
```

Added grounding constraints to flow diagram prompts and fix/retry prompts.

**Impact:**
- Grounded: 68% → 88% (+20pp) after prompt changes
- Self-contained: 94% → 99%
- Concrete: 97% → 100%
- No regression in answer correctness

## Phase 5: MC Index Alignment Fix (Mar 30-31)

**Problem:** Multiple-choice accuracy plateaued at 86-89%. Analysis of failures revealed that ~60% of "wrong" MC answers were actually index misalignment — the model would write the correct answer as choice B but set the answer index to 0 (choice A). The content was right but the pointer was wrong.

**Solution:** Instead of hoping the model gets the index right, we changed the contract:

1. **Prompt always says:** "Put the CORRECT answer as the FIRST choice (index 0)"
2. **`shuffleMultipleChoice()`** runs after generation:
   - Treats `choices[0]` as the correct answer (source of truth)
   - Fisher-Yates shuffles all 4 choices
   - Updates `answer` index to wherever the correct choice landed

```typescript
function shuffleMultipleChoice(lesson: any): void {
  const choices = lesson.choices as (string | number)[];
  const correctChoice = choices[0];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  lesson.answer = choices.indexOf(correctChoice);
}
```

This also runs on fix/retry outputs so the invariant is maintained throughout the pipeline.

**Impact:** MC accuracy jumped from 89% → 90% (apples-to-apples, Sonnet 4.6 judge). The remaining errors are all genuine content mistakes, not index bugs.

## Phase 6: Benchmark Infrastructure (Mar 30-31)

**Problem:** Early benchmarks used different judges (DeepSeek, Opus, Llama, Sonnet) making trend comparison unreliable. OpenRouter credits ran out mid-run. No deterministic reproducibility.

**Changes:**
1. Multi-provider judge support: direct Anthropic API → OpenRouter fallback → Together AI
2. Default judge standardized to Sonnet 4.6 with `temperature: 0`
3. Removed 20k character content truncation — judges now see full source
4. Added `--iterations=N` flag for statistical confidence
5. Refactored duplicates benchmark to compute per-iteration stats

**Impact:** Reproducible, comparable results across runs. The temperature=0 change alone reduced scoring variance.

---

## Model Comparison

We tested 5 generation models on Together AI:

| Model | Accuracy | Speed | Structural | Notes |
|---|---|---|---|---|
| GLM-5 | 93-100% | ~46s/lesson | 100% | Best accuracy, 10x slowest |
| MiniMax-M2.5 | 88-97%* | ~2s/lesson | 100% | Fastest, chosen as default |
| GPT-OSS-120B | 92% | ~6s/lesson | 96% | Solid all-round |
| Kimi-K2.5 | 0% (broken) | — | 0% | Reasoning model, empty output |
| Qwen 3.5 397B | 0% (broken) | — | 0% | Reasoning model, empty output |

*MiniMax accuracy improved from 88% to 97% through code-level fixes (shuffle, grounding prompts, validation), not model changes.

Kimi and Qwen are thinking/reasoning models that consume tokens on internal reasoning before producing output. The AI SDK returns empty text when `maxOutputTokens` is too low, and their output may include thinking markup that the JSON parser can't handle.

**Decision:** MiniMax-M2.5 at 2s/lesson is fast enough for production use, and the accuracy gap vs GLM-5 was closed through code improvements rather than model swaps.

---

## Methodology

### Evaluation Dimensions

1. **Answer Correctness** — Is the answer factually correct given the source?
   - LLM judge compares each Q&A pair against the source PDF
   - Verification pass catches self-contradictory judge reasoning
   - Measured per question type: short-answer, true-false, multiple-choice, flow-diagram

2. **Grounding** — Three sub-dimensions:
   - **Self-contained:** Answer stands alone without referencing "the passage" or "the brief"
   - **Concrete:** Answer provides specific information, not vague restatements
   - **Grounded:** Every claim is explicitly supported by the source (no hallucination)

3. **Deduplication** — No repeated questions within or across modules
   - Exact and near-duplicate detection via normalized string comparison
   - Measured within-course and cross-course

4. **Structural Validity** — Generated JSON passes Zod schema validation on first attempt

### Benchmark Configuration

- **PDFs:** 5 documents (Roman Empire history, multi-agent systems, embeddings blog, Composer 2 paper, Claude Code best practices)
- **Iterations:** 5 per run for statistical confidence
- **Judge:** Sonnet 4.6, temperature 0, via direct Anthropic API
- **Generation model:** MiniMax-M2.5 via Together AI

---

## Key Lessons

1. **Fix the evaluation before fixing the model.** Our first benchmark scored 70% — but half the "errors" were judge parse failures, not real problems. Switching to a reliable judge immediately revealed the true baseline was ~90%.

2. **Most MC errors are mechanical, not intellectual.** The model knows the right answer but points to the wrong index. Decoupling "generate correct content" from "assign correct index" via the shuffle approach eliminated an entire class of errors.

3. **Explicit anti-hallucination constraints work.** Adding "do NOT infer or add information not in the source" to prompts improved grounding by 20 percentage points. The model can follow these instructions — it just needs to be told.

4. **Sequential generation with context prevents duplicates.** Passing the list of already-asked questions to each subsequent generation call brought duplicates from 20% to 0%.

5. **Code fixes beat model upgrades.** MiniMax-M2.5 went from 88% to 97% accuracy through prompt engineering and post-processing, while being 10x cheaper and faster than GLM-5. The model was never the bottleneck — the pipeline was.
