import { supabase_rr_service } from "../../../services/supabase";
import { FeedbackLogger } from "./internal-types";

function startOfUtcDay(now: Date = new Date()): Date {
  const start = new Date(now.getTime());
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

export async function sumCreditsRefundedToday(
  dbTeamId: string,
  logger: FeedbackLogger,
): Promise<number> {
  const since = startOfUtcDay().toISOString();
  const { data, error } = await supabase_rr_service
    .from("search_feedback")
    .select("credits_refunded")
    .eq("team_id", dbTeamId)
    .gte("created_at", since);

  if (error) {
    logger.warn(
      "Failed to compute feedback refund total; allowing refund this call",
      { error },
    );
    return 0;
  }

  return (data ?? []).reduce(
    (sum, row: { credits_refunded: number | null }) =>
      sum + (row.credits_refunded ?? 0),
    0,
  );
}
