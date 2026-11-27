"use strict";

const statuses = {
  supported: "Supported scope",
  partial: "Partial support",
  related: "Related only"
};
const columns = document.querySelector("#columns");
const filter = document.querySelector("#support-filter");
const detail = document.querySelector("#detail");
const graph = document.querySelector("#graph");
const canvas = document.querySelector("#edges");
const layoutChoices = [...document.querySelectorAll("[data-direction]")];
const levels = document.querySelector("#level-list");
const levelDetail = document.querySelector("#level-detail");
const resultCount = document.querySelector("#result-count");

function element(tag, text, className) {
  const item = document.createElement(tag);
  if (text) item.textContent = text;
  if (className) item.className = className;
  return item;
}

async function start() {
  const response = await fetch("./data/graph.json");
  if (!response.ok) throw new Error("The sample could not be loaded.");
  const sample = await response.json();
  const courses = new Map(sample.courses.map(item => [item.id, item]));
  const requirements = new Map(sample.requirements.map(item => [item.id, item]));
  document.querySelector("#course-count").textContent = courses.size;
  document.querySelector("#assessment-count").textContent = sample.assessments.length;
  document.querySelector("#requirement-count").textContent = requirements.size;
  let direction = "course";
  let visible = sample.assessments;
  let selection = visible[0].id;
  let nodeButtons = new Map();

  function showDetail(assessment) {
    const heading = element("h3", assessment.label);
    heading.id = "detail-title";
    const label = element("p", statuses[assessment.status], assessment.status);
    const path = element("p", courses.get(assessment.course).label + " → " + requirements.get(assessment.requirement).label, "route");
    const descriptions = element("dl");
    descriptions.append(
      element("dt", assessment.source),
      element("dd", assessment.evidence),
      element("dt", "Scope and limits"),
      element("dd", assessment.limit)
    );
    detail.replaceChildren(heading, label, path, descriptions);
  }

  function drawEdges() {
    const frame = graph.getBoundingClientRect();
    if (!frame.width || !frame.height) return;
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.round(frame.width * scale);
    canvas.height = Math.round(frame.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    for (const active of [false, true]) {
      for (const record of visible) {
        if ((record.id === selection) !== active) continue;
        const ids = direction === "course"
          ? [record.course, record.id, record.requirement]
          : [record.requirement, record.id, record.course];
        const bounds = ids.map(id => nodeButtons.get(id).getBoundingClientRect());
        ctx.strokeStyle = active ? "#226a60" : "#a0b2aa";
        ctx.lineWidth = active ? 2.4 : 1.35;
        for (let i = 0; i < bounds.length - 1; i++) {
          const from = bounds[i];
          const to = bounds[i + 1];
          const x1 = from.right - frame.left;
          const y1 = (from.top + from.bottom) / 2 - frame.top;
          const x2 = to.left - frame.left;
          const y2 = (to.top + to.bottom) / 2 - frame.top;
          const middle = (x1 + x2) / 2;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.bezierCurveTo(middle, y1, middle, y2, x2, y2);
          ctx.stroke();
        }
      }
    }
  }

  function select(record) {
    selection = record.id;
    for (const [id, button] of nodeButtons) {
      const active = id === record.id || id === record.course || id === record.requirement;
      button.setAttribute("aria-pressed", String(active));
    }
    showDetail(record);
    drawEdges();
  }

  function makeColumn(label, entries, kind) {
    const column = element("section", null, "graph-column");
    const nodes = element("div", null, "nodes");
    for (const entry of entries) {
      const button = element("button", entry.label, "node");
      button.type = "button";
      button.setAttribute("aria-pressed", "false");
      if (kind === "judgment") {
        button.append(element("span", statuses[entry.status], "node-status " + entry.status));
      }
      if (entry.summary) button.title = entry.summary;
      button.addEventListener("click", () => {
        const candidates = kind === "judgment" ? [entry] : visible.filter(item => item[kind] === entry.id);
        const current = candidates.findIndex(item => item.id === selection);
        select(candidates[(current + 1) % candidates.length]);
      });
      nodes.append(button);
      nodeButtons.set(entry.id, button);
    }
    column.append(element("h3", label), nodes);
    return column;
  }

  function render() {
    visible = sample.assessments.filter(item => filter.value === "all" || item.status === filter.value);
    nodeButtons = new Map();
    const matches = (key, items) => items.filter(entry => visible.some(item => item[key] === entry.id));
    const left = makeColumn("Courses", matches("course", sample.courses), "course");
    const center = makeColumn("Support judgments", visible, "judgment");
    const right = makeColumn("Requirements", matches("requirement", sample.requirements), "requirement");
    columns.replaceChildren(...(direction === "course" ? [left, center, right] : [right, center, left]));
    const count = new Set(visible.map(item => item.requirement)).size;
    resultCount.textContent = `${visible.length} visible judgment${visible.length === 1 ? "" : "s"} · ${count} distinct requirement${count === 1 ? "" : "s"}`;
    const record = visible.find(item => item.id === selection) || visible[0];
    if (record) select(record);
  }

  for (const button of layoutChoices) {
    button.addEventListener("click", () => {
      direction = button.dataset.direction;
      for (const choice of layoutChoices) choice.setAttribute("aria-pressed", String(choice === button));
      render();
    });
  }
  filter.addEventListener("change", render);
  new ResizeObserver(drawEdges).observe(graph);
  render();

  function showLevel(selected) {
    const record = sample.levels[selected];
    const detailLabel = `${record.type} · L${record.level}`;
    levelDetail.replaceChildren(
      element("p", detailLabel, "eyebrow"),
      element("h3", record.action),
      element("blockquote", record.text),
      element("p", record.reason)
    );
    [...levels.children].forEach((button, i) => button.setAttribute("aria-pressed", String(i === selected)));
  }
  sample.levels.forEach((record, i) => {
    const button = element("button");
    button.type = "button";
    button.append(element("span", "L" + record.level, "level-chip"), element("span", record.source));
    button.addEventListener("click", () => showLevel(i));
    levels.append(button);
  });
  showLevel(0);
}

start().catch(() => {
  const heading = element("h3", "Sample unavailable");
  heading.id = "detail-title";
  detail.replaceChildren(heading, element("p", "Reload the page or use the RDF download."));
});
