#!/usr/bin/env npx tsx

/**
 * Baseline Benchmark
 *
 * Runs the full PDF→course pipeline on 2-3 test PDFs and records detailed
 * metrics (timing, error rates, validation stats, LLM call counts).
 *
 * Usage:
 *   TOGETHER_API_KEY=... tsx scripts/benchmark-baseline.ts [--runs 1] [--tag baseline]
 *
 * Results are saved to data/benchmarks/<tag>-<timestamp>.json
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, basename } from "path";
import { ocr } from "../lib/ocr";
import { createCourse } from "../lib/create-course";
import { DEFAULT_MODEL } from "../lib/utils/together";

// ── Config ──────────────────────────────────────────────────────────────────

// Resolve data dir: check cwd first, then look for main repo's data/
const DATA_DIR = existsSync(join(process.cwd(), "data"))
  ? join(process.cwd(), "data")
  : join(process.cwd(), "..", "..", "data");
const BENCHMARK_DIR = join(DATA_DIR, "benchmarks");

const TEST_PDFS = [
  { name: "together-embeddings-blog", file: "together-embeddings-blog.pdf", pages: 8 },
  { name: "attention-is-all-you-need", file: "1706.03762v7.pdf", pages: 15 },
  { name: "claude-code-best-practices", file: "Claude Code Best Practices _ Anthropic.pdf", pages: 24 },
];

// ── Types ───────────────────────────────────────────────────────────────────

interface OcrMetrics {
  totalPages: number;
  successfulPages: number;
  failedPages: number;
  timeMs: number;
  inputTokens: number;
  outputTokens: number;
  contentLength: number;
}

interface LessonMetrics {
  title: string;
  questionType: string;
  success: boolean;
  wasFixed: boolean;
  fixAttempts: number;
  failureType?: "structure" | "content";
  failureReason?: string;
}

interface ModuleMetrics {
  title: string;
  lessons: LessonMetrics[];
}

interface CourseMetrics {
  timeMs: number;
  modules: ModuleMetrics[];
  totalLessons: number;
  firstPassSuccess: number;
  fixedLessons: number;
  failedLessons: number;
  firstPassRate: number;
  finalSuccessRate: number;
}

interface ValidationStats {
  structureFailures: number;
  contentFailures: number;
  fixAttemptsMade: number;
  fixSuccesses: number;
}

interface PdfBenchmarkResult {
  pdf: string;
  pages: number;
  model: string;
  run: number;
  ocr: OcrMetrics;
  course: CourseMetrics;
  validation: ValidationStats;
  totalTimeMs: number;
  timestamp: string;
  error?: string;
}

interface BenchmarkReport {
  tag: string;
  model: string;
  timestamp: string;
  runs: number;
  results: PdfBenchmarkResult[];
  summary: {
    avgTotalTime: number;
    avgFirstPassRate: number;
    avgFinalSuccessRate: number;
    avgOcrTime: number;
    avgCourseTime: number;
    totalFixAttempts: number;
    totalFixSuccesses: number;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let runs = 1;
  let tag = "baseline";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--runs" && args[i + 1]) {
      runs = parseInt(args[++i], 10);
    } else if (args[i] === "--tag" && args[i + 1]) {
      tag = args[++i];
    }
  }

  return { runs, tag };
}

function fmt(ms: number): string {
  return (ms / 1000).toFixed(1) + "s";
}

function pct(n: number, total: number): string {
  if (total === 0) return "N/A";
  return ((n / total) * 100).toFixed(1) + "%";
}

// ── Core benchmark ──────────────────────────────────────────────────────────

async function benchmarkPdf(
  pdfConfig: (typeof TEST_PDFS)[number],
  model: string,
  run: number,
  apiKey: string,
): Promise<PdfBenchmarkResult> {
  const pdfPath = join(DATA_DIR, pdfConfig.file);
  const startTime = Date.now();

  console.log(`\n  📄 ${pdfConfig.name} (${pdfConfig.pages} pages) — run ${run}`);

  // ── OCR ──
  const ocrStart = Date.now();
  let ocrMetrics: OcrMetrics;

  // Check for cached .md file
  const cachedMdPath = pdfPath.replace(".pdf", ".md");
  if (existsSync(cachedMdPath)) {
    const content = readFileSync(cachedMdPath, "utf-8");
    ocrMetrics = {
      totalPages: pdfConfig.pages,
      successfulPages: pdfConfig.pages,
      failedPages: 0,
      timeMs: 0,
      inputTokens: 0,
      outputTokens: 0,
      contentLength: content.length,
    };
    console.log(`     OCR: cached (${content.length.toLocaleString()} chars)`);
  } else {
    const ocrResult = await ocr(pdfPath, {
      apiKey,
      maintainFormat: false,
      concurrency: 5,
      startDelay: 100,
    });

    ocrMetrics = {
      totalPages: ocrResult.pages.length,
      successfulPages: ocrResult.successfulPages,
      failedPages: ocrResult.failedPages,
      timeMs: Date.now() - ocrStart,
      inputTokens: ocrResult.inputTokens,
      outputTokens: ocrResult.outputTokens,
      contentLength: ocrResult.pages.map((p) => p.content).join("\n\n").length,
    };

    // Cache the OCR result for future runs
    const content = ocrResult.pages.map((p) => p.content).join("\n\n");
    writeFileSync(cachedMdPath, content, "utf-8");

    console.log(`     OCR: ${fmt(ocrMetrics.timeMs)} — ${ocrMetrics.successfulPages}/${ocrMetrics.totalPages} pages`);
    if (ocrMetrics.failedPages > 0) {
      console.log(`     ⚠️  ${ocrMetrics.failedPages} pages failed OCR`);
    }
  }

  // Get content for course generation
  const content = existsSync(cachedMdPath)
    ? readFileSync(cachedMdPath, "utf-8")
    : readFileSync(pdfPath.replace(".pdf", ".md"), "utf-8");

  // ── Course generation ──
  const courseStart = Date.now();

  // Track progress events for counting LLM-related activity
  let progressEvents: Array<{ type: string; message: string; data?: any }> = [];

  const course = await createCourse({
    content,
    apiKey,
    model,
    validateStructure: true,
    validateContent: true,
    retryFailures: true,
    maxRetries: 3,
    onProgress: (type, message, data) => {
      progressEvents.push({ type, message, data });
    },
  });

  const courseTimeMs = Date.now() - courseStart;

  // ── Extract metrics ──
  const moduleMetrics: ModuleMetrics[] = [];
  let totalLessons = 0;
  let firstPassSuccess = 0;
  let fixedLessons = 0;
  let failedLessons = 0;
  let structureFailures = 0;
  let contentFailures = 0;
  let fixAttemptsMade = 0;
  let fixSuccesses = 0;

  for (const mod of course.modules) {
    const lessonMetrics: LessonMetrics[] = [];

    for (const lessonResult of mod.lessons) {
      totalLessons++;

      if (lessonResult.success) {
        const wasFixed = !!(lessonResult.data.fixHistory && lessonResult.data.fixHistory.length > 0);
        const fixAttempts = lessonResult.data.fixHistory?.length ?? 0;

        if (wasFixed) {
          fixedLessons++;
          fixAttemptsMade += fixAttempts;
          fixSuccesses++;
          // Count the original failure type from first history entry
          const originalFailure = lessonResult.data.fixHistory?.[0];
          if (originalFailure?.validationType === "structure") structureFailures++;
          if (originalFailure?.validationType === "content") contentFailures++;
        } else {
          firstPassSuccess++;
        }

        lessonMetrics.push({
          title: lessonResult.data.title,
          questionType: lessonResult.data.questionType,
          success: true,
          wasFixed,
          fixAttempts,
        });
      } else {
        failedLessons++;
        const fixAttempts = lessonResult.error?.fixHistory?.length ?? 0;
        fixAttemptsMade += fixAttempts;

        if (lessonResult.error?.validationType === "structure") structureFailures++;
        if (lessonResult.error?.validationType === "content") contentFailures++;

        lessonMetrics.push({
          title: lessonResult.data?.title || "Unknown",
          questionType: lessonResult.data?.questionType || "unknown",
          success: false,
          wasFixed: false,
          fixAttempts,
          failureType: lessonResult.error?.validationType,
          failureReason: lessonResult.error?.reason,
        });
      }
    }

    moduleMetrics.push({
      title: mod.title,
      lessons: lessonMetrics,
    });
  }

  const courseMetrics: CourseMetrics = {
    timeMs: courseTimeMs,
    modules: moduleMetrics,
    totalLessons,
    firstPassSuccess,
    fixedLessons,
    failedLessons,
    firstPassRate: totalLessons > 0 ? firstPassSuccess / totalLessons : 0,
    finalSuccessRate: totalLessons > 0 ? (firstPassSuccess + fixedLessons) / totalLessons : 0,
  };

  const validationStats: ValidationStats = {
    structureFailures,
    contentFailures,
    fixAttemptsMade,
    fixSuccesses,
  };

  const totalTimeMs = Date.now() - startTime;

  // Print summary line
  console.log(`     Course: ${fmt(courseTimeMs)} — ${totalLessons} lessons`);
  console.log(
    `     Results: ${firstPassSuccess} first-pass ✓, ${fixedLessons} fixed 🔧, ${failedLessons} failed ✗`
  );
  console.log(`     First-pass rate: ${pct(firstPassSuccess, totalLessons)} | Final: ${pct(firstPassSuccess + fixedLessons, totalLessons)}`);
  if (fixAttemptsMade > 0) {
    console.log(`     Fix attempts: ${fixAttemptsMade} (${fixSuccesses} succeeded)`);
  }
  console.log(`     Total: ${fmt(totalTimeMs)}`);

  return {
    pdf: pdfConfig.name,
    pages: pdfConfig.pages,
    model,
    run,
    ocr: ocrMetrics,
    course: courseMetrics,
    validation: validationStats,
    totalTimeMs,
    timestamp: new Date().toISOString(),
  };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { runs, tag } = parseArgs();
  const apiKey = process.env.TOGETHER_API_KEY;

  if (!apiKey) {
    console.error("❌ TOGETHER_API_KEY is required");
    process.exit(1);
  }

  // Verify PDFs exist
  for (const pdf of TEST_PDFS) {
    const path = join(DATA_DIR, pdf.file);
    if (!existsSync(path)) {
      console.error(`❌ PDF not found: ${path}`);
      process.exit(1);
    }
  }

  const model = DEFAULT_MODEL;

  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║  📊 Pipeline Baseline Benchmark                      ║`);
  console.log(`╚══════════════════════════════════════════════════════╝`);
  console.log(`  Tag:    ${tag}`);
  console.log(`  Model:  ${model}`);
  console.log(`  Runs:   ${runs}`);
  console.log(`  PDFs:   ${TEST_PDFS.map((p) => `${p.name} (${p.pages}p)`).join(", ")}`);

  const allResults: PdfBenchmarkResult[] = [];

  for (let run = 1; run <= runs; run++) {
    console.log(`\n${"═".repeat(56)}`);
    console.log(`  Run ${run}/${runs}`);
    console.log(`${"═".repeat(56)}`);

    for (const pdf of TEST_PDFS) {
      try {
        const result = await benchmarkPdf(pdf, model, run, apiKey);
        allResults.push(result);
      } catch (error) {
        console.error(`  ❌ ${pdf.name} failed:`, error instanceof Error ? error.message : error);
        allResults.push({
          pdf: pdf.name,
          pages: pdf.pages,
          model,
          run,
          ocr: { totalPages: 0, successfulPages: 0, failedPages: 0, timeMs: 0, inputTokens: 0, outputTokens: 0, contentLength: 0 },
          course: { timeMs: 0, modules: [], totalLessons: 0, firstPassSuccess: 0, fixedLessons: 0, failedLessons: 0, firstPassRate: 0, finalSuccessRate: 0 },
          validation: { structureFailures: 0, contentFailures: 0, fixAttemptsMade: 0, fixSuccesses: 0 },
          totalTimeMs: 0,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  // ── Compute summary ──
  const successfulResults = allResults.filter((r) => !r.error);
  const n = successfulResults.length || 1;

  const summary = {
    avgTotalTime: successfulResults.reduce((s, r) => s + r.totalTimeMs, 0) / n,
    avgFirstPassRate: successfulResults.reduce((s, r) => s + r.course.firstPassRate, 0) / n,
    avgFinalSuccessRate: successfulResults.reduce((s, r) => s + r.course.finalSuccessRate, 0) / n,
    avgOcrTime: successfulResults.reduce((s, r) => s + r.ocr.timeMs, 0) / n,
    avgCourseTime: successfulResults.reduce((s, r) => s + r.course.timeMs, 0) / n,
    totalFixAttempts: successfulResults.reduce((s, r) => s + r.validation.fixAttemptsMade, 0),
    totalFixSuccesses: successfulResults.reduce((s, r) => s + r.validation.fixSuccesses, 0),
  };

  const report: BenchmarkReport = {
    tag,
    model,
    timestamp: new Date().toISOString(),
    runs,
    results: allResults,
    summary,
  };

  // ── Print summary ──
  console.log(`\n${"═".repeat(56)}`);
  console.log(`\n  📊 Summary (${tag})`);
  console.log(`  ${"─".repeat(40)}`);
  console.log(`  Avg total time:       ${fmt(summary.avgTotalTime)}`);
  console.log(`  Avg OCR time:         ${fmt(summary.avgOcrTime)}`);
  console.log(`  Avg course gen time:  ${fmt(summary.avgCourseTime)}`);
  console.log(`  Avg first-pass rate:  ${(summary.avgFirstPassRate * 100).toFixed(1)}%`);
  console.log(`  Avg final success:    ${(summary.avgFinalSuccessRate * 100).toFixed(1)}%`);
  console.log(`  Total fix attempts:   ${summary.totalFixAttempts}`);
  console.log(`  Total fix successes:  ${summary.totalFixSuccesses}`);

  // Per-PDF breakdown
  console.log(`\n  Per-PDF breakdown:`);
  for (const pdf of TEST_PDFS) {
    const pdfResults = successfulResults.filter((r) => r.pdf === pdf.name);
    if (pdfResults.length === 0) {
      console.log(`    ${pdf.name}: all runs failed`);
      continue;
    }
    const avgTime = pdfResults.reduce((s, r) => s + r.totalTimeMs, 0) / pdfResults.length;
    const avgFirstPass = pdfResults.reduce((s, r) => s + r.course.firstPassRate, 0) / pdfResults.length;
    const avgFinal = pdfResults.reduce((s, r) => s + r.course.finalSuccessRate, 0) / pdfResults.length;
    const avgLessons = pdfResults.reduce((s, r) => s + r.course.totalLessons, 0) / pdfResults.length;
    console.log(
      `    ${pdf.name.padEnd(30)} ${fmt(avgTime).padStart(7)} | ${avgLessons.toFixed(0)} lessons | first-pass ${(avgFirstPass * 100).toFixed(0)}% | final ${(avgFinal * 100).toFixed(0)}%`
    );
  }

  // ── Save report ──
  mkdirSync(BENCHMARK_DIR, { recursive: true });
  const isoTimestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const reportPath = join(BENCHMARK_DIR, `${tag}-${isoTimestamp}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n  💾 Report saved to ${reportPath}\n`);
}

// Suppress noisy library warnings
const origWarn = console.warn;
const origError = console.error;
const suppressPatterns = [
  /Cannot polyfill/,
  /rendering may be broken/,
  /^Warning:/,
];
console.warn = (...args: any[]) => {
  if (typeof args[0] === "string" && suppressPatterns.some((p) => p.test(args[0]))) return;
  origWarn(...args);
};
console.error = (...args: any[]) => {
  if (typeof args[0] === "string" && suppressPatterns.some((p) => p.test(args[0]))) return;
  origError(...args);
};

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
