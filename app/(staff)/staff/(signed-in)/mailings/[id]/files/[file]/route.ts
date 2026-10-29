import { NextResponse } from "next/server";
import { attachmentFile } from "@/lib/server/mailing-drafts";
import { requireStaff } from "@/lib/server/staff-auth";
import { mailingId } from "@/lib/staff-search";

/** One of a mailing's files, to open in the browser or picture as a thumbnail. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; file: string }> }) {
  await requireStaff();
  const { id, file } = await params;
  const mailing = mailingId(id);
  const attachment = mailing && mailingId(file) ? await attachmentFile(mailing, mailingId(file)!) : undefined;
  if (!attachment) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(attachment.content), {
    headers: {
      "Content-Type": attachment.contentType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
