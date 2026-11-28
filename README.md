# 课程—岗位能力对标

[体验在线图谱](https://xiongshark.github.io/evidence-aware-knowledge-graph/) · [下载匿名图谱](docs/data/graph.ttl)

**课程教了什么、学到哪一步，和岗位实际要求做过什么，中间有一段信息差。** 课程说明常用知识主题和学习目标，招聘信息则描述任务、工作情境与经验要求。只看词语相似或二元连线，很难决定该补哪门课，也很难判断哪项能力还要找作品或实务经验来验证。

我们把每条对标判断拆成**支持到哪、还缺什么、证据从哪来**。可以从课程出发看相关岗位要求，也可以从岗位要求反查学习路径。比如营销分析课程的样本数据考核可以支持「评估营销效果」，真实投放中的方案执行与监测仍需要另外的证据。网页公开的是匿名示例，包含 3 门课程、5 条判断和 3 项原始岗位要求。

## 证据怎么影响判断

- **先区分主题与能力。** “介绍营销指标”提供主题信息。考核中的“独立计算、比较并说明结果”给出了可检查的任务和范围。
- **用可观察动作标注深度。** 目录、学习成果、引导练习与考核任务提供不同精度的证据。课程任务深度与个人掌握程度分别判断，个人能力仍需核验实际表现。
- **保留两侧原文依据。** 判断关联课程和岗位的出处。同一岗位要求的不同侧面各自评估，汇总时使用原始要求标识去重。

| 阶段 | 数据方法的变化 |
| --- | --- |
| V1–V3 | 从句式规则试验转到逐句标注，区分主题与能力表述。 |
| V4–V5 | 为课程、证据片段与事实分配稳定编号，保存人工修订记录。 |
| V6–V7 | 补入学习成果、每周主题与考核任务，逐步细化等级依据。 |
| V8 | 扩展到更多课程，记录自动抽取结果的复核状态。 |

## 技术实现

课程与岗位维护独立的 **SKOS** 能力词表，通过带复核状态的映射对齐。**RDF** 将断言、支持判断和证据建成可引用的资源，**OWL** 表达分类及关系。**SHACL** 检查判断的必填字段和证据引用，**SPARQL** 支持双向追溯以及按原始要求去重统计。

完整项目的候选图谱覆盖 **33 门课程、100 个岗位实例**。按既定策略，百岗候选图的结构校验结果为 0 条违规、1,714 条警告。另在历史五岗基线上验证 18 个注入故障及恢复。项目实验和网页匿名样例使用不同的数据范围。结构校验通过也仍需结合来源复核判断内容。

- [查看 SHACL 规则](demo/shapes.ttl)，每条判断须有证据和边界说明。
- [查询部分支持及缺口](demo/queries/partial-gaps.rq)，样例返回 3 条判断，涉及 2 项要求。
- [查询判断和原始要求数量](demo/queries/counts.rq)，样例的 5 条判断对应 3 项要求。

## 在本地运行

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r demo/requirements.txt
python demo/build.py --check
python -m http.server --directory docs 8000
```

在浏览器打开本地服务即可体验。修改[样例数据](demo/sample.json)后，运行 `python demo/build.py` 生成网页数据和 Turtle；构建同时验证 SPARQL 结果和缺少证据或边界时的 SHACL 违规。

## English abstract

We built an evidence-aware knowledge graph to bridge the information gap between curriculum descriptions and workforce requirements. The model records what course materials support, where support ends, and the evidence behind each judgment. Separate skill vocabularies, explicit assessment records, RDF, SHACL, and SPARQL enable bidirectional exploration and reproducible checks. The public explorer uses fictionalised material to illustrate the method and makes the scope of each judgment visible.
