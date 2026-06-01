import {
  isPostgrestNoRowsError,
  supabase_rr_service,
  supabase_service,
} from "../../../services/supabase";
import { EndpointFeedbackEndpoint } from "../types";
import {
  FeedbackJobRow,
  FeedbackRecordOptions,
  RefundPolicySnapshot,
} from "./internal-types";

type DbError = { code?: string } & Record<string, unknown>;

type ExistingFeedback = {
  id: string;
  credits_refunded: number | null;
};

function tableForEndpoint(endpoint: EndpointFeedbackEndpoint): string {
  switch (endpoint) {
    case "search":
      return "searches";
    case "scrape":
      return "scrapes";
    case "parse":
      return "parses";
    case "map":
      return "maps";
  }
}

function selectForEndpoint(endpoint: EndpointFeedbackEndpoint): string {
  switch (endpoint) {
    case "map":
      return "id, request_id, team_id, credits_cost, created_at, options";
    default:
      return "id, request_id, team_id, credits_cost, created_at, is_successful, options";
  }
}

function feedbackMetadata(
  options: FeedbackRecordOptions,
): Record<string, unknown> {
  return {
    ...(options.feedback.metadata ?? {}),
    ...(options.feedback.url ? { url: options.feedback.url } : {}),
    ...(options.feedback.pageNumbers
      ? { pageNumbers: options.feedback.pageNumbers }
      : {}),
  };
}

export async function lookupFeedbackJob(
  endpoint: EndpointFeedbackEndpoint,
  jobId: string,
  dbTeamId: string,
): Promise<FeedbackJobRow | null> {
  const { data, error } = await supabase_rr_service
    .from(tableForEndpoint(endpoint))
    .select(selectForEndpoint(endpoint))
    .eq("id", jobId)
    .eq("team_id", dbTeamId)
    .single();

  if (error) {
    if (isPostgrestNoRowsError(error)) return null;
    throw error;
  }

  if (!data) return null;

  const row = data as any;
  return {
    endpoint,
    id: row.id,
    request_id: row.request_id ?? null,
    team_id: row.team_id,
    credits_cost: row.credits_cost ?? 0,
    created_at: row.created_at,
    is_successful: endpoint === "map" ? true : (row.is_successful ?? null),
    options: row.options ?? null,
  };
}

export async function insertFeedback(params: {
  feedbackId: string;
  options: FeedbackRecordOptions;
  job: FeedbackJobRow;
  dbTeamId: string;
  apiKeyId?: number | null;
}): Promise<DbError | null> {
  const { feedbackId, options, job, dbTeamId, apiKeyId } = params;
  const { error } = await supabase_service.from("search_feedback").insert({
    id: feedbackId,
    search_id: options.endpoint === "search" ? options.jobId : null,
    endpoint: options.endpoint,
    job_id: options.jobId,
    request_id: job.request_id,
    api_version: "v2",
    team_id: dbTeamId,
    api_key_id: apiKeyId ?? null,
    overall_rating: options.feedback.rating,
    issue_types: options.feedback.issues ?? [],
    tags: options.feedback.tags ?? [],
    comment: options.feedback.note ?? null,
    valuable_sources: options.feedback.valuableSources ?? [],
    missing_content: options.feedback.missingContent ?? [],
    query_suggestions: options.feedback.querySuggestions ?? null,
    expected: options.feedback.expected ?? null,
    actual: options.feedback.actual ?? null,
    metadata: feedbackMetadata(options),
    job_status: job.is_successful === false ? "failed" : "completed",
    credits_billed: job.credits_cost ?? 0,
    credits_refunded: 0,
    refund_policy: null,
    integration: options.feedback.integration ?? null,
    origin: options.feedback.origin ?? null,
  });

  return error as DbError | null;
}

async function findFeedbackByJob(
  dbTeamId: string,
  endpoint: EndpointFeedbackEndpoint,
  jobId: string,
): Promise<ExistingFeedback | null> {
  const { data, error } = await supabase_rr_service
    .from("search_feedback")
    .select("id, credits_refunded")
    .eq("team_id", dbTeamId)
    .eq("endpoint", endpoint)
    .eq("job_id", jobId)
    .single();

  if (error) {
    if (isPostgrestNoRowsError(error)) return null;
    throw error;
  }

  return data as ExistingFeedback | null;
}

async function findSearchFeedbackByLegacyId(
  dbTeamId: string,
  searchId: string,
): Promise<ExistingFeedback | null> {
  const { data, error } = await supabase_rr_service
    .from("search_feedback")
    .select("id, credits_refunded")
    .eq("team_id", dbTeamId)
    .eq("search_id", searchId)
    .single();

  if (error) {
    if (isPostgrestNoRowsError(error)) return null;
    throw error;
  }

  return data as ExistingFeedback | null;
}

export async function findExistingFeedback(
  dbTeamId: string,
  endpoint: EndpointFeedbackEndpoint,
  jobId: string,
): Promise<ExistingFeedback | null> {
  return (
    (await findFeedbackByJob(dbTeamId, endpoint, jobId)) ??
    (endpoint === "search"
      ? await findSearchFeedbackByLegacyId(dbTeamId, jobId)
      : null)
  );
}

export async function updateFeedbackRefundDetails(
  feedbackId: string,
  creditsRefunded: number,
  policy: RefundPolicySnapshot,
): Promise<DbError | null> {
  const { error } = await supabase_service
    .from("search_feedback")
    .update({
      credits_refunded: creditsRefunded,
      refund_policy: policy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", feedbackId);

  return error as DbError | null;
}
