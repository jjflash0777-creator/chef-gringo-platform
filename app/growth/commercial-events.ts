export const COMMERCIAL_EVENT_NAMES = ["page_view","content_view","marketplace_view","recommendation_view","merchant_click","affiliate_click","email_signup","lead","sale","commission_pending","commission_approved","commission_paid"] as const;
export type CommercialEventName = typeof COMMERCIAL_EVENT_NAMES[number];
export function isCommercialEventName(value:string):value is CommercialEventName{return COMMERCIAL_EVENT_NAMES.includes(value as CommercialEventName);}
