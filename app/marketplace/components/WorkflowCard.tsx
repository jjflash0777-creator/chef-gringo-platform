import { ContextPill } from "./ContextPill";

export function WorkflowCard({
  title,
  description,
  context,
}: {
  title: string;
  description: string;
  context: string;
}) {
  return (
    <article className="workflow-card">
      <ContextPill>{context}</ContextPill>
      <h3>{title}</h3>
      <p>{description}</p>
      <span className="workflow-link">Explore this workflow →</span>
    </article>
  );
}
