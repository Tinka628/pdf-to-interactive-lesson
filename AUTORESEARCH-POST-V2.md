# applying autoresearch to a real product -- 70% to 97% in two weeks

i spent two weeks improving an open source project we're building at Together -- an app that takes a PDF and turns it into interactive lessons with quizzes, powered by our model APIs. the app "worked" but i had no idea how well. no benchmarks, no tests, no data. just vibes.

i used claude code as both the researcher and the implementer. the whole approach was basically: ask it to measure something, look at the results together, tell it to fix what's broken, re-measure. repeat.

this was heavily inspired by karpathy's autoresearch ([https://github.com/karpathy/autoresearch](https://github.com/karpathy/autoresearch)) -- the idea of using an agent to baseline, simplify, tweak, and measure in a tight loop. same energy, applied to a product codebase instead of a research paper.

this post is the actual play-by-play from our conversations. the prompts are real. the numbers are real.

---

## it started with "make this better"

my first prompt was pretty open ended:

> can you do a deep dive into how we would make this product more robust. or to make it simpler. less code, same speed and quality for the output of courses

claude code explored the codebase and came back with a bunch of suggestions. but before i let it change anything, i asked:

> how do you know we wouldnt get regressions from these changes?

its answer was honest -- "i don't. there are no tests." that was the moment everything clicked. we needed to measure before changing anything.

> i think we benchmark/baseline. get a baseline of what happens if we test around 2/3 pdfs on how many errors/speed we get on current state. then we can use that against swapping out the ocr library, to see if our change was any good

this one prompt set the whole methodology for the next two weeks. benchmark first, change second.

---

## the ocr was completely broken

claude code built the benchmark script, ran it on 3 test PDFs, and the results were bad:


| PDF                              | Time | First-pass Rate |
| -------------------------------- | ---- | --------------- |
| together-embeddings (8p)         | 74s  | 22%             |
| attention-is-all-you-need (15p)  | 132s | 92%             |
| claude-code-best-practices (24p) | 93s  | 44%             |


22% first-pass on an 8-page blog post. something was very wrong.

> explain this a bit more: Improve the generator (prompt quality / content truncation) -- 52.8% first-pass is low

turned out the OCR was broken for a pretty silly reason. the app had two OCR paths: a Python Flask app on Railway (using PyMuPDF, worked great) and a local TypeScript fallback (using pdfjs + @napi-rs/canvas). the Railway API URL wasn't set, so it fell back to the TS path. but the TS fallback's canvas polyfill was broken -- "Cannot polyfill Path2D" -- producing blank images. the vision model got blank images, said "I don't see a document", and the pipeline silently treated that refusal message as actual content. so the LLM was generating courses about... nothing. the validator caught them all, which is why first-pass was so low.

the flask api just wasn't turned on. and the fallback was busted. classic.


| OCR Method             | Time  | Chars/page | Failed Pages |
| ---------------------- | ----- | ---------- | ------------ |
| vision model (current) | 31.4s | 204        | 47/47        |
| PyMuPDF direct         | 330ms | 1,776      | 0            |
| mupdf WASM             | 79ms  | 1,798      | 0            |


> so just so i understand, all the ocr stuff for ts is just dead code. and pymupdf in the flask app is amazing. so your suggesting to kill all the ts ocr stuff?

> interestng. know of a quick smoke test we can run for ts to use a better lib here? i understand py is best, but having one repo/project on vercel would be great here. instead of one on vercel and one on railway.

instead of fixing the Railway setup or the canvas polyfill, we just swapped the whole thing for mupdf (WASM build, runs on vercel). one dependency, same engine as PyMuPDF, no separate python API on a separate hosting provider.

> are you sure it works on vercel?

> alright, yeah do a quick smoke test and verify it works on vercel with a preview url

it worked. shipped it.

> okay amazing. i want to try and keep prs isolated and small. this is perfect for a new branch.

this became a pattern -- small isolated PRs, one concern per branch.

---

## XML to JSON (2.9x faster, 57% less code)

next up was the generation pipeline. the original used XML output with a custom parser, a 671-line structure validator, and a 369-line fix-lesson retry system. it was a lot.

> how would you simplify this app by keeping the quality of the gen course and same speed it generates

claude code suggested replacing XML with JSON + Zod structured output. i liked that the zod schema would define the shape and validation errors would feed back into retries automatically -- no custom parser needed.

> awesome. can you try merge main into here, clean up conflicts, then create a pr for this

> how does it do on Rise-and-Fall-of-the-Roman-Empire.pdf, together-embeddings-blog.pdf, Claude Code Best Practices.pdf? have we baselined these and run against the new approach?

always checking against the baseline. the results:


| Metric          | Before (XML) | After (JSON + Zod) |
| --------------- | ------------ | ------------------ |
| Speed           | 67.5s/course | 23.5s/course       |
| First-pass rate | 57%          | 100%               |
| Lines of code   | 2,204        | 940                |


shipped it.

---

## the feedback that changed everything

on march 24th we shared the app internally. by the 25th the feedback was rolling in -- people actually liked it. one teammate used it on the cursor composer 2 tech report and said:

> Very cool! I used it on the new tech report that Cursor launched and it works nicely - the interactive questions were a very nice touch (it got me to drag and drop the training pipeline that cursor used for their model!)

but the specific bug reports were what mattered. from zain:

> - A question from the first module was repeated in the 2nd module
> - The questions are a bit simplistic and focusing on the surface facts vs the actual relevant details worth learning
> - Module 2 gave the incorrect answer as the correct answer
> - Module 2 -> Module 1 labels are bugged - it goes from module 2 and says "Welcome to Module 1" but actually starts 3
> - Equations are not rendered correctly
> - When I get the answer right would it be possible to make it more obvious

this was the turning point. we had real users hitting real issues, and the problems mapped cleanly to things we could measure: duplicate questions, wrong answers, broken module indexing. instead of trying to fix them one by one based on gut feel, i thought -- why not benchmark each of these, get a baseline, and systematically drive them to zero?

that's when the autoresearch approach kicked in properly. each bug report became a dimension to measure.

---

## the quality benchmarks

with the foundation solid (OCR working, clean architecture), i shifted to output quality. this is where it got interesting.

### duplicates: 20% to 0%

> lets create another worktree and work on this problem. we want to bench current understanding of how many duplicated questions are in the modules. lets get a current baseline.

20.5% duplication rate across 5 PDFs at 5 iterations. the model kept asking the same questions across modules.

> alright, can you fix (Within-course content duplication is the real problem). tweak the code to get 0 duplication. but also, we need to keep the 100% accuracy we have from prior benches we have done

the fix was switching from parallel to sequential lesson generation -- each module gets the list of already-asked questions. dropped to 0% and stayed there.

### answer correctness: 70% to 97%

> alright new bench. what we need to baseline right now is if the model created the correct answer. i want you to come back with a baseline on what answers the result got wrong for each of the 5 pdfs

first score: 70%. that felt too low. but before touching anything:

> use opus for judge. and yes run all benchs to see where we stand on this

switching from deepseek to opus as the judge bumped us to 92% immediately. half the "errors" were the judge failing to produce valid JSON, not actual wrong answers.

this is a huge lesson -- **validate your evaluator before optimizing your pipeline.** we almost started fixing problems that didn't exist.

then we analyzed the remaining failures by question type, added targeted prompt constraints, and climbed to 97%.

### grounding: 68% to 88%

this one came from actually using the app:

> we had a question and answer, where the answer said the answer was in the brief, but i never saw it. its module 1, lesson 2. in the composer2.pdf

the answer was hallucinated. looked right, wasn't in the source. so we created a new benchmark dimension for it.

> yeah, lets get a baseline on all the pdfs/ for this new dimension

68% grounded. a third of answers had facts that sounded right but weren't in the PDF.

> alright, lets try move the needle to get this new dimension more accurate. we also need to keep the other benches as 100%

the fix was prompt engineering -- adding anti-hallucination constraints to generation and validation prompts. 68% to 88%. no code changes to the pipeline itself.

### MC index bug

multiple-choice was stuck at 86-89%. we dug in:

> alright, lets try solve the index problem. maybe we can isolate the issue first

~60% of "wrong" MC answers were index misalignment -- the model writes the correct answer as choice B but points to index 0. content is right, pointer is wrong. 15 lines of code (shuffle after generation) fixed it.

---

## model comparison

> lets run all evals on kimi, qwen, glm 5, minimax, 120b. but first do a quick smoke test on our code to see if they actually work before doing a full run


| Model         | Accuracy | Speed       |
| ------------- | -------- | ----------- |
| GLM-5         | 93-100%  | ~46s/lesson |
| MiniMax-M2.5  | 88-97%*  | ~2s/lesson  |
| GPT-OSS-120B  | 92%      | ~6s/lesson  |
| Kimi-K2.5     | 0%**     | broken      |
| Qwen 3.5 397B | 0%**     | broken      |

*after pipeline fixes

**the kimi and qwen 0% was another tooling issue, not a model issue. both are thinking/reasoning models that spend tokens on internal reasoning before producing output. our benchmark scripts had maxOutputTokens set to 256 -- way too low. the models burned all their tokens on thinking and returned empty text. when we bumped to 2048 tokens, both produced valid JSON. but the pipeline's parseJSON() still couldn't handle the thinking markup these models sometimes prefix their output with. so "broken" really meant "our pipeline doesn't support reasoning models yet" -- same pattern as the OCR. the model wasn't the problem, the tooling was.

the cheapest, fastest model matched the best model's accuracy after code-level improvements. we kept MiniMax.

---

## final numbers


| Dimension             | Start        | End          |
| --------------------- | ------------ | ------------ |
| OCR quality           | 0% (broken)  | 100%         |
| Generation speed      | 67.5s/course | 23.5s/course |
| Structural first-pass | 57%          | ~98%         |
| Answer accuracy       | 70%          | 97%          |
| Grounded in source    | 68%          | 88%+         |
| Duplicate questions   | 20.5%        | 0%           |
| Codebase size         | 2,204 lines  | 940 lines    |


---

## what i'd do differently: shorter feedback loops

the biggest thing i'd change is the feedback loop speed.

we used an LLM judge (opus, then sonnet 4.6) for most evaluations. it works -- opus is a great judge. but there's a real concern around **determinism**. run the same eval twice with an LLM judge and you can get different scores. we had to add `--iterations=5` and `temperature=0` just to smooth out the variance, and even then you're never 100% sure a 2-point improvement is real or noise.

for a lot of what we measured, a code-based eval would have been faster and more deterministic:

- **structural validity** -- already handled by zod, no LLM needed
- **duplicate detection** -- normalized string matching, no LLM needed
- **MC index alignment** -- you can literally check if `choices[answer]` matches the correct answer programmatically
- **grounding** -- this is the hard one where you genuinely need an LLM judge, because you're checking if semantic claims exist in source text

the pattern i'd aim for next time: **code-based evals for everything you can, LLM judge only for the things that require understanding.** the code evals give you instant, deterministic feedback -- you change something and know immediately if it regressed. no waiting for 250 API calls to finish. no wondering if the score variance is real.

i think the ideal loop is:

1. code-based eval catches structural and mechanical issues in seconds
2. LLM judge runs less frequently, only for semantic dimensions (grounding, answer quality)
3. use the LLM judge scores as a directional signal, not a precise measurement

we got there partially -- zod handles structural, string matching handles duplicates -- but i'd push harder on pulling more dimensions into code-based checks from the start. the shorter your feedback loop, the faster you iterate.

---

## the methodology

looking back the pattern was the same every time:

1. **measure** -- "build me a benchmark for X"
2. **question the measurement** -- "is the judge broken or is the model broken?"
3. **diagnose** -- "whats the bottleneck of whats the worst?"
4. **fix one thing** -- small, targeted change
5. **re-measure** -- same judge, same config, same PDFs
6. **ship it** -- isolated PR, move to next dimension

the prompts that worked best:

- "lets get a baseline on this" -- always start with data
- "how do you know we wouldnt get regressions?" -- forces honesty about what we don't know
- "run all benchmarks to see where we stand" -- verify nothing regressed
- "why arent we using sonnet 4.6 for apples to apples comparison?" -- keep the measurement consistent
- "lets run 5 iterations to make sure its not a fluke" -- don't trust single runs

what didnt work:

- vague prompts without data ("make it better")
- changing multiple things between measurements
- switching judges between runs (trends become meaningless)

the biggest unlock was realizing that the agent is great at the tedious stuff -- writing benchmark scripts, running evals, analyzing failure logs -- and my job is to decide what to measure and when to ship. the actual prompts that moved the needle were almost never about the fix. they were about the measurement.

---

## cost

- generation model: MiniMax-M2.5 on Together AI (~$0.001/lesson)
- judge model: Sonnet 4.6 via Anthropic API (~$0.01-0.03/judgment)
- full benchmark run: ~250 judgments = roughly $5-8
- total over two weeks: under $100 in API calls
- human time: ~2-3 hours/day of steering

no training, no fine-tuning. prompt engineering, post-processing, and systematic measurement.

---

## tldr

the whole thing is just the scientific method, applied to a codebase through conversation with a coding agent. measure, diagnose, fix, re-measure. the agent does the legwork. you decide what to measure next. keep the feedback loop as short as possible -- use code-based evals where you can, save the LLM judge for things that genuinely need semantic understanding.