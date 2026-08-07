# Marketplace folder structure

```text
app/
  marketplace/
    components/             reusable public recommendation components
    data.ts                 representative content for the first visual surface
    page.tsx                problem-led Marketplace landing page
  admin/marketplace/
    ProductWorkspace.tsx    no-code product and editorial workflow
    page.tsx                protected admin entry point
  api/marketplace/products/
    route.ts                canonical product list/create boundary
    [id]/route.ts           editorial state transitions
db/
  index.ts                  D1 database helper
  schema.ts                 canonical knowledge-graph schema
drizzle/
  *.sql                     deployment migrations
docs/marketplace/
  ARCHITECTURE.md           system design and extension path
  PRODUCT_WORKFLOW.md       operational product lifecycle
  FOLDER_STRUCTURE.md       implementation map
```

Public editorial routes should live under `app/marketplace`. Internal workflows stay under `app/admin/marketplace`. All durable writes cross authenticated API routes and use the schema in `db/schema.ts`.
