# CLAUDE.md

## CI Validation

Before declaring any work done, validate your changes locally using agent-ci.

### One-time skill setup

```bash
pnpm dlx skills add redwoodjs/agent-ci --skill agent-ci --yes
```

### Running validation

```bash
pnpm dlx @redwoodjs/agent-ci run --quiet --all --pause-on-failure
```

Once a GitHub Actions deploy workflow exists (see issue #9), run against it:

```bash
pnpm dlx @redwoodjs/agent-ci run --workflow .github/workflows/<name>.yml
```

Do not report work as done until agent-ci passes.
