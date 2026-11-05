import { NewsletterForm } from "./NewsletterForm";

export function FieldNotesCapture({ heading, copy, bare = false }: { heading: string; copy: string; bare?: boolean }) {
  const Tag = bare ? "div" : "section";
  return (
    <Tag className="signup-panel">
      <div>
        <p className="eyebrow light">Field Notes</p>
        <h2>{heading}</h2>
        <p>{copy}</p>
      </div>
      <NewsletterForm source="field-notes" buttonLabel="Join Field Notes" />
    </Tag>
  );
}
