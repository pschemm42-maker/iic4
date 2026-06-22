"use client";

import { parseBrokerRecommendation } from "@/lib/equity-selection/broker-ratings";
import type { StockSuggestionResearch } from "@/lib/types/equity-selection";
import { RESEARCH_BROKER_SOURCES } from "@/lib/types/equity-selection";

function BrokerRatingCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const rating = parseBrokerRecommendation(value);

  return (
    <div className="rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        {rating.grade}
      </p>
      <p className="mt-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
        {rating.takeaway}
      </p>
    </div>
  );
}

export function BrokerRecommendationsSection({
  research,
}: {
  research: StockSuggestionResearch;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        Broker platform grades
      </h3>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Robinhood uses live Finnhub sell-side analyst consensus. Schwab and
        Fidelity proprietary grades usually require a brokerage login and may
        show as Unavailable here even when visible inside those platforms.
      </p>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {RESEARCH_BROKER_SOURCES.map((broker) => (
          <BrokerRatingCard
            key={broker.key}
            label={broker.label}
            value={research[broker.key]}
          />
        ))}
      </div>
    </section>
  );
}
