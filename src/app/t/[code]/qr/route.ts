import { NextResponse } from "next/server";
import { qrSvg } from "@/lib/qr";
import { normalizeTagCode } from "@/lib/tag-code";
import { tagUrl } from "@/config/brand";

/**
 * QR image for a tag — the same URL the NFC chip carries, so a customer whose
 * phone can't read NFC has a way in. NFC stays the primary experience.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = normalizeTagCode(rawCode);

  if (!code) {
    return NextResponse.json({ error: "Unknown tag." }, { status: 404 });
  }

  // ?s=qr lets the dashboard tell scans apart from taps.
  const svg = qrSvg(`${tagUrl(code)}?s=qr`);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
