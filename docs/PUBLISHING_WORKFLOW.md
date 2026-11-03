# Chef Gringo Editorial → Social Publishing Workflow

**Canonical operating workflow — 2026-11-03**

GitHub is the source of truth for application code and version-controlled production editorial assets. OpenAI Sites is the deployment control plane. D1 is the durable application database. Buffer is a replaceable publishing transport behind Chef Gringo approval rules.

## Completion pipeline

1. **Research**
   - Verify claims and sources.
   - Keep evidence limits explicit.
2. **Article**
   - Draft and review the owned destination.
3. **Final production images**
   - Generate or create final PNG/JPEG assets.
   - Chat-only/temporary images do not count.
4. **Source control**
   - Store editorial assets under a stable path such as `public/images/editorial/<slug>/`.
   - Commit the exact files the article will use.
5. **Article wiring**
   - Page metadata, hero, inline media, alt text, Learn/home discovery, and sitemap use the committed assets/routes.
6. **CI**
   - Lint, typecheck, production build, full tests, and release validation must pass.
7. **Merge**
   - Merge reviewed source to `main`.
8. **Deploy**
   - Explicitly create/deploy a new version in production Sites project `appgprj_6a88d56167a08191bb0c358e41fd62f6`.
   - Never use the legacy MVP project.
9. **Live verification**
   - Article returns 200.
   - Every production media URL returns an image response.
   - Confirm expected metadata/OG image.
10. **Growth Queue**
   - Save channel variants and the exact production asset IDs.
   - Evidence/approval gates remain authoritative.
11. **Buffer scheduling**
   - Buffer transport can schedule only approved variants.
   - It uses the saved variant copy and saved Chef Gringo production media URLs.
   - Multi-image order is preserved for supported channels.
12. **Queue confirmation**
   - Re-read Buffer after the mutation.
   - Record Buffer post ID, due time, channel, actor, and status in the durable Buffer dispatch ledger.
   - An uncertain remote result is not retried blindly.
13. **Complete**
   - A campaign item is complete only after both the live destination and Buffer queue are verified.

## Source-of-truth rules

- A generated image shown only in ChatGPT is **not** a production asset.
- A draft PR is **not** published.
- Editorial-calendar approval is **not** social scheduling.
- Buffer success is not assumed from a mutation response; the queue must confirm it.
- Production-only Sites edits must be reconciled back to GitHub before the next release.
- Runtime secrets stay in the Sites environment; no secret values belong in Git or logs.
- R2 is currently unbound. Version-controlled public assets are the canonical near-term editorial-media path.

## Publishing authority

The current Growth Queue remains the publication authority. Buffer is transport only.

A Buffer schedule request must:
- identify an existing package and channel variant;
- pass the current persisted approval/evidence authority;
- use that variant's saved production assets;
- use a minted Chef Gringo tracked destination;
- fail closed if Buffer is unconfigured or the media URLs are not live;
- reconcile the Buffer queue after uncertain transport outcomes.

## Deployment safety

Production deployment stays manual/explicit even after GitHub CI passes. Merge does not equal deploy.
