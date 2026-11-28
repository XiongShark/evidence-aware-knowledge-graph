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
  const entry = document.querySelector("#entry-filter");
  const startLink = document.querySelector("#begin-route");
  const heroSwitch = document.querySelector("#hero-switch");
  const stagePicks = document.querySelector("#stage-picks");
  const stageResult = document.querySelector("#stage-result");
  const stageCanvas = document.querySelector("#route-canvas");
  const intro = document.querySelector("#intro");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const modeCopy = {
    course: {
      title: ["学完这门课，", "我能往哪走？"],
      description: "从学过的课程出发，看它能支持哪些岗位任务，再决定下一步往哪里走。",
      pick: "选择一门课程", label: "课程", caption: "相关岗位要求", action: "探索课程路线"
    },
    requirement: {
      title: ["有了目标岗位，", "我该怎么选课？"],
      description: "从目标岗位的具体任务出发，看哪些课能帮上忙，还有哪些能力需要练习。",
      pick: "选择一项岗位要求", label: "岗位要求", caption: "可探索的课程", action: "探索选课路线"
    }
  };
  let direction = "course";
  let stageEntry;
  let visible = sample.assessments;
  let selection = visible[0].id;
  let nodeButtons = new Map();
  const entities = () => direction === "course" ? sample.courses : sample.requirements;

  function motion(target, distance = 12) {
    if (reduceMotion.matches || !target.animate) return;
    target.getAnimations().forEach(animation => animation.cancel());
    target.animate([
      {opacity: .45, transform: `translateY(${distance}px)`},
      {opacity: 1, transform: "translateY(0)"}
    ], {duration: 440, easing: "cubic-bezier(.2,.7,.2,1)"});
  }

  function renderStage() {
    const items = entities();
    const chosen = items.find(item => item.id === stageEntry) || items[0];
    stageEntry = chosen.id;
    const linked = direction === "course" ? requirements : courses;
    const relatedKey = direction === "course" ? "requirement" : "course";
    const rows = sample.assessments.filter(item => item[direction] === stageEntry);
    const paths = [...new Set(rows.map(item => item[relatedKey]))].map(id => linked.get(id).label);
    document.querySelector("#stage-label").textContent = modeCopy[direction].pick;
    document.querySelector("#stage-index").textContent =
      `${String(items.indexOf(chosen) + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
    stagePicks.replaceChildren(...items.map(item => {
      const button = element("button", item.label);
      button.type = "button";
      button.dataset.entry = item.id;
      button.setAttribute("aria-pressed", String(item.id === stageEntry));
      return button;
    }));
    stageResult.replaceChildren(
      element("p", modeCopy[direction].caption, "stage-caption"),
      element("h2", paths.join("、")),
      element("p", `${chosen.label} · ${rows.length} 条证据判断`, "stage-summary")
    );
    motion(stageResult);
  }

  function setDirection(next, selected = "all") {
    const changed = direction !== next;
    direction = next;
    if (changed) stageEntry = undefined;
    intro.dataset.direction = direction;
    const copy = modeCopy[direction];
    const title = document.querySelector("#headline");
    title.replaceChildren(copy.title[0], element("br"), copy.title[1]);
    document.querySelector("#intro-description").textContent = copy.description;
    startLink.replaceChildren(copy.action + " ", element("span", "↗"));
    document.querySelector("#entry-label").textContent = copy.label;
    for (const choice of layoutChoices) choice.setAttribute("aria-pressed", String(choice.dataset.direction === direction));
    entry.replaceChildren(new Option("全部" + copy.label, "all"),
      ...entities().map(item => new Option(item.label, item.id)));
    entry.value = selected;
    renderStage();
    render();
    if (changed) motion(document.querySelector("#hero-copy"), 19);
  }

  stagePicks.addEventListener("click", event => {
    const button = event.target.closest("[data-entry]");
    if (!button) return;
    stageEntry = button.dataset.entry;
    renderStage();
    stagePicks.querySelector('[aria-pressed="true"]').focus({preventScroll: true});
  });
  startLink.addEventListener("click", () => {
    entry.value = stageEntry;
    filter.value = "all";
    render();
  });

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
        ctx.strokeStyle = active ? "#6a4caf" : "#b4a8c6";
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
    motion(detail, 8);
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
    const pool = sample.assessments.filter(item => entry.value === "all" || item[direction] === entry.value);
    const counts = new Map(Object.keys(statuses).map(status => [status, 0]));
    for (const item of pool) counts.set(item.status, counts.get(item.status) + 1);
    for (const option of filter.options) {
      const name = option.value === "all" ? "全部判断" : statuses[option.value];
      const count = option.value === "all" ? pool.length : counts.get(option.value);
      option.textContent = `${name}（${count}）`;
      option.disabled = count === 0;
    }
    if (filter.selectedOptions[0]?.disabled) filter.value = "all";
    visible = pool.filter(item => filter.value === "all" || item.status === filter.value);
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
    button.addEventListener("click", () => setDirection(button.dataset.direction));
  }
  filter.addEventListener("change", render);
  entry.addEventListener("change", render);
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
    motion(levelDetail, 9);
  }

  document.querySelector("#static-levels").remove();
  for (const record of sample.levels) {
    const button = element("button");
    button.type = "button";
    button.id = `level-${record.level}`;
    button.style.setProperty("--step", record.level);
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
  heroSwitch.hidden = false;
  stagePicks.hidden = false;
  document.querySelector("#interactive-tools").hidden = false;
  document.querySelector("#route-filters").hidden = false;
  document.querySelector("#explorer-body").classList.add("interactive");
  graph.hidden = false;
  setDirection("course");
  new ResizeObserver(drawEdges).observe(graph);
  animateStage(stageCanvas, reduceMotion);

  if (!reduceMotion.matches && "IntersectionObserver" in window) {
    const reveal = new IntersectionObserver(entries => {
      for (const item of entries) {
        if (!item.isIntersecting) continue;
        item.target.classList.add("entered");
        reveal.unobserve(item.target);
      }
    }, {threshold: .08});
    for (const section of document.querySelectorAll("[data-reveal]")) {
      section.classList.add("will-enter");
      reveal.observe(section);
    }
  }
}

function animateStage(canvas, reduceMotion) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const stage = canvas.parentElement;
  let width = 0;
  let height = 0;
  let running = false;
  let frame = 0;
  let aimX = 0;
  let aimY = 0;
  let offsetX = 0;
  let offsetY = 0;

  function paint(time = 0) {
    context.clearRect(0, 0, width, height);
    offsetX += (aimX - offsetX) * .08;
    offsetY += (aimY - offsetY) * .08;
    context.save();
    context.translate(width * .53 + offsetX, height * .5 + offsetY);
    const radius = Math.min(width * .35, height * .27);
    const violet = stage.closest(".intro").dataset.direction === "requirement";
    const color = violet ? "185,167,255" : "212,255,131";
    for (const [i, angle] of [-.52, .1, .7].entries()) {
      context.save();
      context.rotate(angle);
      const r = radius * (1 + .12 * i);
      const h = r * (.40 + i * .11);
      context.strokeStyle = `rgba(${color},.28)`;
      context.lineWidth = 1;
      context.beginPath();
      context.ellipse(0, 0, r, h, 0, 0, Math.PI * 2);
      context.stroke();
      for (let n = 0; n < 3; n++) {
        const position = time / (1600 + 400 * i) + n * 2.09 + i;
        const x = r * Math.cos(position);
        const y = h * Math.sin(position);
        context.fillStyle = `rgba(${color},${.45 + .51 * (Math.sin(position) + 1) / 2})`;
        context.beginPath();
        context.arc(x, y, 2 + n * .55, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    }
    context.restore();
  }
  function tick(time) {
    paint(time);
    if (running) frame = requestAnimationFrame(tick);
  }
  function resize() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    const scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = width * scale;
    canvas.height = height * scale;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    paint();
  }
  new ResizeObserver(resize).observe(stage);
  stage.addEventListener("pointermove", event => {
    if (reduceMotion.matches || event.pointerType === "touch") return;
    const box = stage.getBoundingClientRect();
    aimX = ((event.clientX - box.left) / width - .5) * 30;
    aimY = ((event.clientY - box.top) / height - .5) * 22;
  });
  stage.addEventListener("pointerleave", () => { aimX = 0; aimY = 0; });
  let onScreen = false;
  function refreshMotion() {
    running = onScreen && !reduceMotion.matches;
    cancelAnimationFrame(frame);
    aimX = aimY = offsetX = offsetY = 0;
    if (running) frame = requestAnimationFrame(tick);
    else paint();
  }
  new IntersectionObserver(([item]) => {
    onScreen = item.isIntersecting;
    refreshMotion();
  }).observe(stage);
  reduceMotion.addEventListener("change", refreshMotion);
}

start().catch(() => {
  resultCount.textContent = "互动数据暂时无法加载，上方仍可查看默认案例。";
});
