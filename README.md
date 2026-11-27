# Evidence-Aware Knowledge Graph for Curriculum–Workforce Alignment

We built an evidence model to link two independently authored datasets. Curriculum materials describe what learners are expected to study or do. Workforce requirements describe the tasks and conditions of a role. We store the judgments connecting those systems alongside the evidence and limitations behind each one.

The [interactive explorer](https://xiongshark.github.io/evidence-aware-knowledge-graph/) uses three illustrative courses. It lets you inspect five support judgments and count the three distinct requirements they reference. All sample text is written for this demonstration.

## Method

| Stage | Decision |
| --- | --- |
| V1 | Try rule-based segmentation of course descriptions and compare the results with the source. |
| V2–V3 | Review sentences individually and distinguish content topics from abilities. |
| V4 | Give courses, evidence fragments and facts stable identifiers. |
| V5 | Record review decisions and use a common rubric across the pilot. |
| V6 | Add learning outcomes and weekly topics to recover information lost in short descriptions. |
| V7 | Use assessment tasks to distinguish introducing, explaining and applying a topic. |
| V8 | Extend the workflow and record which automatically extracted facts still need review. |

Both sides follow an **entity → evidence → fact** structure. In the underlying workflow, stable evidence IDs and character offsets trace assertions back to source text. An explicit action supports the level assigned to a curriculum task. Missing evidence and inferred lower bounds are recorded with their review status.

Our example assigns one judgment to each assessed scope, so separate facets of a requirement can carry different outcomes. The canonical requirement identifier keeps those facets from inflating counts. A validated graph establishes its structural constraints. The scope and evidence limits still need to be interpreted.

## Run locally

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r demo/requirements.txt
python demo/build.py --check
python -m http.server --directory docs 8000
```

Open the local server in a browser. Edit [the sample](demo/sample.json) and run `python demo/build.py` to regenerate the site dataset and [the Turtle graph](docs/data/graph.ttl). The build runs [the SPARQL queries](demo/queries/) and validates the sample with [SHACL](demo/shapes.ttl), including a missing-evidence case.

## 中文摘要

我们用可追溯的证据组织课程能力和岗位要求。学习结果和考核任务帮助区分认知与应用深度，结构化复核判断保留每个结论的支持范围。交互案例可以按课程或岗位查看证据，并对指向同一要求的多条判断进行去重。
