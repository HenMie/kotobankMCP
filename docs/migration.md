# Migration Notes

## Boundary change

The repository used to be centered around:

- a local skill package under `.agents/skills/`
- an optional stdio MCP entrypoint
- packaged installer / CLI support files

It is now centered around:

- a cloud-deployable HTTP-only MCP service
- Docker-first deployment
- process-wide runtime/cache reuse
- remote MCP clients rather than local skill installation

## What was removed from the mainline

The mainline service delivery no longer includes:

- bundled skill packaging
- skill installer commands
- stdio-first startup path
- skill-first README positioning

## What stayed the same

The core dictionary logic was intentionally retained:

`search -> rank -> canonical word fetch -> parse -> structured result`

That keeps the previously verified parsing and lookup behavior while changing
only the transport / deployment boundary.

## Why TypeScript stayed for this phase

Rust was explicitly deferred.

Reason:

- the dominant latency win comes from a warm long-lived process and shared cache
- there was no evidence that language runtime overhead was the primary bottleneck
- reusing the existing TypeScript parsing stack lowered migration risk

A future Rust rewrite can be evaluated after real production measurements.
