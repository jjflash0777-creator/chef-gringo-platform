import "server-only";
import { bufferPublishingConfigured } from "../../lib/buffer-api.ts";

export function socialPublishingAvailable() {
  return bufferPublishingConfigured();
}
