# 0010. Readable targets and resolutions after a redeployment

Within ADR 0002 and ADR 0006. Usage: [how-it-works.md](../how-it-works.md#targets), [agent-api.md](../agent-api.md).

## Context

Most hosts do not put `data-socrate-id` on their elements, so a target is recorded with a positional selector. Until 0.2.0 such a target was relocated only on the deployment where it was written: after any push, every targeted thread showed "Élément introuvable sur cet écran", which reviewers read as a closed dialog or a bug. A resolution written by an agent showed "Résolu dans e005c6c · déploiement pr-…": the deployment was the one online when the agent wrote, almost always a build without the fix.

## Decision

- **Relocation by text on another deployment.** Without an own editorial id, a target is placed on another deployment only when exactly one element of the page, outside Socrate, has the tag that opens the recorded excerpt, the recorded role, and an own normalized text (aria-label or `innerText`, whitespace collapsed; never the parent text used for empty elements) starting with the first 40 characters of the recorded text, which must have at least 12. The rules for the same deployment and for editorial ids are unchanged.
- **Shown as probable.** Such a pin is dashed and labelled "Position probable"; the list keeps "Voir sur la page" with "position probable".
- **"Voir où c’était".** When nothing qualifies, the list offers the thread's capture, cropped and framed on the recorded rectangle, loaded on demand. The target records an optional `container` (`{ label? }`) when it sits in a `dialog`, `[role=dialog]`, `[role=alertdialog]` or `[aria-modal=true]`; the view then asks to open that window and retry.
- **Readable resolution.** Reads compute `transition.liveSince`: the first non-revoked deployment of the review whose commit matches the resolution commit by prefix in either direction. The panel shows "Corrigé par <agent> · en ligne depuis <time>" or "· en attente de la prochaine preview", the commit on hover, never the deployment id. `deploymentId` stays in the API.

## Why a unique candidate stays safe

This relaxes "never the first match" only in the direction it was meant to protect. Several matches, or none, still give no pin. A single element with the same tag, the same role and the same opening words is, on a page of an application, the same element in nearly every real case: a block of a record, a paragraph, a heading. Twelve characters exclude generic labels ("Modifier", "Enregistrer") that repeat; forty keep the match stable when the end of a text is edited. Nested elements of the same tag starting with the same text count as two candidates and are refused. The remaining risk, a unique element that is not the original one (the original removed and another element starting with the same words added), is why the pin is visibly probable and the capture remains one click away.

## Rejected alternatives

- **Positional selector across deployments.** A new build shifts `nth-of-type` positions; the pin would land on a neighbour without any sign of doubt.
- **Fuzzy text similarity.** A score threshold picks a winner among several candidates, which is exactly the first-match behaviour this project refuses.
- **Git ancestry for "en ligne".** The service has no repository access. Comparing commits by prefix is exact for the build that carries the fix; a later build that contains it under another commit is reported as waiting (documented limit).

## Consequences

- `targetSchema` gains the optional `container`; `Transition` gains `liveSince`, computed without migration. A 0.2.0 client ignores both. A 0.3.0 client facing an older Worker sees `422` on `target.container` alone and resends the same target without it; without `liveSince` it shows "Corrigé par <agent>" with no live state.
- The panel chunk grows by about 600 bytes gzip (the ceiling `panneauGzip` is raised accordingly); the capture view is a separate chunk.
