export function socialPublishingAvailable() {
  return Boolean(process.env.BUFFER_API_KEY?.trim());
}
