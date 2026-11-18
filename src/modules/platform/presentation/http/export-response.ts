import type { BusinessExport } from "../../infrastructure/business-export";

/** The export as a file download (never cached). */
export function toExportResponse(exported: BusinessExport, requestId: string): Response {
  return new Response(new Blob([exported.data as BlobPart], { type: "application/zip" }), {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${exported.fileName}"`,
      "content-length": String(exported.data.byteLength),
      "cache-control": "no-store",
      "x-request-id": requestId,
    },
  });
}
