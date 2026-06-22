export type BrokerResearchRating = {
  grade: string;
  takeaway: string;
};

export function serializeBrokerRating(rating: BrokerResearchRating) {
  return JSON.stringify(rating);
}

export function parseBrokerRecommendation(
  value: string,
): BrokerResearchRating {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      grade: "—",
      takeaway: "No broker rating captured.",
    };
  }

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<
        BrokerResearchRating & {
          stance?: string;
          breakdown?: string;
        }
      >;

      return {
        grade: String(parsed.grade ?? "—").trim(),
        takeaway: String(parsed.takeaway ?? trimmed).trim(),
      };
    } catch {
      // Fall through to legacy plain-text format.
    }
  }

  return {
    grade: "—",
    takeaway: trimmed,
  };
}
