import type { Metadata } from "next";
import Link from "next/link";
import { WaitlistForm } from "../components/WaitlistForm";

export const metadata: Metadata = { title: "Join Early Access", description: "Help shape Chef Gringo’s hospitality career, education, operations, and entrepreneurship platform." };

export default function EarlyAccessPage() {
  return <div className="page-shell container narrow">
    <p className="breadcrumbs"><Link href="/">Home</Link> / Early Access</p>
    <p className="eyebrow">Foundation Sprint 01</p>
    <h1>Help build the hospitality platform you wish existed.</h1>
    <p className="lede">Join the early-access list to share what would be most useful in your career or operation. This is a waitlist—not a claim that every platform feature is available today.</p>
    <div className="standalone-form"><WaitlistForm /></div>
  </div>;
}
