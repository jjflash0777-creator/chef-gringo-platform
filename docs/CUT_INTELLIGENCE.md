# Cut Intelligence — product requirement

**Status: required, not built.** No part of this capability exists in the repository today.

This document exists because a Git-history reconciliation on 2026-08-21 searched every local
branch, remote branch, tag, reflog, and reachable commit — plus every blob in the object
database, including unreachable ones — for "Cut Intelligence", "Know the cut", "Choose the
fire", cattle anatomy, beef photo upload, and cut identification. There were zero matches.
The capability was never written and there is nothing to recover. It is recorded here so it
is planned deliberately rather than mistaken for missing work.

Do not describe Cut Intelligence as shipped, partial, or in progress anywhere in the product,
and do not add it to primary navigation until a real implementation exists behind it.

## What it is

An educational culinary tool. A user uploads a photo of a piece of meat, or types the wording
printed on the package, and receives:

- **Identification** — the likely cut, with a confidence level and named alternatives.
- **Anatomy** — where the cut sits on the animal, accurately.
- **Character** — flavor, fat, connective tissue, density, and chew.
- **Cooking** — the methods the cut actually suits, and the food-safety boundaries that apply.
- **Alternatives** — better-value, premium, and substitute cuts.
- **Provenance** — the evidence behind each claim, and an honest explanation of what is uncertain
  and why.

Beef is the initial livestock. The architecture must accommodate pork, lamb, poultry, and
seafood later without being rebuilt.

## The anatomy visual

Eventually realistic, anatomically accurate, interactive, and usable on a phone. It must ship
with an accessible non-3D fallback that conveys the same information — the fallback is a
requirement, not a degradation.

## Constraints this inherits

These are existing platform rules, not new ones, and they bind Cut Intelligence tightly because
it is a claim-making feature:

- Identification is a probabilistic claim. It must be presented with confidence and alternatives,
  never as a bare assertion. When the system cannot tell, it says so.
- Anatomical and food-safety claims need sources. Food safety in particular is a domain where a
  confident wrong answer causes harm, so safety boundaries must be sourced and conservative.
- No invented imagery, evidence, prices, capabilities, or authority. An anatomy diagram that is
  merely plausible is a fabrication.
- The independent-operator voice: practical value before promotion. Any commercial routing that
  attaches to a cut comes after the education, with disclosure visible beside it.

## Open questions before implementation

- What evidence base backs cut identification and anatomical placement, and who qualifies to
  review it? The knowledge-core verification ladder (seeded → source-ready → reviewed → verified)
  applies, and this likely needs qualified review before anything reaches `verified`.
- What does photo identification actually run on, and where does inference happen? This is a new
  capability class for the platform; nothing here is an adapter over an existing provider yet.
- What is the honest floor for launch? A package-wording lookup backed by verified reference data
  is achievable and truthful. Photo identification is a much larger commitment and should not
  gate the useful half.
