/**
 * Tracer bullets for flash-image-3.1 flowchart rendering.
 *
 * Bullet 1 (done): linear flowConfigs, including math-heavy adversarial case.
 * Bullet 2 (this run): branching topologies, 8-node case, determinism check.
 *
 * Usage:
 *   TOGETHER_API_KEY=... bun scripts/test-flow-image.ts            # branching + determinism only (cheap re-run)
 *   TOGETHER_API_KEY=... bun scripts/test-flow-image.ts --all      # include linear baselines too
 *
 * Output: data/image-experiments/<timestamp>/<NNN-slug>/{flow.json, prompt.txt, output[-N].png, meta.json}
 *         plus data/image-experiments/<timestamp>/summary.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { buildFlowImagePrompt, pickDimensions } from "../lib/generate-flow-image";

const apiKey = process.env.TOGETHER_API_KEY;
if (!apiKey) {
  console.error("TOGETHER_API_KEY is required");
  process.exit(1);
}

const MODEL = "google/flash-image-3.1";
const ENDPOINT = "https://api.together.ai/v1/images/generations";

type FlowNode = { id: string; label: string; type: "start" | "process" | "output" };
type FlowEdge = [string, string];
type FlowConfig = { nodes: FlowNode[]; edges: FlowEdge[] };

type TestCase = {
  slug: string;
  description: string;
  flow: FlowConfig;
  repeats?: number;
};

// Bullet 1 baselines — already validated 4/4 perfect. Re-run only with --all.
const LINEAR_CASES: TestCase[] = [
  {
    slug: "photosynthesis-simple",
    description: "Simple natural-language process — baseline, should be easy.",
    flow: {
      nodes: [
        { id: "step-1", label: "Light Capture", type: "start" },
        { id: "step-2", label: "Electron Excitation", type: "process" },
        { id: "step-3", label: "Water Splitting", type: "process" },
        { id: "step-4", label: "Electron Transport", type: "process" },
        { id: "step-5", label: "Glucose", type: "output" },
      ],
      edges: [
        ["step-1", "step-2"],
        ["step-2", "step-3"],
        ["step-3", "step-4"],
        ["step-4", "step-5"],
      ],
    },
  },
  {
    slug: "complexity-symbols",
    description: "Adversarial: math symbols, superscripts, non-breaking spaces.",
    flow: {
      nodes: [
        { id: "step-1", label: "Start Comparison", type: "start" },
        { id: "step-2", label: "Self-Attention O(n²·d)", type: "process" },
        { id: "step-3", label: "Recurrent O(n·d²)", type: "process" },
        { id: "step-4", label: "Convolutional O(k·n·d²)", type: "process" },
        { id: "step-5", label: "Complexity Ordering", type: "output" },
      ],
      edges: [
        ["step-1", "step-2"],
        ["step-2", "step-3"],
        ["step-3", "step-4"],
        ["step-4", "step-5"],
      ],
    },
  },
  {
    slug: "decoder-self-attention",
    description: "7 nodes, ML jargon — typical case from transformer course.",
    flow: {
      nodes: [
        { id: "step-1", label: "Decoder input", type: "start" },
        { id: "step-2", label: "Mask creation", type: "process" },
        { id: "step-3", label: "Scaled dot-product", type: "process" },
        { id: "step-4", label: "Softmax", type: "process" },
        { id: "step-5", label: "Weighted sum", type: "process" },
        { id: "step-6", label: "Add & Norm", type: "process" },
        { id: "step-7", label: "Self-attention output", type: "output" },
      ],
      edges: [
        ["step-1", "step-2"],
        ["step-2", "step-3"],
        ["step-3", "step-4"],
        ["step-4", "step-5"],
        ["step-5", "step-6"],
        ["step-6", "step-7"],
      ],
    },
  },
  {
    slug: "attention-viz",
    description: "5 nodes, moderate technical labels.",
    flow: {
      nodes: [
        { id: "step-1", label: "Extract attention matrix", type: "start" },
        { id: "step-2", label: "Select head", type: "process" },
        { id: "step-3", label: "Map scores to colors", type: "process" },
        { id: "step-4", label: "Render dependency lines", type: "process" },
        { id: "step-5", label: "Attention visualization", type: "output" },
      ],
      edges: [
        ["step-1", "step-2"],
        ["step-2", "step-3"],
        ["step-3", "step-4"],
        ["step-4", "step-5"],
      ],
    },
  },
];

// Bullet 2 — branching topologies, 8-node case, and determinism check.
const BRANCHING_CASES: TestCase[] = [
  {
    slug: "branching-diamond",
    description: "Diamond branching — decision node with two paths that converge.",
    flow: {
      nodes: [
        { id: "step-1", label: "Receive request", type: "start" },
        { id: "step-2", label: "Validate input", type: "process" },
        { id: "step-3", label: "Process valid", type: "process" },
        { id: "step-4", label: "Return error", type: "process" },
        { id: "step-5", label: "Send response", type: "output" },
      ],
      edges: [
        ["step-1", "step-2"],
        ["step-2", "step-3"],
        ["step-2", "step-4"],
        ["step-3", "step-5"],
        ["step-4", "step-5"],
      ],
    },
  },
  {
    slug: "branching-fanout",
    description: "Multi-output fanout — one node with three terminal branches, no convergence.",
    flow: {
      nodes: [
        { id: "step-1", label: "Compile code", type: "start" },
        { id: "step-2", label: "Run tests", type: "process" },
        { id: "step-3", label: "Deploy to prod", type: "output" },
        { id: "step-4", label: "Notify team", type: "output" },
        { id: "step-5", label: "Update changelog", type: "output" },
      ],
      edges: [
        ["step-1", "step-2"],
        ["step-2", "step-3"],
        ["step-2", "step-4"],
        ["step-2", "step-5"],
      ],
    },
  },
  {
    slug: "eight-node-branching",
    description: "Max size (8 nodes) with branching — auth flow with MFA decision.",
    flow: {
      nodes: [
        { id: "step-1", label: "User logs in", type: "start" },
        { id: "step-2", label: "Auth server check", type: "process" },
        { id: "step-3", label: "MFA required?", type: "process" },
        { id: "step-4", label: "Send code", type: "process" },
        { id: "step-5", label: "Verify code", type: "process" },
        { id: "step-6", label: "Skip MFA", type: "process" },
        { id: "step-7", label: "Issue token", type: "process" },
        { id: "step-8", label: "Grant access", type: "output" },
      ],
      edges: [
        ["step-1", "step-2"],
        ["step-2", "step-3"],
        ["step-3", "step-4"],
        ["step-4", "step-5"],
        ["step-5", "step-7"],
        ["step-3", "step-6"],
        ["step-6", "step-7"],
        ["step-7", "step-8"],
      ],
    },
  },
  {
    slug: "determinism-photosynthesis",
    description: "Determinism check — run identical flowConfig 3× and compare hashes.",
    repeats: 3,
    flow: {
      nodes: [
        { id: "step-1", label: "Light Capture", type: "start" },
        { id: "step-2", label: "Electron Excitation", type: "process" },
        { id: "step-3", label: "Water Splitting", type: "process" },
        { id: "step-4", label: "Electron Transport", type: "process" },
        { id: "step-5", label: "Glucose", type: "output" },
      ],
      edges: [
        ["step-1", "step-2"],
        ["step-2", "step-3"],
        ["step-3", "step-4"],
        ["step-4", "step-5"],
      ],
    },
  },
];

const CASES: TestCase[] = process.argv.includes("--all")
  ? [...LINEAR_CASES, ...BRANCHING_CASES]
  : BRANCHING_CASES;

// Prompt template lives in lib/generate-flow-image so the production path
// and this tracer-bullet script stay in sync. See buildFlowImagePrompt.

type ImageResponse = {
  data: Array<{ b64_json?: string; url?: string }>;
};

async function generateImage(
  prompt: string,
  width: number,
  height: number
): Promise<{
  pngBytes: Buffer;
  durationMs: number;
}> {
  const start = Date.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      width,
      height,
      response_format: "base64",
      n: 1,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Together API ${res.status}: ${body}`);
  }

  const json = (await res.json()) as ImageResponse;
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error(`No b64_json in response: ${JSON.stringify(json).slice(0, 500)}`);
  }

  return {
    pngBytes: Buffer.from(b64, "base64"),
    durationMs: Date.now() - start,
  };
}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

type RunResult = {
  slug: string;
  run?: number;
  description: string;
  nodeCount: number;
  edgeCount: number;
  width: number;
  height: number;
  durationMs: number;
  sizeBytes: number;
  hash?: string;
  error?: string;
};

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = join(
    process.cwd(),
    "data",
    "image-experiments",
    timestamp
  );
  mkdirSync(outDir, { recursive: true });

  console.log(`📁 Output: ${outDir}`);
  console.log(`🎨 Model: ${MODEL}`);
  console.log(`📐 Dimensions: per-topology (via pickDimensions)`);
  console.log(`🧪 Cases: ${CASES.length} (${CASES.reduce((s, c) => s + (c.repeats ?? 1), 0)} total generations)\n`);

  const results: RunResult[] = [];

  for (const [i, testCase] of CASES.entries()) {
    const caseDir = join(outDir, `${String(i + 1).padStart(3, "0")}-${testCase.slug}`);
    mkdirSync(caseDir, { recursive: true });

    const prompt = buildFlowImagePrompt(testCase.flow);
    const { width, height } = pickDimensions(testCase.flow);
    writeFileSync(join(caseDir, "flow.json"), JSON.stringify(testCase.flow, null, 2));
    writeFileSync(join(caseDir, "prompt.txt"), prompt);

    const repeats = testCase.repeats ?? 1;
    const repeatLabel = repeats > 1 ? ` (×${repeats})` : "";
    console.log(`[${i + 1}/${CASES.length}] ${testCase.slug}${repeatLabel} (${width}×${height}) — ${testCase.description}`);

    const runMetas: Array<{ run: number; durationMs: number; sizeBytes: number; hash: string }> = [];

    for (let run = 1; run <= repeats; run++) {
      try {
        const { pngBytes, durationMs } = await generateImage(prompt, width, height);
        const filename = repeats > 1 ? `output-${run}.png` : "output.png";
        writeFileSync(join(caseDir, filename), pngBytes);

        const hash = sha256(pngBytes);
        runMetas.push({ run, durationMs, sizeBytes: pngBytes.length, hash });

        results.push({
          slug: testCase.slug,
          run: repeats > 1 ? run : undefined,
          description: testCase.description,
          nodeCount: testCase.flow.nodes.length,
          edgeCount: testCase.flow.edges.length,
          width,
          height,
          durationMs,
          sizeBytes: pngBytes.length,
          hash,
        });

        const runLabel = repeats > 1 ? `[run ${run}] ` : "";
        console.log(`    ✅ ${runLabel}${(durationMs / 1000).toFixed(1)}s, ${Math.round(pngBytes.length / 1024)} KB, sha=${hash.slice(0, 8)}`);
      } catch (err: any) {
        console.log(`    ❌ ${repeats > 1 ? `[run ${run}] ` : ""}${err.message}`);
        results.push({
          slug: testCase.slug,
          run: repeats > 1 ? run : undefined,
          description: testCase.description,
          nodeCount: testCase.flow.nodes.length,
          edgeCount: testCase.flow.edges.length,
          width,
          height,
          durationMs: 0,
          sizeBytes: 0,
          error: err.message,
        });
      }
    }

    // For repeated cases, surface whether the bytes were identical.
    if (repeats > 1 && runMetas.length === repeats) {
      const allSame = runMetas.every((m) => m.hash === runMetas[0].hash);
      console.log(`    📊 Determinism: ${allSame ? "IDENTICAL bytes across all runs" : "DIFFERENT bytes (non-deterministic without seed)"}`);
    }

    const { width: caseW, height: caseH } = pickDimensions(testCase.flow);
    const meta = {
      slug: testCase.slug,
      description: testCase.description,
      model: MODEL,
      width: caseW,
      height: caseH,
      nodeCount: testCase.flow.nodes.length,
      edgeCount: testCase.flow.edges.length,
      runs: runMetas,
    };
    writeFileSync(join(caseDir, "meta.json"), JSON.stringify(meta, null, 2));
  }

  writeFileSync(
    join(outDir, "summary.json"),
    JSON.stringify({ timestamp, model: MODEL, results }, null, 2)
  );

  console.log("\n" + "─".repeat(60));
  console.log("Summary");
  console.log("─".repeat(60));
  const succeeded = results.filter((r) => !r.error).length;
  const totalSec = results.reduce((s, r) => s + r.durationMs, 0) / 1000;
  console.log(`Succeeded:  ${succeeded}/${results.length}`);
  console.log(`Total time: ${totalSec.toFixed(1)}s`);
  console.log(`Avg time:   ${(totalSec / Math.max(1, succeeded)).toFixed(1)}s per image`);
  const totalMp = results
    .filter((r) => !r.error)
    .reduce((s, r) => s + (r.width * r.height) / 1_000_000, 0);
  console.log(`Est. cost:  $${(totalMp * 0.05).toFixed(3)} (${totalMp.toFixed(2)} MP total × $0.05)`);
  console.log("\nOpen the PNGs in:");
  console.log(`  ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
