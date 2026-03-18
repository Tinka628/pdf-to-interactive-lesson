#!/usr/bin/env npx tsx

/**
 * Smoke test: Compare TS PDF text extraction libraries
 * Tests: pdf-parse, mupdf (WASM), unpdf
 */

import { readFileSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const TEST_PDFS = [
  { name: "embeddings-blog", file: "together-embeddings-blog.pdf", pages: 8 },
  { name: "attention", file: "1706.03762v7.pdf", pages: 15 },
  { name: "claude-code", file: "Claude Code Best Practices _ Anthropic.pdf", pages: 24 },
];

// ── Helpers ──

function fmt(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return (ms / 1000).toFixed(1) + "s";
}

function preview(text: string, len = 200): string {
  return text.substring(0, len).replace(/\n+/g, " ").trim();
}

// ── Test: pdf-parse ──

async function testPdfParse(pdfPath: string): Promise<{ chars: number; pages: number; text: string; timeMs: number }> {
  const pdfParse = (await import("pdf-parse")).default;
  const buffer = readFileSync(pdfPath);
  const start = Date.now();
  const result = await pdfParse(buffer);
  return {
    chars: result.text.length,
    pages: result.numpages,
    text: result.text,
    timeMs: Date.now() - start,
  };
}

// ── Test: mupdf (WASM) ──

async function testMupdf(pdfPath: string): Promise<{ chars: number; pages: number; text: string; timeMs: number }> {
  const mupdf = await import("mupdf");
  const buffer = readFileSync(pdfPath);
  const start = Date.now();

  const doc = mupdf.Document.openDocument(buffer, "application/pdf");
  let fullText = "";
  const pageCount = doc.countPages();

  for (let i = 0; i < pageCount; i++) {
    const page = doc.loadPage(i);
    const text = page.toStructuredText("preserve-whitespace").asText();
    fullText += text + "\n\n";
  }

  return {
    chars: fullText.length,
    pages: pageCount,
    text: fullText,
    timeMs: Date.now() - start,
  };
}

// ── Test: unpdf ──

async function testUnpdf(pdfPath: string): Promise<{ chars: number; pages: number; text: string; timeMs: number }> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const buffer = readFileSync(pdfPath);
  const start = Date.now();
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  return {
    chars: text.length,
    pages: totalPages,
    text,
    timeMs: Date.now() - start,
  };
}

// ── Main ──

async function main() {
  console.log(`\n  📊 PDF Text Extraction — TS Library Smoke Test\n`);
  console.log(`  ${"Library".padEnd(18)} ${"PDF".padEnd(16)} ${"Time".padStart(8)} ${"Chars".padStart(10)} ${"Chars/pg".padStart(10)} ${"Sample"}`);
  console.log(`  ${"─".repeat(18)} ${"─".repeat(16)} ${"─".repeat(8)} ${"─".repeat(10)} ${"─".repeat(10)} ${"─".repeat(40)}`);

  const libs = [
    { name: "pdf-parse", fn: testPdfParse },
    { name: "mupdf (WASM)", fn: testMupdf },
    { name: "unpdf", fn: testUnpdf },
  ];

  for (const lib of libs) {
    for (const pdf of TEST_PDFS) {
      const pdfPath = join(DATA_DIR, pdf.file);
      try {
        const result = await lib.fn(pdfPath);
        const charsPerPage = Math.round(result.chars / result.pages);
        const sample = preview(result.text, 60);
        console.log(
          `  ${lib.name.padEnd(18)} ${pdf.name.padEnd(16)} ${fmt(result.timeMs).padStart(8)} ${result.chars.toLocaleString().padStart(10)} ${charsPerPage.toLocaleString().padStart(10)} ${sample}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message.substring(0, 60) : String(err);
        console.log(
          `  ${lib.name.padEnd(18)} ${pdf.name.padEnd(16)} ${"ERR".padStart(8)} ${"—".padStart(10)} ${"—".padStart(10)} ${msg}`,
        );
      }
    }
    console.log();
  }
}

main().catch(console.error);
