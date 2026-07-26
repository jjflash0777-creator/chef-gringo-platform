export const interestOptions = [
  "Learning culinary skills",
  "Finding a hospitality career",
  "Advancing into leadership",
  "Operating a professional kitchen",
  "Fine dining and beverage",
  "Coffee and espresso",
  "Food-truck entrepreneurship",
  "Restaurant or hospitality ownership",
  "Senior living or healthcare dining",
  "Equipment and supplier guidance",
];

export function validateWaitlist(input) {
  const errors = {};
  if (!String(input.firstName || "").trim()) errors.firstName = "Enter your first name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.email || ""))) errors.email = "Enter a valid email address.";
  if (!String(input.role || "").trim()) errors.role = "Tell us your current role or interest.";
  if (!interestOptions.includes(input.interest)) errors.interest = "Choose a primary interest area.";
  return errors;
}
