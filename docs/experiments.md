# Evaluate a candidate change

Use `kb experiment` when a lesson is about to become a reusable rule, prompt or tool.
It is a project-local ledger for actual measurements. It performs no model calls and
does not automatically approve or install candidates.

Prepare one UTF-8 diff file, baseline and candidate version references, development
tasks, and separate acceptance tasks. Choose metrics and their direction before
observing the results. The following task IDs and measurements are illustrative.

```sh
agent-suite kb experiment init ./eval/prompt-v2.json --task project/prompt-v2 --hypothesis "Maintain completion rate with fewer tokens" --change ./candidate.diff --baseline commit:BASE --candidate commit:CANDIDATE --development dev-1 --acceptance holdout-1 --metric success:higher --cost tokens

agent-suite kb experiment record ./eval/prompt-v2.json --phase acceptance --variant baseline --task holdout-1 --metric success=1 --cost tokens=1200 --evidence ./runs/baseline-holdout-1.json
agent-suite kb experiment record ./eval/prompt-v2.json --phase acceptance --variant candidate --task holdout-1 --metric success=1 --cost tokens=1000 --evidence ./runs/candidate-holdout-1.json

agent-suite kb experiment report ./eval/prompt-v2.json --json
```

Add multiple `--development`, `--acceptance`, `--metric` or `--cost` arguments as
needed. `--card 30.Wiki/lessons/example.md` records the current revision of a card
actually adopted. For lower-is-better measures use, for example, `--metric errors:lower`.
Record every declared metric and cost unit for every observation. Use actual data,
not the demonstration numbers above. Complete both phases for a review-ready report.

The manifest contains a frozen copy of the diff and its hash, version references,
task lists, card revisions and metric definitions. Results live in an adjacent
`<manifest>.results/` directory. Repeating identical results is idempotent; a different
result for the same phase/task/variant is rejected. Create a new experiment for a new
candidate or protocol instead of overwriting the original observation.

Reports compare only tasks with both baseline and candidate observations, list missing
pairs, and also report spending on unpaired runs. `ready_for_review` means the planned
records are present. It does not mean the candidate won or is safe to promote. Evidence
references and declared runtime versions remain claims to verify against original runs;
the ledger does not authenticate them. No confidence interval or universal gain is implied.

Keep project experiments with the project, not as a duplicate knowledge database. A
successful, independently reviewed result can later become a concise knowledge card.
Keep raw logs and full diffs at their original locations and cite them.
