const leaderboardBody = document.getElementById("leaderboard-body");
const metaStrip = document.getElementById("meta-strip");
const searchInput = document.getElementById("search-input");
const citationBlock = document.getElementById("citation-block");
const footerUpdated = document.getElementById("footer-updated");

const metricColumns = [
  ["accuracy_pct", 1],
  ["reasoning_total", 2],
  ["korean_pct", 1],
  ["text_pct", 1],
  ["multimodal_pct", 1],
  ["part1_pct", 1],
  ["part2_pct", 1],
  ["part3_pct", 1],
  ["part4_pct", 1],
  ["part5_pct", 1],
];

const sortState = {
  key: "accuracy_pct",
  asc: false,
};

let allRows = [];
let currentReport = null;

function formatMetric(value, digits) {
  if (value === null || value === undefined) {
    return "-";
  }
  return Number(value).toFixed(digits);
}

function latestTimestamp(rows) {
  const stamps = [];
  for (const row of rows) {
    for (const stamp of Object.values(row.timestamps || {})) {
      if (stamp) {
        stamps.push(stamp);
      }
    }
  }
  if (!stamps.length) {
    return null;
  }
  stamps.sort();
  return stamps[stamps.length - 1];
}

function formatDate(stamp) {
  if (!stamp) {
    return "n/a";
  }
  const date = new Date(stamp);
  if (Number.isNaN(date.getTime())) {
    return stamp;
  }
  return date.toISOString().slice(0, 10);
}

function normalizeForSort(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    return value.toLowerCase();
  }
  return value;
}

function compareRows(left, right) {
  const key = sortState.key;
  const leftValue = key === "rank" ? allRows.indexOf(left) + 1 : normalizeForSort(left[key]);
  const rightValue = key === "rank" ? allRows.indexOf(right) + 1 : normalizeForSort(right[key]);

  if (leftValue === null && rightValue === null) {
    return 0;
  }
  if (leftValue === null) {
    return 1;
  }
  if (rightValue === null) {
    return -1;
  }
  if (leftValue < rightValue) {
    return sortState.asc ? -1 : 1;
  }
  if (leftValue > rightValue) {
    return sortState.asc ? 1 : -1;
  }
  return 0;
}

function isReasoningModel(row) {
  const haystack = `${row.display_model_name} ${row.model_key}`.toLowerCase();
  return haystack.includes("thinking") || haystack.includes("reasoning") || haystack.includes("think");
}

function isInstructModel(row) {
  const haystack = `${row.display_model_name} ${row.model_key}`.toLowerCase();
  return haystack.includes("instruct");
}

function renderModelFlags(row) {
  const flags = [];
  if (isReasoningModel(row)) {
    flags.push('<span class="model-flag model-flag--reasoning">▲ Reasoning</span>');
  }
  if (isInstructModel(row)) {
    flags.push('<span class="model-flag model-flag--instruct">● Instruct</span>');
  }
  if (!flags.length) {
    return "";
  }
  return `<div class="model-flags">${flags.join("")}</div>`;
}

function buildMeta(rows, report) {
  const lastUpdated = formatDate(latestTimestamp(rows));
  const status = report?.paper_crosscheck || "unknown";
  const mismatchCount = report?.mismatch_count ?? 0;
  const statusClass = status === "pass" ? "" : "is-mismatch";

  metaStrip.innerHTML = [
    `<div class="meta-pill"><strong>${rows.length}</strong> models</div>`,
    `<div class="meta-pill">Paper cross-check: <span class="meta-pill__status ${statusClass}">${status}</span></div>`,
    `<div class="meta-pill"><strong>${report?.comparison_count || 0}</strong> compared, <strong>${mismatchCount}</strong> mismatches</div>`,
    `<div class="meta-pill">Last updated: <strong>${lastUpdated}</strong></div>`,
  ].join("");

  footerUpdated.textContent = `Last updated: ${lastUpdated}`;
}

function buildCitation() {
  citationBlock.textContent = `@inproceedings{kim2026kmetbench,
  title = {K-MetBench: A Multi-Dimensional Benchmark for Fine-Grained Evaluation of Expert Reasoning, Locality, and Multimodality in Meteorology},
  author = {Kim, Soyeon and Kang, Cheongwoong and Lee, Myeongjin and Chang, Eun-Chul and Lee, Jaedeok and Choi, Jaesik},
  booktitle = {Findings of the Association for Computational Linguistics: ACL 2026},
  year = {2026},
  note = {Camera-ready in progress}
}`;
}

function renderRows(rows) {
  const sortedRows = [...rows].sort(compareRows);
  leaderboardBody.innerHTML = sortedRows
    .map((row, index) => {
      const metrics = metricColumns
        .map(([key, digits], metricIndex) => {
          const value = formatMetric(row[key], digits);
          const content = metricIndex === 0 ? `<span class="metric-strong">${value}</span>` : value;
          return `<td>${content}</td>`;
        })
        .join("");

      return `
        <tr>
          <td class="rank-cell">${index + 1}</td>
          <td class="model-cell">
            <span class="model-name">${row.display_model_name}</span>
            ${renderModelFlags(row)}
          </td>
          ${metrics}
        </tr>
      `;
    })
    .join("");

  document.querySelectorAll("#lb-table thead th").forEach((th) => {
    const arrow = th.querySelector(".sort-arrow");
    if (!arrow) {
      return;
    }
    arrow.textContent = th.dataset.sort === sortState.key ? (sortState.asc ? " ▲" : " ▼") : "";
  });
}

function applySearch() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    renderRows(allRows);
    return;
  }
  const filtered = allRows.filter((row) => row.display_model_name.toLowerCase().includes(query));
  renderRows(filtered);
}

function bindSorting() {
  document.querySelectorAll("#lb-table thead th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (sortState.key === key) {
        sortState.asc = !sortState.asc;
      } else {
        sortState.key = key;
        sortState.asc = key === "display_model_name" || key === "rank";
      }
      applySearch();
    });
  });
}

async function loadPage() {
  const [leaderboardResponse, reportResponse] = await Promise.all([
    fetch("./data/leaderboard_table_1_source.json"),
    fetch("./data/paper_crosscheck_report.json"),
  ]);

  const leaderboardPayload = await leaderboardResponse.json();
  currentReport = await reportResponse.json();
  allRows = [...leaderboardPayload.rows].sort((left, right) => right.accuracy_pct - left.accuracy_pct);

  buildMeta(allRows, currentReport);
  buildCitation();
  renderRows(allRows);
  bindSorting();
}

searchInput.addEventListener("input", applySearch);
loadPage().catch((error) => {
  metaStrip.innerHTML = `<div class="meta-pill muted">Failed to load leaderboard data: ${error}</div>`;
});
