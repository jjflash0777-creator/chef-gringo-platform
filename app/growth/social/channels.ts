export const SOCIAL_CHANNELS = ["facebook", "instagram", "pinterest", "tiktok"] as const;
export type SocialChannel = typeof SOCIAL_CHANNELS[number];

export const SOCIAL_UTM_MEDIUM = "social";
export const CHEF_GRINGO_CANONICAL_ORIGIN = "https://chefgringo.com";
export const CHEF_GRINGO_OWNED_HOSTS = new Set(["chefgringo.com", "www.chefgringo.com"]);

export function isSocialChannel(value: string): value is SocialChannel {
  return (SOCIAL_CHANNELS as readonly string[]).includes(value);
}

export function assertSocialChannel(value: string): SocialChannel {
  if (!isSocialChannel(value)) throw new Error("Social destination channels are facebook, instagram, pinterest, or tiktok.");
  return value;
}
