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
 * Pick image dimensions based on topology. The diagram renders inside a
 * landscape-ish container (h-[360px] sm:h-[500px]) so we bias toward shapes
 * that fill it well rather than always returning 1024×1024.
 *
 * Together's flash-image-3.1 only accepts a fixed enum of (width, height)
 * pairs — see the API error response for the full list. The dimensions below
 * are picked from that list to match ~3:2 landscape and ~2:3 portrait while
 * keeping cost similar to 1024×1024 (~1 MP each).
 *
 * - High fanout (any node with ≥3 outgoing edges) → landscape 1264×848:
 *   gives parallel branches horizontal room without forcing the model to
 *   stack them vertically.
 * - Tall flow (≥6 nodes and no wide fanout) → portrait 848×1264: keeps
 *   labels readable in a single column rather than cramming many nodes into
 *   a square.
 * - Default → square 1024×1024.
 */
export function pickDimensions(flow: FlowConfig): {
  width: number;
  height: number;
} {
  const outDegree = new Map<string, number>();
  for (const [src] of flow.edges) {
    outDegree.set(src, (outDegree.get(src) ?? 0) + 1);
  }
  const maxOutDegree = Math.max(0, ...outDegree.values());

  if (maxOutDegree >= 3) return { width: 1264, height: 848 };
  if (flow.nodes.length >= 6 && maxOutDegree <= 2) {
    return { width: 848, height: 1264 };
  }
  return { width: 1024, height: 1024 };
}

/**
 * Prompt template used for flash-image-3.1.
 *
 * Structure: counts up front → clean label list → clean arrow list → style
 * rules → fidelity firewall. Labels are kept separate from styling info
 * (rather than inline per node) because mixing the two caused the model to
 * confuse style attributes for label content and hallucinate extra boxes.
 *
 * Aims for the look-and-feel of a modern educational SaaS interface — Fustat-
 * adjacent geometric sans, pastel state colors matching the app's design
 * tokens, uniform geometry, crisp arrows, generous whitespace.
 */
export function buildFlowImagePrompt(flow: FlowConfig): string {
  const labelById = new Map(flow.nodes.map((n) => [n.id, n.label]));
  const nodeCount = flow.nodes.length;
  const edgeCount = flow.edges.length;

  const nodeLines = flow.nodes
    .map((n, i) => `${i + 1}. "${n.label}" (${n.type})`)
    .join("\n");

  const arrowList = flow.edges
    .map(([s, t]) => `"${labelById.get(s)}" → "${labelById.get(t)}"`)
    .join("\n");

  return `Render a flowchart with EXACTLY ${nodeCount} boxes and EXACTLY ${edgeCount} arrows. No extra boxes. No extra arrows. No duplicate boxes. No renamed labels.

BOXES — use these EXACT labels in this order, spelled precisely as written (do NOT paraphrase, abbreviate, or reword):
${nodeLines}

ARROWS — connect boxes in exactly these directions (no extra, no missing):
${arrowList}

VISUAL STYLE — minimal modern educational SaaS (Linear, Notion, Vercel docs):
- Background: pure white (#ffffff). 80px safe margin on all four sides. Generous whitespace.
- Typography: Fustat — a geometric humanist sans-serif similar to DM Sans, Inter, or Geist Sans. Medium weight (500), color #171717, slightly tight letter-spacing.
- Boxes: rounded rectangles, 12px corner radius, 1.5px solid stroke. ALL boxes the same width and height — choose one size that fits the longest label with 24px internal padding and use it for every box.
- Box colors by type (light pastel — subtle, never saturated):
  • start → fill #fdf2f8, border #fbcfe8 (soft pink)
  • process → fill #eff6ff, border #bfdbfe (soft blue)
  • output → fill #dcfce7, border #86efac (soft green)
- Arrows: solid 1.5px stroke in #525252 gray, single sharp tapered arrowhead, perpendicular routing only (vertical and horizontal segments, no diagonals). Arrows never cross over a box.
- Layout: top-to-bottom. Sibling branches sit side-by-side at the same vertical level. Center the diagram horizontally. At least 80px between rows, 48px between sibling boxes.
- No drop shadows. No gradients. No icons inside boxes. No background patterns. No decorative flourishes.

FIDELITY CHECK: the final image contains exactly ${nodeCount} boxes (each with its precise label) and exactly ${edgeCount} arrows in the directions specified. Do not invent extra boxes, do not duplicate any box, do not add any arrow that isn't in the list above.`;
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
    const { width, height } = pickDimensions(flowConfig);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: buildFlowImagePrompt(flowConfig),
        width,
        height,
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
      `  🖼  flow-image generated (${shortKey}, ${width}x${height}, ${(ms / 1000).toFixed(1)}s, ${Math.round(pngBytes.length / 1024)}KB)`
    );

    return uploaded.url;
  } catch (err: any) {
    console.warn(
      `  ⚠️ flow-image gen error for ${shortKey}: ${err?.message ?? err}`
    );
    return null;
  }
}
