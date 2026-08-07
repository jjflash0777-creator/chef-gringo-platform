import { ContextPill } from "./ContextPill";

export function WorkflowCard({ id, title, description, context, count }: { id: string; title: string; description: string; context: string; count: number }) {
  return (
    <a className="workflow-card" href={`#${id}`}>
      <ContextPill>{context}</ContextPill>
      <h3>{title}</h3>
      <p>{description}</p>
      <span className="workflow-link">Compare {count} researched products →</span>
    </a>
  );
}
