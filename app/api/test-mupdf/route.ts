import { NextRequest, NextResponse } from "next/server";
import * as mupdf from "mupdf";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const doc = mupdf.Document.openDocument(buffer, "application/pdf");
    const pageCount = doc.countPages();

    const pages: Array<{ page: number; chars: number; preview: string }> = [];
    let totalChars = 0;

    for (let i = 0; i < pageCount; i++) {
      const page = doc.loadPage(i);
      const text = page.toStructuredText("preserve-whitespace").asText();
      totalChars += text.length;
      pages.push({
        page: i + 1,
        chars: text.length,
        preview: text.substring(0, 200),
      });
    }

    return NextResponse.json({
      success: true,
      pageCount,
      totalChars,
      avgCharsPerPage: Math.round(totalChars / pageCount),
      pages,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
