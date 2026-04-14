const leaderboardBody = document.getElementById("leaderboard-body");
const metaStrip = document.getElementById("meta-strip");
const plotTabs = document.getElementById("plot-tabs");
const plotSubtitle = document.getElementById("plot-subtitle");
const plotSurface = document.getElementById("plot-surface");
const chartContainer = document.getElementById("chart-container");
const typeFilterButtons = document.querySelectorAll(".legend-filter");
const resultNoteSortButtons = document.querySelectorAll(".results-note-sort");
const searchInput = document.getElementById("search-input");
const citationBlock = document.getElementById("citation-block");
const SITE_ASSET_VERSION = "20260415b";

const plotMetrics = [
  {
    key: "accuracy_pct",
    tabLabel: "Accuracy",
    axisLabel: "Accuracy (%)",
    valueLabel: "Accuracy",
    digits: 1,
    domain: [0, 100],
    tickValues: [0, 20, 40, 60, 80, 100],
  },
  {
    key: "reasoning_total",
    tabLabel: "Reasoning",
    axisLabel: "Reasoning Score",
    valueLabel: "Reasoning score",
    digits: 2,
    domain: [0, 20],
    tickValues: [0, 5, 10, 15, 20],
  },
  {
    key: "korean_pct",
    tabLabel: "Geo-Cultural",
    axisLabel: "Geo-Cultural (%)",
    valueLabel: "Geo-Cultural",
    digits: 1,
    domain: [0, 100],
    tickValues: [0, 20, 40, 60, 80, 100],
  },
  {
    key: "text_pct",
    tabLabel: "Text-Only",
    axisLabel: "Text-Only (%)",
    valueLabel: "Text-Only",
    digits: 1,
    domain: [0, 100],
    tickValues: [0, 20, 40, 60, 80, 100],
  },
  {
    key: "multimodal_pct",
    tabLabel: "Multimodal",
    axisLabel: "Multimodal (%)",
    valueLabel: "Multimodal",
    digits: 1,
    domain: [0, 100],
    tickValues: [0, 20, 40, 60, 80, 100],
  },
  {
    key: "part1_pct",
    tabLabel: "Part 1",
    axisLabel: "Part 1 (%)",
    valueLabel: "Part 1",
    digits: 1,
    domain: [0, 100],
    tickValues: [0, 20, 40, 60, 80, 100],
  },
  {
    key: "part2_pct",
    tabLabel: "Part 2",
    axisLabel: "Part 2 (%)",
    valueLabel: "Part 2",
    digits: 1,
    domain: [0, 100],
    tickValues: [0, 20, 40, 60, 80, 100],
  },
  {
    key: "part3_pct",
    tabLabel: "Part 3",
    axisLabel: "Part 3 (%)",
    valueLabel: "Part 3",
    digits: 1,
    domain: [0, 100],
    tickValues: [0, 20, 40, 60, 80, 100],
  },
  {
    key: "part4_pct",
    tabLabel: "Part 4",
    axisLabel: "Part 4 (%)",
    valueLabel: "Part 4",
    digits: 1,
    domain: [0, 100],
    tickValues: [0, 20, 40, 60, 80, 100],
  },
  {
    key: "part5_pct",
    tabLabel: "Part 5",
    axisLabel: "Part 5 (%)",
    valueLabel: "Part 5",
    digits: 1,
    domain: [0, 100],
    tickValues: [0, 20, 40, 60, 80, 100],
  },
];

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
  typeSortFilter: null,
};

let allRows = [];
let activePlotMetricKey = "accuracy_pct";
const TYPE_FILTER_KEYS = ["p", "k", "g"];
const activeTypeFilters = new Set(TYPE_FILTER_KEYS);
let plotChart = null;
const PLOT_PROPRIETARY_COLOR = "#7c3aed";
const PLOT_KOREAN_COLOR = "#be185d";
const PLOT_GENERAL_COLOR = "#475569";

function formatMetric(value, digits) {
  if (value === null || value === undefined) {
    return "-";
  }
  return Number(value).toFixed(digits);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function getActivePlotMetric() {
  return plotMetrics.find((metric) => metric.key === activePlotMetricKey) || plotMetrics[0];
}

function typeSortKey(row) {
  return (
    (row.is_proprietary_model ? 8 : 0) +
    (row.is_korean_model ? 4 : 0) +
    (row.is_vision_model ? 2 : 0) +
    (row.is_reasoning_model ? 1 : 0)
  );
}

function compareRows(left, right) {
  const key = sortState.key;
  const leftValue =
    key === "rank"
      ? allRows.indexOf(left) + 1
      : normalizeForSort(
          key === "type_sort_key"
            ? typeSortKey(left)
            : key === "type_presence"
              ? Number(rowMatchesTypeFilter(left, sortState.typeSortFilter || ""))
              : left[key],
        );
  const rightValue =
    key === "rank"
      ? allRows.indexOf(right) + 1
      : normalizeForSort(
          key === "type_sort_key"
            ? typeSortKey(right)
            : key === "type_presence"
              ? Number(rowMatchesTypeFilter(right, sortState.typeSortFilter || ""))
              : right[key],
        );

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
  if (key === "type_presence") {
    const leftAccuracy = left.accuracy_pct ?? -1;
    const rightAccuracy = right.accuracy_pct ?? -1;
    if (leftAccuracy !== rightAccuracy) {
      return rightAccuracy - leftAccuracy;
    }
  }
  const leftName = normalizeForSort(left.display_model_name);
  const rightName = normalizeForSort(right.display_model_name);
  if (leftName < rightName) {
    return -1;
  }
  if (leftName > rightName) {
    return 1;
  }
  return 0;
}

function renderTypeTags(row) {
  const tags = [
    ["p", "P", "Proprietary", Boolean(row.is_proprietary_model)],
    ["k", "K", "Korean", Boolean(row.is_korean_model)],
    ["v", "V", "Vision", Boolean(row.is_vision_model)],
    ["r", "R", "Reasoning", Boolean(row.is_reasoning_model)],
  ];

  return `
    <div class="type-tags">
      ${tags
        .map(
          ([key, shortLabel, fullLabel, enabled]) =>
            `<span class="type-pill ${enabled ? `type-pill--${key}` : "type-pill--off"}" title="${fullLabel}">${shortLabel}</span>`,
        )
        .join("")}
    </div>
  `;
}

function buildMeta(rows) {
  const lastUpdated = formatDate(latestTimestamp(rows));

  metaStrip.innerHTML = `<div class="meta-pill">Latest source timestamp: <strong>${lastUpdated}</strong></div>`;
}

function rowMatchesTypeFilter(row, filterKey) {
  if (filterKey === "p") {
    return Boolean(row.is_proprietary_model);
  }
  if (filterKey === "k") {
    return Boolean(row.is_korean_model);
  }
  if (filterKey === "v") {
    return Boolean(row.is_vision_model);
  }
  if (filterKey === "r") {
    return Boolean(row.is_reasoning_model);
  }
  if (filterKey === "g") {
    return !row.is_proprietary_model && !row.is_korean_model;
  }
  return true;
}

function updateTypeFilterState() {
  typeFilterButtons.forEach((button) => {
    const isActive = activeTypeFilters.has(button.dataset.typeFilter);
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function updateResultNoteSortState() {
  resultNoteSortButtons.forEach((button) => {
    const isActive = sortState.key === "type_presence" && sortState.typeSortFilter === button.dataset.typeSort;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function getFilteredRows() {
  const query = searchInput.value.trim().toLowerCase();

  return allRows.filter((row) => {
    const matchesQuery = !query || row.display_model_name.toLowerCase().includes(query);
    const matchesTypeToggles = TYPE_FILTER_KEYS.every(
      (filterKey) => activeTypeFilters.has(filterKey) || !rowMatchesTypeFilter(row, filterKey),
    );
    return matchesQuery && matchesTypeToggles;
  });
}

function updatePlotTabState() {
  plotTabs.querySelectorAll(".plot-tab").forEach((button) => {
    const isActive = button.dataset.metricKey === activePlotMetricKey;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });
}

function buildPlotTabs() {
  plotTabs.innerHTML = plotMetrics
    .map(
      (metric) => `
        <button
          type="button"
          class="plot-tab"
          role="tab"
          data-metric-key="${metric.key}"
          aria-selected="false"
        >
          ${metric.tabLabel}
        </button>
      `,
    )
    .join("");

  plotTabs.querySelectorAll(".plot-tab").forEach((button) => {
    button.addEventListener("click", () => {
      activePlotMetricKey = button.dataset.metricKey;
      updatePlotTabState();
      renderPlot(getFilteredRows());
    });
  });

  updatePlotTabState();
}

function bindResultNoteSorts() {
  resultNoteSortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filterKey = button.dataset.typeSort;
      if (sortState.key === "type_presence" && sortState.typeSortFilter === filterKey) {
        sortState.asc = !sortState.asc;
      } else {
        sortState.key = "type_presence";
        sortState.typeSortFilter = filterKey;
        sortState.asc = false;
      }
      updateResultNoteSortState();
      renderCurrentView();
    });
  });
}

function formatPlotValue(value, metric) {
  const formatted = formatMetric(value, metric.digits);
  if (formatted === "-") {
    return formatted;
  }
  return metric.key === "reasoning_total" ? formatted : `${formatted}%`;
}

function formatSizeTick(value) {
  if (value >= 10 || Number.isInteger(value)) {
    return `${Number(value.toFixed(0))}B`;
  }
  return `${value.toFixed(1)}B`;
}

function getOwnershipColor(row) {
  if (row.is_proprietary_model) {
    return PLOT_PROPRIETARY_COLOR;
  }
  if (row.is_korean_model) {
    return PLOT_KOREAN_COLOR;
  }
  return PLOT_GENERAL_COLOR;
}

function getPlotSymbol(row) {
  return row.is_reasoning_model ? "triangle" : "circle";
}

function buildPlotTooltip(row, metric) {
  const typeLabels = [
    row.is_proprietary_model ? "P" : null,
    row.is_korean_model ? "K" : null,
    row.is_vision_model ? "V" : null,
    row.is_reasoning_model ? "R" : null,
  ]
    .filter(Boolean)
    .join(" ");
  return [
    `<strong>${escapeHtml(row.display_model_name)}</strong>`,
    `Size: ${escapeHtml(row.model_size_label || "-")}`,
    `${escapeHtml(metric.valueLabel)}: ${escapeHtml(formatPlotValue(row[metric.key], metric))}`,
    `Type: ${escapeHtml(typeLabels || "-")}`,
  ].join("<br/>");
}

function renderPlot(rows) {
  const metric = getActivePlotMetric();
  if (!window.echarts) {
    plotSubtitle.textContent = "Chart library failed to load.";
    return;
  }
  if (!plotChart) {
    plotChart = window.echarts.init(chartContainer);
    window.addEventListener("resize", () => plotChart && plotChart.resize());
  }

  const sizeMissingCount = rows.filter((row) => row.model_size_b === null || row.model_size_b === undefined).length;
  const metricMissingCount = rows.filter(
    (row) =>
      row.model_size_b !== null &&
      row.model_size_b !== undefined &&
      (row[metric.key] === null || row[metric.key] === undefined),
  ).length;
  const plottedRows = rows
    .filter(
      (row) =>
        row.model_size_b !== null &&
        row.model_size_b !== undefined &&
        row.model_size_b > 0 &&
        row[metric.key] !== null &&
        row[metric.key] !== undefined,
    )
    .map((row) => ({
      row,
      x: Number(row.model_size_b),
      y: Number(row[metric.key]),
    }));
  const unsizedRows = rows.filter(
    (row) =>
      (row.model_size_b === null || row.model_size_b === undefined) &&
      row[metric.key] !== null &&
      row[metric.key] !== undefined,
  );

  plotSubtitle.textContent = [
    `${plottedRows.length} models plotted`,
    metricMissingCount ? `${metricMissingCount} without ${metric.tabLabel.toLowerCase()} values` : null,
    sizeMissingCount ? `${sizeMissingCount} without public size metadata (shown as dashed lines)` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!plottedRows.length && !unsizedRows.length) {
    plotChart.clear();
    plotChart.setOption({
      title: {
        text: `No models match the current filter for ${metric.tabLabel.toLowerCase()}.`,
        left: "center",
        top: "middle",
        textStyle: { color: "#64748b", fontSize: 14, fontWeight: 500 },
      },
    });
    return;
  }

  const domainReferenceRows = (plottedRows.length ? plottedRows : allRows)
    .filter(
      (point) =>
        point.model_size_b !== null &&
        point.model_size_b !== undefined &&
        point.model_size_b > 0 &&
        point[metric.key] !== null &&
        point[metric.key] !== undefined,
    )
    .map((point) => ({
      x: Number(point.model_size_b),
      y: Number(point[metric.key]),
    }));
  const minX = domainReferenceRows.length ? Math.min(...domainReferenceRows.map((point) => point.x)) : 1;
  const maxX = domainReferenceRows.length ? Math.max(...domainReferenceRows.map((point) => point.x)) : 1000;
  const domainMin = Math.max(0.1, minX / 1.35);
  const domainMax = maxX * 1.15;
  const yDomainMin = metric.domain[0];
  const yDomainMax = metric.domain[1];
  const bucketBest = new Map();
  plottedRows.forEach((point) => {
    const bucket = Math.round(point.x);
    const current = bucketBest.get(bucket);
    if (!current || point.y > current.y) {
      bucketBest.set(bucket, point);
    }
  });

  const sizedSeriesData = plottedRows.map((point) => {
    const isBest = bucketBest.get(Math.round(point.x)) === point;
    const ownershipColor = getOwnershipColor(point.row);
    return {
      value: [point.x, point.y],
      name: point.row.display_model_name,
      symbol: getPlotSymbol(point.row),
      symbolSize: 11,
      itemStyle: {
        color: ownershipColor,
        opacity: isBest ? 1 : 0.2,
      },
      label: isBest
        ? {
            show: true,
            position: "top",
            formatter: "{b}",
            fontSize: 10,
            color: ownershipColor,
          }
        : { show: false },
      row: point.row,
    };
  });

  const bestUnsized = unsizedRows.reduce((best, row) => {
    if (!best || Number(row[metric.key]) > Number(best[metric.key])) {
      return row;
    }
    return best;
  }, null);

  const unsizedMarkLines = unsizedRows.map((row) => {
    const isBest = bestUnsized && row.model_key === bestUnsized.model_key;
    const ownershipColor = getOwnershipColor(row);
    return {
      yAxis: Number(row[metric.key]),
      name: row.display_model_name,
      lineStyle: {
        color: ownershipColor,
        type: "dashed",
        width: isBest ? 1.8 : 1.1,
        opacity: isBest ? 0.82 : 0.5,
      },
      label: {
        show: true,
        formatter: row.display_model_name,
        position: "insideEndTop",
        fontSize: 10,
        color: ownershipColor,
      },
    };
  });

  plotChart.setOption(
    {
      animation: true,
      animationDuration: 800,
      animationEasing: "cubicOut",
      animationDurationUpdate: 500,
      animationEasingUpdate: "cubicInOut",
      tooltip: {
        trigger: "item",
        axisPointer: { type: "cross" },
        formatter: (params) => {
          if (params?.data?.row) {
            return buildPlotTooltip(params.data.row, metric);
          }
          const rawValue = Array.isArray(params?.value) ? params.value[1] : params?.value;
          return [
            `<strong>${escapeHtml(params?.name || "Model")}</strong>`,
            `${escapeHtml(metric.valueLabel)}: ${escapeHtml(formatPlotValue(rawValue, metric))}`,
          ].join("<br/>");
        },
      },
      grid: { left: 50, right: 20, top: 40, bottom: 40 },
      xAxis: {
        name: "Parameters (B)",
        nameLocation: "center",
        nameGap: 28,
        type: "log",
        min: domainMin,
        max: domainMax,
        axisLabel: { formatter: (value) => formatSizeTick(value) },
        axisPointer: {
          snap: true,
          label: { formatter: (params) => formatSizeTick(params.value) },
        },
      },
      yAxis: {
        name: metric.axisLabel,
        nameLocation: "center",
        nameGap: 35,
        min: yDomainMin,
        max: yDomainMax,
        interval: metric.tickValues.length > 1 ? metric.tickValues[1] - metric.tickValues[0] : null,
        axisLabel: {
          formatter: (value) => (metric.key === "reasoning_total" ? value.toFixed(0) : `${value.toFixed(0)}%`),
        },
        axisPointer: {
          snap: true,
          label: {
            formatter: (params) =>
              metric.key === "reasoning_total" ? params.value.toFixed(2) : `${params.value.toFixed(1)}%`,
          },
        },
      },
      series: [
        {
          type: "scatter",
          symbolKeepAspect: true,
          data: sizedSeriesData,
          z: 2,
          markLine: unsizedMarkLines.length
            ? {
                symbol: "none",
                animationDuration: 1200,
                animationEasing: "cubicOut",
                data: unsizedMarkLines,
              }
            : undefined,
        },
      ],
    },
    true,
  );
}

function buildCitation() {
  citationBlock.textContent = `@inproceedings{kim2026kmetbench,
title={K-MetBench: A Multi-Dimensional Benchmark for Fine-Grained Evaluation of Expert Reasoning, Locality, and Multimodality in Meteorology},
author={Kim, Soyeon and Kang, Cheongwoong and Lee, Myeongjin and Chang, Eun-Chul and Lee, Jaedeok and Choi, Jaesik},
booktitle={The 64th Annual Meeting of the Association for Computational Linguistics},
year={2026},
url={https://openreview.net/forum?id=1Gn5pKek8k}
}`;
}

function renderRows(rows) {
  const sortedRows = [...rows].sort(compareRows);
  leaderboardBody.innerHTML = sortedRows
    .map((row, index) => {
      const sizeLabel = row.model_size_label || "-";
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
          </td>
          <td class="size-cell">${sizeLabel}</td>
          <td class="type-cell">${renderTypeTags(row)}</td>
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

function renderCurrentView() {
  const filtered = getFilteredRows();
  renderRows(filtered);
  try {
    renderPlot(filtered);
  } catch (error) {
    console.error("Failed to render plot", error);
    plotSubtitle.textContent = "Plot failed to render, but the table data is still available.";
  }
}

function bindSorting() {
  document.querySelectorAll("#lb-table thead th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (th.classList.contains("type-header")) {
        th.style.cursor = "pointer";
      }
      if (sortState.key === key) {
        sortState.asc = !sortState.asc;
      } else {
        sortState.key = key;
        sortState.typeSortFilter = null;
        sortState.asc = key === "display_model_name" || key === "rank";
      }
      updateResultNoteSortState();
      renderCurrentView();
    });
  });
}

function bindTypeFilters() {
  typeFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filterKey = button.dataset.typeFilter;
      if (activeTypeFilters.has(filterKey)) {
        activeTypeFilters.delete(filterKey);
      } else {
        activeTypeFilters.add(filterKey);
      }
      updateTypeFilterState();
      renderCurrentView();
    });
  });
}

async function loadPage() {
  buildCitation();
  buildPlotTabs();

  const leaderboardResponse = await fetch(`./data/leaderboard_table_1_source.json?v=${SITE_ASSET_VERSION}`);
  const leaderboardPayload = await leaderboardResponse.json();
  allRows = [...leaderboardPayload.rows].sort((left, right) => right.accuracy_pct - left.accuracy_pct);

  buildMeta(allRows);
  bindTypeFilters();
  bindResultNoteSorts();
  updateTypeFilterState();
  updateResultNoteSortState();
  renderCurrentView();
  bindSorting();
}

searchInput.addEventListener("input", renderCurrentView);
loadPage().catch((error) => {
  metaStrip.innerHTML = `<div class="meta-pill muted">Failed to load leaderboard data: ${error}</div>`;
});
