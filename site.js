const leaderboardBody = document.getElementById("leaderboard-body");
const summaryGrid = document.getElementById("summary-grid");
const verificationStatus = document.getElementById("verification-status");
const searchInput = document.getElementById("search-input");

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

let allRows = [];

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
    return "n/a";
  }
  stamps.sort();
  return new Date(stamps[stamps.length - 1]).toLocaleString();
}

function buildSummary(rows, report) {
  const topAccuracy = [...rows].sort((a, b) => b.accuracy_pct - a.accuracy_pct)[0];
  const topReasoning = [...rows].sort((a, b) => b.reasoning_total - a.reasoning_total)[0];
  const tiles = [
    {
      label: "Models",
      value: rows.length,
      subvalue: `Latest source update: ${latestTimestamp(rows)}`,
    },
    {
      label: "Top Accuracy",
      value: formatMetric(topAccuracy.accuracy_pct, 1),
      subvalue: topAccuracy.display_model_name,
    },
    {
      label: "Top Reasoning",
      value: formatMetric(topReasoning.reasoning_total, 2),
      subvalue: topReasoning.display_model_name,
    },
    {
      label: "Paper Check",
      value: report.paper_crosscheck || "n/a",
      subvalue: `${report.comparison_count || 0} models compared`,
    },
  ];

  summaryGrid.innerHTML = tiles
    .map(
      (tile) => `
        <div class="summary-tile">
          <span class="summary-tile__label">${tile.label}</span>
          <div class="summary-tile__value">${tile.value}</div>
          <div class="summary-tile__subvalue">${tile.subvalue}</div>
        </div>
      `,
    )
    .join("");
}

function buildVerification(report) {
  const status = report.paper_crosscheck || "unknown";
  const mismatchCount = report.mismatch_count ?? 0;
  verificationStatus.innerHTML = `
    <div class="verification__status ${status === "pass" ? "" : "is-mismatch"}">${status}</div>
    <p>
      Paper cross-check against the public leaderboard source:
      <strong>${report.comparison_count || 0}</strong> models compared,
      <strong>${mismatchCount}</strong> mismatches.
    </p>
  `;
}

function renderRows(rows) {
  leaderboardBody.innerHTML = rows
    .map((row, index) => {
      const metrics = metricColumns
        .map(([key, digits]) => `<td>${formatMetric(row[key], digits)}</td>`)
        .join("");
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${row.display_model_name}</td>
          ${metrics}
        </tr>
      `;
    })
    .join("");
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

async function loadPage() {
  const [leaderboardResponse, reportResponse] = await Promise.all([
    fetch("./data/leaderboard_table_1_source.json"),
    fetch("./data/paper_crosscheck_report.json"),
  ]);

  const leaderboardPayload = await leaderboardResponse.json();
  const report = await reportResponse.json();
  allRows = [...leaderboardPayload.rows].sort((a, b) => b.accuracy_pct - a.accuracy_pct);

  buildSummary(allRows, report);
  buildVerification(report);
  renderRows(allRows);
}

searchInput.addEventListener("input", applySearch);
loadPage().catch((error) => {
  verificationStatus.innerHTML = `<p class="muted">Failed to load leaderboard data: ${error}</p>`;
});
