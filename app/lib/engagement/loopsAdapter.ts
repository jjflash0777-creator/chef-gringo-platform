export const LOOPS_CONTACTS_UPDATE_ENDPOINT = "https://app.loops.so/api/v1/contacts/update";
export const LOOPS_EVENTS_SEND_ENDPOINT = "https://app.loops.so/api/v1/events/send";
export const NEWSLETTER_SIGNUP_EVENT = "newsLetterSignup";
export const EARLY_ACCESS_SOURCE = "chef-gringo-foundation-sprint-01";
export const LOOPS_PROVIDER_METHOD = "PUT";

export type WaitlistContactInput = {
  firstName: string;
  email: string;
  role: string;
  interest: string;
  policyVersion: string;
};

export type LoopsContactPayload = {
  email: string;
  firstName: string;
  subscribed: true;
  source: string;
  role: string;
  interest: string;
  consentMarketing: true;
  policyVersion: string;
};

export type NewsletterContactInput = {
  email: string;
  source: string;
  policyVersion: string;
  commercialProfile?: { intentKind: string; workflowId: string; confidence: string } | null;
  attribution?: { source?: string | null; medium?: string | null; campaignId?: string | null; landingPage?: string | null } | null;
};

export type LoopsNewsletterPayload = {
  email: string;
  subscribed: true;
  source: string;
  consentMarketing: true;
  policyVersion: string;
  commercialIntent?: string;
  commercialWorkflow?: string;
  intentConfidence?: string;
  acquisitionSource?: string;
  acquisitionMedium?: string;
  acquisitionCampaign?: string;
  acquisitionLandingPage?: string;
};

export type LoopsNewsletterEventPayload = {
  email: string;
  eventName: typeof NEWSLETTER_SIGNUP_EVENT;
  eventProperties: {
    source: string;
    policyVersion: string;
    commercialIntent?: string;
    commercialWorkflow?: string;
    intentConfidence?: string;
    acquisitionSource?: string;
    acquisitionMedium?: string;
    acquisitionCampaign?: string;
    acquisitionLandingPage?: string;
  };
};

export function isAllowedEarlyAccessEndpoint(endpoint: string): boolean {
  try {
    const { protocol } = new URL(endpoint);
    if (protocol !== "https:") return false;
    if (process.env.NODE_ENV === "production") {
      return endpoint === LOOPS_CONTACTS_UPDATE_ENDPOINT;
    }
    return true;
  } catch {
    return false;
  }
}

export function toLoopsContact(input: WaitlistContactInput): LoopsContactPayload {
  return {
    email: input.email.trim().toLowerCase(),
    firstName: input.firstName.trim(),
    subscribed: true,
    source: EARLY_ACCESS_SOURCE,
    role: input.role.trim(),
    interest: input.interest,
    consentMarketing: true,
    policyVersion: input.policyVersion,
  };
}

export function toLoopsNewsletterContact(input: NewsletterContactInput): LoopsNewsletterPayload {
  const source = String(input.source || "").trim() || "newsletter";
  return {
    email: input.email.trim().toLowerCase(),
    subscribed: true,
    source,
    consentMarketing: true,
    policyVersion: input.policyVersion,
    ...(input.commercialProfile ? {
      commercialIntent: input.commercialProfile.intentKind,
      commercialWorkflow: input.commercialProfile.workflowId,
      intentConfidence: input.commercialProfile.confidence,
    } : {}),
    ...(input.attribution?.source ? { acquisitionSource: input.attribution.source } : {}),
    ...(input.attribution?.medium ? { acquisitionMedium: input.attribution.medium } : {}),
    ...(input.attribution?.campaignId ? { acquisitionCampaign: input.attribution.campaignId } : {}),
    ...(input.attribution?.landingPage ? { acquisitionLandingPage: input.attribution.landingPage } : {}),
  };
}

export function toLoopsNewsletterSignupEvent(input: NewsletterContactInput): LoopsNewsletterEventPayload {
  const source = String(input.source || "").trim() || "newsletter";
  return {
    email: input.email.trim().toLowerCase(),
    eventName: NEWSLETTER_SIGNUP_EVENT,
    eventProperties: {
      source,
      policyVersion: input.policyVersion,
      ...(input.commercialProfile ? { commercialIntent: input.commercialProfile.intentKind, commercialWorkflow: input.commercialProfile.workflowId, intentConfidence: input.commercialProfile.confidence } : {}),
      ...(input.attribution?.source ? { acquisitionSource: input.attribution.source } : {}),
      ...(input.attribution?.medium ? { acquisitionMedium: input.attribution.medium } : {}),
      ...(input.attribution?.campaignId ? { acquisitionCampaign: input.attribution.campaignId } : {}),
      ...(input.attribution?.landingPage ? { acquisitionLandingPage: input.attribution.landingPage } : {}),
    },
  };
}
