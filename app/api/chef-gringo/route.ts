import { handleChefGringoPost } from "../../lib/ai/chef-gringo-http.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleChefGringoPost(request);
}
