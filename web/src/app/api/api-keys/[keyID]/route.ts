import { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/backend-api";

type Params = { params: Promise<{ keyID: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  const { keyID } = await params;

  return proxyBackend(req, `/api-keys/${keyID}`, {
    method: "DELETE",
  });
}
