"use strict";

const statuses = {
  supported: "支持明确",
  partial: "部分支持",
  related: "仅相关"
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
  if (!response.ok) throw new Error("样例数据加载失败");
  const sample = await response.json();
  const courses = new Map(sample.courses.map(item => [item.id, item]));
  const requirements = new Map(sample.requirements.map(item => [item.id, item]));
  const levelRecords = new Map(sample.levels.map(item => [item.level, item]));
  const levelButtons = new Map();
  const counts = new Map(Object.keys(statuses).map(status => [status, 0]));
  for (const item of sample.assessments) counts.set(item.status, counts.get(item.status) + 1);
  for (const option of filter.options) {
    const count = option.value === "all" ? sample.assessments.length : counts.get(option.value);
    option.textContent = `${option.textContent}（${count}）`;
    option.disabled = count === 0;
  }
  let direction = "course";
  let visible = sample.assessments;
  let selection = visible[0].id;
  let nodeButtons = new Map();

  function showDetail(assessment) {
    const requirement = requirements.get(assessment.requirement);
    const course = courses.get(assessment.course);
    const heading = element("h3", assessment.label);
    heading.id = "detail-title";
    const label = element("p", statuses[assessment.status], "status-badge " + assessment.status);
    const route = direction === "course"
      ? `${course.label} → ${requirement.label}`
      : `${requirement.label} → ${course.label}`;
    const comparison = element("div", null, "comparison");
    for (const [title, text] of [["支持到哪", assessment.support], ["还缺什么", assessment.limit]]) {
      const block = element("div");
      block.append(element("h4", title), element("p", text));
      comparison.append(block);
    }
    const sources = element("details", null, "source");
    const citations = element("dl");
    citations.append(
      element("dt", "课程 · " + assessment.source),
      element("dd", assessment.evidence),
      element("dt", "岗位 · 岗位描述"),
      element("dd", requirement.summary)
    );
    sources.append(
      element("summary", "查看两侧出处"),
      citations,
      element("p", "两段引文均为匿名演示材料。", "footnote")
    );
    detail.replaceChildren(label, heading, element("p", route, "route"), comparison);
    if (levelRecords.has(assessment.level)) {
      const link = element("a", `查看 L${assessment.level} 等级示例`, "level-link");
      link.href = `#level-${assessment.level}`;
      link.addEventListener("click", () => {
        showLevel(assessment.level);
        levelButtons.get(assessment.level).focus({ preventScroll: true });
      });
      detail.append(link);
    }
    detail.append(sources);
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
        button.append(element("span", " " + statuses[entry.status], "node-status " + entry.status));
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
    const left = makeColumn("课程", matches("course", sample.courses), "course");
    const center = makeColumn("支持判断", visible, "judgment");
    const right = makeColumn("岗位要求", matches("requirement", sample.requirements), "requirement");
    columns.replaceChildren(...(direction === "course" ? [left, center, right] : [right, center, left]));
    const count = new Set(visible.map(item => item.requirement)).size;
    resultCount.textContent = `当前 ${visible.length} 条判断，按原始要求去重为 ${count} 项。`;
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
  function showLevel(number) {
    const record = levelRecords.get(number);
    if (!record) return;
    levelDetail.replaceChildren(
      element("p", `L${record.level} · ${record.source} · ${record.type}`, "eyebrow"),
      element("h3", record.action),
      element("blockquote", record.text),
      element("p", record.reason)
    );
    for (const [key, button] of levelButtons) button.setAttribute("aria-pressed", String(key === number));
  }

  document.querySelector("#static-levels").remove();
  for (const record of sample.levels) {
    const button = element("button");
    button.type = "button";
    button.id = `level-${record.level}`;
    button.append(element("span", "L" + record.level, "level-chip"), document.createTextNode(" "), element("span", record.stage));
    button.addEventListener("click", () => showLevel(record.level));
    levelButtons.set(record.level, button);
    levels.append(button);
  }
  function syncLevelLink() {
    const match = /^#level-(\d+)$/.exec(location.hash);
    if (match) showLevel(Number(match[1]));
  }
  window.addEventListener("hashchange", syncLevelLink);
  levels.hidden = false;
  levelDetail.hidden = false;
  showLevel(sample.levels[0].level);
  syncLevelLink();
  document.querySelector("#interactive-tools").hidden = false;
  document.querySelector("#explorer-body").classList.add("interactive");
  graph.hidden = false;
  render();
  new ResizeObserver(drawEdges).observe(graph);
}

start().catch(() => {
  resultCount.textContent = "互动数据暂时无法加载，上方仍可查看默认案例。";
});
