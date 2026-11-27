"""Build and verify the two public representations of the illustrative sample."""

import argparse
import json
from pathlib import Path

from pyshacl import validate
from rdflib import Graph, Literal, Namespace, RDF, RDFS

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "docs" / "data"
KG = Namespace("https://example.org/curriculum-workforce/")
STATUSES = {"supported", "partial", "related"}


def make_graph(sample):
    graph = Graph(bind_namespaces="none")
    graph.bind("kg", KG)
    graph.bind("rdfs", RDFS)
    occupied = set()
    resources = {}
    for group, rdf_class in (("courses", KG.Course), ("requirements", KG.Requirement)):
        resources[group] = set()
        for item in sample[group]:
            identifier = item["id"]
            assert identifier not in occupied, f"Duplicate identifier: {identifier}"
            occupied.add(identifier)
            resources[group].add(identifier)
            graph.add((KG[identifier], RDF.type, rdf_class))
            graph.add((KG[identifier], RDFS.label, Literal(item["label"])))
            graph.add((KG[identifier], RDFS.comment, Literal(item["summary"])))
    for item in sample["assessments"]:
        identifier = item["id"]
        assert identifier not in occupied, f"Duplicate identifier: {identifier}"
        occupied.add(identifier)
        assert item["course"] in resources["courses"], identifier
        assert item["requirement"] in resources["requirements"], identifier
        assert item["status"] in STATUSES, identifier
        assessment = KG[identifier]
        evidence = KG[f"evidence/{identifier}"]
        graph.add((assessment, RDF.type, KG.Assessment))
        graph.add((assessment, RDFS.label, Literal(item["label"])))
        graph.add((assessment, KG.course, KG[item["course"]]))
        graph.add((assessment, KG.requirement, KG[item["requirement"]]))
        graph.add((assessment, KG.status, Literal(item["status"])))
        graph.add((assessment, KG.evidence, evidence))
        graph.add((assessment, KG.limitation, Literal(item["limit"])))
        graph.add((evidence, RDF.type, KG.Evidence))
        graph.add((evidence, KG.sourceType, Literal(item["source"])))
        graph.add((evidence, KG.text, Literal(item["evidence"])))
    for item in sample["levels"]:
        observation = KG[f"level/{item['level']}"]
        graph.add((observation, RDF.type, KG.LevelObservation))
        for key in ("level", "source", "action", "text", "reason", "type"):
            graph.add((observation, KG[key], Literal(item[key])))
    return graph


def verify(graph):
    shapes = Graph().parse(HERE / "shapes.ttl", format="turtle")
    conforms, _, report = validate(graph, shacl_graph=shapes)
    if not conforms:
        raise ValueError(report)
    rows = list(graph.query((HERE / "queries" / "counts.rq").read_text()))
    assert [tuple(int(value) for value in row) for row in rows] == [(5, 3)]
    paths = list(graph.query((HERE / "queries" / "evidence.rq").read_text()))
    assert len(paths) == 5
    assessment = next(graph.subjects(RDF.type, KG.Assessment))
    broken = Graph()
    for triple in graph:
        broken.add(triple)
    broken.remove((assessment, KG.evidence, None))
    conforms, _, _ = validate(broken, shacl_graph=shapes)
    assert not conforms, "Missing evidence must fail validation"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Check generated files without rewriting them")
    args = parser.parse_args()
    sample = json.loads((HERE / "sample.json").read_text(encoding="utf-8"))
    graph = make_graph(sample)
    verify(graph)
    graph_json = json.dumps(sample, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert (OUT / "graph.json").read_text(encoding="utf-8") == graph_json
        assert Graph().parse(OUT / "graph.ttl", format="turtle").isomorphic(graph)
    else:
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / "graph.json").write_text(graph_json, encoding="utf-8")
        turtle = graph.serialize(format="turtle").rstrip() + "\n"
        (OUT / "graph.ttl").write_text(turtle, encoding="utf-8")
    print("Verified five evidence paths, three distinct requirements, and missing-evidence detection.")


if __name__ == "__main__":
    main()
