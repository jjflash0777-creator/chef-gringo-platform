import Link from "next/link";

export function Notice({ texture = false }: { texture?: boolean }) {
  return (
    <aside className="notice">
      <strong>Kitchen note, not medical advice.</strong>
      <p>
        This is general educational cooking information. Individual needs differ.
        {texture && " Dysphagia and texture changes require individualized evaluation."} Follow guidance from your physician, registered dietitian, speech-language pathologist, or other qualified clinician. <Link href="/medical-and-nutrition-disclaimer">Read the full disclaimer.</Link>
      </p>
    </aside>
  );
}
