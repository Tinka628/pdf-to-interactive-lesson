/**
 * Image rendering for flow-diagram lessons via google/flash-image-3.1.
 *
 * Feature-flagged via FEATURE_FLOW_IMAGES. flowConfig stays canonical — this
 * module produces an *additional* visual that the client can render in place
 * of ReactFlow. Failures are soft (returns null) so callers always continue;
 * the client falls back to ReactFlow when imageUrl is absent.
 *
 * Content-addressed cache via Vercel Blob: identical flowConfigs across
 * courses reuse the cached image. Image gen is non-deterministic per call
 * (confirmed empirically — see scripts/test-flow-image.ts), so first-write
 * wins on the blob; subsequent identical configs short-circuit via the
 * existence check, saving ~$0.05 and ~15s per cache hit.
 */

import { put, head } from "@vercel/blob";
import { createHash } from "node:crypto";
import type { FlowConfig } from "./types";

const MODEL = "google/flash-image-3.1";
const ENDPOINT = "https://api.together.ai/v1/images/generations";
const WIDTH = 1024;
const HEIGHT = 1024;

/**
 * Stable JSON serialization of a flowConfig. Sorts nodes by id, edges by
 * [source, target] pair. Two configs that differ only in array order hash
 * to the same key.
 */
function canonicalize(flow: FlowConfig): string {
  const nodes = [...flow.nodes].sort((a, b) => a.id.localeCompare(b.id));
  const edges = [...flow.edges].sort((a, b) => {
    const cmp = a[0].localeCompare(b[0]);
    return cmp !== 0 ? cmp : a[1].localeCompare(b[1]);
  });
  return JSON.stringify({
    nodes: nodes.map((n) => ({ id: n.id, label: n.label, type: n.type })),
    edges,
  });
}

/**
 * Prompt template used for flash-image-3.1. Tracer-bullet validated: 10/10
 * semantically correct renders across linear, branching, math-symbol, and
 * 8-node cases (see scripts/test-flow-image.ts).
 */
export function buildFlowImagePrompt(flow: FlowConfig): string {
  const labelById = new Map(flow.nodes.map((n) => [n.id, n.label]));
  const nodeList = flow.nodes
    .map((n, i) => `${i + 1}. "${n.label}"`)
    .join("\n");
  const arrowList = flow.edges
    .map(([s, t]) => `"${labelById.get(s)}" → "${labelById.get(t)}"`)
    .join("\n");

  return `A clean, professional flowchart diagram. Vertical top-to-bottom layout. White background. Each step is a rounded rectangle containing its label, connected by simple dark arrows. Sans-serif text. Textbook infographic style — no decorative elements, no shadows, no gradients.

Use these EXACT labels, spelled precisely as written (do not paraphrase or abbreviate):
${nodeList}

Arrows must connect the boxes in this exact order:
${arrowList}

Every label must be fully visible inside its box. Arrows must point in the direction shown.`;
}

type ImageResponse = {
  data: Array<{ b64_json?: string }>;
};

/**
 * Generates an image for a flowConfig. Returns the public Vercel Blob URL on
 * success, or null on any failure. Never throws — callers can always proceed.
 *
 * Cache-first: identical flowConfigs return the existing blob URL without
 * regenerating or hitting Together.
 */
export async function generateFlowImage({
  flowConfig,
  apiKey,
}: {
  flowConfig: FlowConfig;
  apiKey: string;
}): Promise<string | null> {
  const canonical = canonicalize(flowConfig);
  const key = createHash("sha256").update(canonical).digest("hex");
  const pathname = `flow-images/${key}.png`;
  const shortKey = key.slice(0, 8);

  try {
    const existing = await head(pathname);
    if (existing?.url) {
      console.log(`  ✨ flow-image cache hit (${shortKey})`);
      return existing.url;
    }
  } catch {
    // Cache miss (BlobNotFoundError) or transient head() failure — fall
    // through to generation. If head failed for a real reason (auth, etc.),
    // put() below will surface it and we'll soft-fail to null.
  }

  try {
    const start = Date.now();
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: buildFlowImagePrompt(flowConfig),
        width: WIDTH,
        height: HEIGHT,
        response_format: "base64",
        n: 1,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn(
        `  ⚠️ flow-image gen failed (HTTP ${res.status}) for ${shortKey}: ${body.slice(0, 200)}`
      );
      return null;
    }

    const json = (await res.json()) as ImageResponse;
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) {
      console.warn(`  ⚠️ flow-image gen returned no b64_json for ${shortKey}`);
      return null;
    }

    const pngBytes = Buffer.from(b64, "base64");
    const uploaded = await put(pathname, pngBytes, {
      access: "public",
      addRandomSuffix: false,
      contentType: "image/png",
    });

    const ms = Date.now() - start;
    console.log(
      `  🖼  flow-image generated (${shortKey}, ${(ms / 1000).toFixed(1)}s, ${Math.round(pngBytes.length / 1024)}KB)`
    );

    return uploaded.url;
  } catch (err: any) {
    console.warn(
      `  ⚠️ flow-image gen error for ${shortKey}: ${err?.message ?? err}`
    );
    return null;
  }
}
