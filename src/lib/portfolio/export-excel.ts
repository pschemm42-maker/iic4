import { calculatePortfolioSummary } from "@/lib/portfolio/metrics";
import type { PortfolioHoldingWithMetrics } from "@/lib/types/portfolio";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatPurchaseDate(value: string | null, lotCount: number) {
  if (!value) {
    return "";
  }

  const formatted = new Date(value).toLocaleDateString("en-US");
  return lotCount > 1 ? `${formatted} (${lotCount} lots)` : formatted;
}

function formatCurrencyValue(value: number | null) {
  if (value === null) {
    return "";
  }

  return value;
}

function formatPercentValue(value: number | null) {
  if (value === null) {
    return "";
  }

  return value / 100;
}

function gainLossColor(value: number | null) {
  if (value === null || value === 0) {
    return "#64748b";
  }

  return value > 0 ? "#059669" : "#dc2626";
}

export function buildPortfolioExcelHtml(holdings: PortfolioHoldingWithMetrics[]) {
  const sortedHoldings = [...holdings].sort((left, right) =>
    left.ticker.localeCompare(right.ticker, undefined, { sensitivity: "base" }),
  );
  const summary = calculatePortfolioSummary(sortedHoldings);
  const exportedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const summaryLine =
    `Holdings: ${summary.holdingCount}` +
    ` | Total cost basis: ${summary.totalCostBasis.toLocaleString("en-US", { style: "currency", currency: "USD" })}` +
    ` | Market value: ${summary.totalMarketValue?.toLocaleString("en-US", { style: "currency", currency: "USD" }) ?? "—"}` +
    ` | Total gain/loss: ${summary.totalGainLoss?.toLocaleString("en-US", { style: "currency", currency: "USD" }) ?? "—"}` +
    ` | Total return: ${summary.totalGainLossPercent !== null ? `${summary.totalGainLossPercent.toFixed(2)}%` : "—"}`;

  const rows = sortedHoldings
    .map((holding, index) => {
      const rowBackground = index % 2 === 1 ? "#fafafa" : "#ffffff";

      return `<tr style="background:${rowBackground};">
  <td style="font-weight:700;">${escapeHtml(holding.ticker)}</td>
  <td>${escapeHtml(holding.company_name)}</td>
  <td>${escapeHtml(holding.sector || "")}</td>
  <td style="text-align:right;" x:num>${holding.shares}</td>
  <td style="text-align:right; mso-number-format:'\\$#,##0.00';" x:num>${formatCurrencyValue(holding.average_cost_per_share)}</td>
  <td style="text-align:right; mso-number-format:'\\$#,##0.00';" x:num>${formatCurrencyValue(holding.current_price)}</td>
  <td style="text-align:right; mso-number-format:'\\$#,##0.00';" x:num>${formatCurrencyValue(holding.costBasis)}</td>
  <td style="text-align:right; mso-number-format:'\\$#,##0.00';" x:num>${formatCurrencyValue(holding.marketValue)}</td>
  <td style="text-align:right; color:${gainLossColor(holding.gainLoss)}; mso-number-format:'\\$#,##0.00';" x:num>${formatCurrencyValue(holding.gainLoss)}</td>
  <td style="text-align:right; color:${gainLossColor(holding.gainLossPercent)}; mso-number-format:'0.00%';" x:num>${formatPercentValue(holding.gainLossPercent)}</td>
  <td style="text-align:right; mso-number-format:'0.00%';" x:num>${formatPercentValue(holding.portfolioWeight)}</td>
  <td style="text-align:right; mso-number-format:'0.00';" x:num>${holding.pe_ratio ?? ""}</td>
  <td style="text-align:right; mso-number-format:'0.00%';" x:num>${formatPercentValue(holding.dividend_yield)}</td>
  <td>${escapeHtml(formatPurchaseDate(holding.purchase_date, holding.purchase_count))}</td>
  <td style="text-align:right;" x:num>${holding.purchase_count}</td>
  <td>${escapeHtml(holding.notes || "")}</td>
</tr>`;
    })
    .join("\n");

  const totalsRow =
    sortedHoldings.length > 0
      ? `<tr style="background:#f4f4f5; font-weight:700;">
  <td>Totals</td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  <td style="text-align:right; mso-number-format:'\\$#,##0.00';" x:num>${summary.totalCostBasis}</td>
  <td style="text-align:right; mso-number-format:'\\$#,##0.00';" x:num>${formatCurrencyValue(summary.totalMarketValue)}</td>
  <td style="text-align:right; color:${gainLossColor(summary.totalGainLoss)}; mso-number-format:'\\$#,##0.00';" x:num>${formatCurrencyValue(summary.totalGainLoss)}</td>
  <td style="text-align:right; color:${gainLossColor(summary.totalGainLossPercent)}; mso-number-format:'0.00%';" x:num>${formatPercentValue(summary.totalGainLossPercent)}</td>
  <td style="text-align:right; mso-number-format:'0.00%';" x:num>${summary.totalMarketValue !== null && summary.totalMarketValue > 0 ? 1 : ""}</td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
</tr>`
      : "";

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Portfolio</x:Name>
          <x:WorksheetOptions>
            <x:FreezePanes />
            <x:FrozenNoSplit />
            <x:SplitHorizontal>5</x:SplitHorizontal>
            <x:TopRowBottomPane>5</x:TopRowBottomPane>
            <x:ActivePane>2</x:ActivePane>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 10pt; }
    td, th { border: 1px solid #e4e4e7; padding: 4px 6px; vertical-align: middle; }
    .title { background: #0c1929; color: #ffffff; font-size: 14pt; font-weight: 700; }
    .meta { background: #ffffff; color: #64748b; font-size: 9pt; }
    .summary { background: #f4f4f5; color: #334155; font-size: 10pt; font-weight: 700; }
    .header { background: #14b8a6; color: #ffffff; font-size: 10pt; font-weight: 700; text-align: center; }
  </style>
</head>
<body>
  <table>
    <tr>
      <td class="title" colspan="16">Independent Investment Club IV — Equity Portfolio</td>
    </tr>
    <tr>
      <td class="meta" colspan="16">Exported ${escapeHtml(exportedAt)}</td>
    </tr>
    <tr>
      <td class="summary" colspan="16">${escapeHtml(summaryLine)}</td>
    </tr>
    <tr><td colspan="16"></td></tr>
    <tr>
      <th class="header">Ticker</th>
      <th class="header">Company</th>
      <th class="header">Sector</th>
      <th class="header">Shares</th>
      <th class="header">Avg Cost</th>
      <th class="header">Current Price</th>
      <th class="header">Cost Basis</th>
      <th class="header">Market Value</th>
      <th class="header">Gain/Loss</th>
      <th class="header">Return %</th>
      <th class="header">Weight %</th>
      <th class="header">P/E</th>
      <th class="header">Div Yield %</th>
      <th class="header">Purchase Date</th>
      <th class="header">Lots</th>
      <th class="header">Notes</th>
    </tr>
    ${rows}
    ${totalsRow}
  </table>
</body>
</html>`;
}

export function downloadPortfolioExcel(
  holdings: PortfolioHoldingWithMetrics[],
  filename?: string,
) {
  const html = buildPortfolioExcelHtml(holdings);
  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    filename ?? `IIC4-portfolio-${new Date().toISOString().slice(0, 10)}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}
