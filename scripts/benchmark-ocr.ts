#!/usr/bin/env npx tsx

/**
 * OCR Benchmark
 *
 * Compares different text extraction strategies:
 *   1. Current: local pdfjs → images → Together vision model (broken)
 *   2. PyMuPDF direct: fitz.get_text() via child process (no API calls)
 *   3. PyMuPDF + LLM cleanup: extract text then optionally clean with LLM
 *
 * Usage:
 *   tsx scripts/benchmark-ocr.ts [--tag ocr-compare]
 *
 * Results saved to data/benchmarks/<tag>-<timestamp>.json
 */

import { execSync } from "child_process";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { ocr } from "../lib/ocr";

// ── Config ──────────────────────────────────────────────────────────────────

const DATA_DIR = join(process.cwd(), "data");
const BENCHMARK_DIR = join(DATA_DIR, "benchmarks");

const TEST_PDFS = [
  { name: "together-embeddings-blog", file: "together-embeddings-blog.pdf", pages: 8 },
  { name: "attention-is-all-you-need", file: "1706.03762v7.pdf", pages: 15 },
  { name: "claude-code-best-practices", file: "Claude Code Best Practices _ Anthropic.pdf", pages: 24 },
];

// ── Types ───────────────────────────────────────────────────────────────────

interface OcrMethodResult {
  method: string;
  pdf: string;
  pages: number;
  timeMs: number;
  totalChars: number;
  avgCharsPerPage: number;
  emptyPages: number;
  failedPages: number;
  sampleText: string; // First 500 chars for quality check
  error?: string;
}

interface OcrBenchmarkReport {
  tag: string;
  timestamp: string;
  results: OcrMethodResult[];
  comparison: {
    method: string;
    avgTimeMs: number;
    avgCharsPerPage: number;
    totalFailedPages: number;
    quality: string; // "good" | "degraded" | "failed"
  }[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return (ms / 1000).toFixed(1) + "s";
}

function parseArgs() {
  const args = process.argv.slice(2);
  let tag = "ocr-compare";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tag" && args[i + 1]) tag = args[++i];
  }
  return { tag };
}

// ── Method 1: Current vision-model OCR ──────────────────────────────────────

async function benchmarkVisionOcr(
  pdfPath: string,
  pdfName: string,
  pages: number,
  apiKey: string,
): Promise<OcrMethodResult> {
  const start = Date.now();

  try {
    const result = await ocr(pdfPath, {
      apiKey,
      maintainFormat: false,
      concurrency: 5,
      startDelay: 100,
    });

    const content = result.pages.map((p) => p.content).join("\n\n");

    // Detect "I don't see a document" failures
    const failedPages = result.pages.filter(
      (p) => !p.success || p.content.includes("don't see") || p.content.includes("no document"),
    ).length;

    return {
      method: "vision-model",
      pdf: pdfName,
      pages,
      timeMs: Date.now() - start,
      totalChars: content.length,
      avgCharsPerPage: Math.round(content.length / pages),
      emptyPages: result.pages.filter((p) => p.content.trim().length < 50).length,
      failedPages,
      sampleText: content.substring(0, 500),
    };
  } catch (error) {
    return {
      method: "vision-model",
      pdf: pdfName,
      pages,
      timeMs: Date.now() - start,
      totalChars: 0,
      avgCharsPerPage: 0,
      emptyPages: pages,
      failedPages: pages,
      sampleText: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ── Method 2: PyMuPDF direct text extraction ────────────────────────────────

function benchmarkPyMuPdf(
  pdfPath: string,
  pdfName: string,
  pages: number,
): OcrMethodResult {
  const start = Date.now();

  try {
    // Call Python to extract text using PyMuPDF
    const pythonScript = `
import fitz, json, sys
doc = fitz.open(sys.argv[1])
pages = []
for i in range(len(doc)):
    text = doc[i].get_text()
    pages.append({"page": i+1, "text": text, "chars": len(text)})
doc.close()
json.dump(pages, sys.stdout)
`;

    const result = execSync(`python3 -c '${pythonScript}' "${pdfPath}"`, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
    });

    const pageResults: Array<{ page: number; text: string; chars: number }> = JSON.parse(result);
    const content = pageResults.map((p) => p.text).join("\n\n");
    const emptyPages = pageResults.filter((p) => p.chars < 50).length;

    return {
      method: "pymupdf-direct",
      pdf: pdfName,
      pages,
      timeMs: Date.now() - start,
      totalChars: content.length,
      avgCharsPerPage: Math.round(content.length / pages),
      emptyPages,
      failedPages: 0,
      sampleText: content.substring(0, 500),
    };
  } catch (error) {
    return {
      method: "pymupdf-direct",
      pdf: pdfName,
      pages,
      timeMs: Date.now() - start,
      totalChars: 0,
      avgCharsPerPage: 0,
      emptyPages: pages,
      failedPages: pages,
      sampleText: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ── Method 3: PyMuPDF + markdown formatting via Python ──────────────────────

function benchmarkPyMuPdfMarkdown(
  pdfPath: string,
  pdfName: string,
  pages: number,
): OcrMethodResult {
  const start = Date.now();

  try {
    // PyMuPDF4LLM outputs markdown-formatted text
    // Falls back to plain get_text() if pymupdf4llm not installed
    const pythonScript = `
import fitz, json, sys
try:
    import pymupdf4llm
    md = pymupdf4llm.to_markdown(sys.argv[1])
    pages_data = [{"page": 1, "text": md, "chars": len(md)}]
except ImportError:
    # Fallback: use fitz with text extraction that preserves structure
    doc = fitz.open(sys.argv[1])
    pages_data = []
    for i in range(len(doc)):
        text = doc[i].get_text("text")
        pages_data.append({"page": i+1, "text": text, "chars": len(text)})
    doc.close()
json.dump(pages_data, sys.stdout)
`;

    const result = execSync(`python3 -c '${pythonScript}' "${pdfPath}"`, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
    });

    const pageResults: Array<{ page: number; text: string; chars: number }> = JSON.parse(result);
    const content = pageResults.map((p) => p.text).join("\n\n");
    const emptyPages = pageResults.filter((p) => p.chars < 50).length;

    return {
      method: "pymupdf-markdown",
      pdf: pdfName,
      pages,
      timeMs: Date.now() - start,
      totalChars: content.length,
      avgCharsPerPage: Math.round(content.length / pages),
      emptyPages,
      failedPages: 0,
      sampleText: content.substring(0, 500),
    };
  } catch (error) {
    return {
      method: "pymupdf-markdown",
      pdf: pdfName,
      pages,
      timeMs: Date.now() - start,
      totalChars: 0,
      avgCharsPerPage: 0,
      emptyPages: pages,
      failedPages: pages,
      sampleText: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { tag } = parseArgs();
  const apiKey = process.env.TOGETHER_API_KEY || "";

  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║  📊 OCR Method Benchmark                             ║`);
  console.log(`╚══════════════════════════════════════════════════════╝`);
  console.log(`  Tag:     ${tag}`);
  console.log(`  Methods: vision-model, pymupdf-direct, pymupdf-markdown`);
  console.log(`  PDFs:    ${TEST_PDFS.map((p) => `${p.name} (${p.pages}p)`).join(", ")}`);

  // Check pymupdf4llm availability
  try {
    execSync("python3 -c 'import pymupdf4llm'", { encoding: "utf-8" });
    console.log(`  pymupdf4llm: installed`);
  } catch {
    console.log(`  pymupdf4llm: not installed (will fall back to plain text)`);
  }

  const allResults: OcrMethodResult[] = [];

  for (const pdf of TEST_PDFS) {
    const pdfPath = join(DATA_DIR, pdf.file);

    if (!existsSync(pdfPath)) {
      console.error(`  ❌ PDF not found: ${pdfPath}`);
      continue;
    }

    console.log(`\n${"─".repeat(56)}`);
    console.log(`  📄 ${pdf.name} (${pdf.pages} pages)`);
    console.log(`${"─".repeat(56)}`);

    // Method 1: Vision model OCR
    if (apiKey) {
      console.log(`\n  [1] Vision model OCR...`);
      const visionResult = await benchmarkVisionOcr(pdfPath, pdf.name, pdf.pages, apiKey);
      allResults.push(visionResult);
      if (visionResult.error) {
        console.log(`      ❌ Error: ${visionResult.error}`);
      } else {
        const quality = visionResult.failedPages > 0 ? "⚠️  DEGRADED" : "✓";
        console.log(
          `      ${quality} ${fmt(visionResult.timeMs)} | ${visionResult.totalChars.toLocaleString()} chars | ${visionResult.failedPages}/${pdf.pages} failed`,
        );
      }
    } else {
      console.log(`\n  [1] Vision model OCR — SKIPPED (no API key)`);
    }

    // Method 2: PyMuPDF direct
    console.log(`\n  [2] PyMuPDF direct text extraction...`);
    const pymuResult = benchmarkPyMuPdf(pdfPath, pdf.name, pdf.pages);
    allResults.push(pymuResult);
    if (pymuResult.error) {
      console.log(`      ❌ Error: ${pymuResult.error}`);
    } else {
      console.log(
        `      ✓ ${fmt(pymuResult.timeMs)} | ${pymuResult.totalChars.toLocaleString()} chars | ${pymuResult.emptyPages} empty pages`,
      );
    }

    // Method 3: PyMuPDF markdown
    console.log(`\n  [3] PyMuPDF markdown extraction...`);
    const mdResult = benchmarkPyMuPdfMarkdown(pdfPath, pdf.name, pdf.pages);
    allResults.push(mdResult);
    if (mdResult.error) {
      console.log(`      ❌ Error: ${mdResult.error}`);
    } else {
      console.log(
        `      ✓ ${fmt(mdResult.timeMs)} | ${mdResult.totalChars.toLocaleString()} chars | ${mdResult.emptyPages} empty pages`,
      );
    }
  }

  // ── Comparison table ──
  console.log(`\n${"═".repeat(56)}`);
  console.log(`\n  📊 Comparison\n`);

  const methods = ["vision-model", "pymupdf-direct", "pymupdf-markdown"];
  const methodLabels: Record<string, string> = {
    "vision-model": "Vision Model",
    "pymupdf-direct": "PyMuPDF Direct",
    "pymupdf-markdown": "PyMuPDF Markdown",
  };

  // Header
  console.log(
    `  ${"Method".padEnd(20)} ${"Avg Time".padStart(10)} ${"Avg Chars/pg".padStart(14)} ${"Failed pgs".padStart(12)} ${"Quality".padStart(10)}`,
  );
  console.log(`  ${"─".repeat(20)} ${"─".repeat(10)} ${"─".repeat(14)} ${"─".repeat(12)} ${"─".repeat(10)}`);

  const comparison: OcrBenchmarkReport["comparison"] = [];

  for (const method of methods) {
    const results = allResults.filter((r) => r.method === method && !r.error);
    if (results.length === 0) {
      console.log(`  ${methodLabels[method].padEnd(20)} ${"N/A".padStart(10)}`);
      continue;
    }

    const avgTime = results.reduce((s, r) => s + r.timeMs, 0) / results.length;
    const avgChars = results.reduce((s, r) => s + r.avgCharsPerPage, 0) / results.length;
    const totalFailed = results.reduce((s, r) => s + r.failedPages, 0);
    const quality = totalFailed > 0 ? "degraded" : "good";

    comparison.push({
      method,
      avgTimeMs: avgTime,
      avgCharsPerPage: avgChars,
      totalFailedPages: totalFailed,
      quality,
    });

    const qualityIcon = quality === "good" ? "✓" : "⚠️";
    console.log(
      `  ${methodLabels[method].padEnd(20)} ${fmt(avgTime).padStart(10)} ${Math.round(avgChars).toLocaleString().padStart(14)} ${totalFailed.toString().padStart(12)} ${qualityIcon.padStart(10)}`,
    );
  }

  // ── Sample text comparison ──
  console.log(`\n  📝 Sample text comparison (first PDF, first 300 chars):\n`);
  const firstPdf = TEST_PDFS[0].name;
  for (const method of methods) {
    const result = allResults.find((r) => r.method === method && r.pdf === firstPdf);
    if (!result || result.error) continue;
    console.log(`  [${methodLabels[method]}]`);
    console.log(`  ${result.sampleText.substring(0, 300).replace(/\n/g, "\n  ")}`);
    console.log();
  }

  // ── Save report ──
  const report: OcrBenchmarkReport = {
    tag,
    timestamp: new Date().toISOString(),
    results: allResults,
    comparison,
  };

  mkdirSync(BENCHMARK_DIR, { recursive: true });
  const isoTimestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const reportPath = join(BENCHMARK_DIR, `${tag}-${isoTimestamp}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`  💾 Report saved to ${reportPath}\n`);
}

// Suppress noisy warnings
const origWarn = console.warn;
console.warn = (...args: any[]) => {
  if (typeof args[0] === "string" && /Cannot polyfill|rendering may be broken/.test(args[0])) return;
  origWarn(...args);
};

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
