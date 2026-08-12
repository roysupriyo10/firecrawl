// Models the generated litellm dump (./model-prices.ts) does not carry.
// Keep this file hand-maintained; regenerating model-prices.ts must not
// clobber it.
//
// Xiaomi MiMo v2.5 series — overseas pay-as-you-go pricing, USD per token
// (published as USD per 1M tokens):
//   mimo-v2.5-pro  in $0.435  out $0.87  cache hit $0.0036
//   mimo-v2.5      in $0.14   out $0.28  cache hit $0.0028
// Context window 1M, maximum output 128K for both.
// https://mimo.mi.com/docs/en-US/price/pay-as-you-go
// https://mimo.mi.com/docs/en-US/quick-start/summary/model
const MIMO_V2_5_PRO = {
  max_tokens: 131072,
  max_input_tokens: 1048576,
  max_output_tokens: 131072,
  input_cost_per_token: 0.435 / 1_000_000,
  output_cost_per_token: 0.87 / 1_000_000,
  cache_read_input_token_cost: 0.0036 / 1_000_000,
  litellm_provider: "mimo",
  mode: "chat",
  supports_function_calling: true,
  supports_prompt_caching: true,
  supports_system_messages: true,
  supports_tool_choice: true,
};

const MIMO_V2_5 = {
  ...MIMO_V2_5_PRO,
  input_cost_per_token: 0.14 / 1_000_000,
  output_cost_per_token: 0.28 / 1_000_000,
  cache_read_input_token_cost: 0.0028 / 1_000_000,
};

export const extraModelPrices = {
  "mimo-v2.5-pro": MIMO_V2_5_PRO,
  "mimo-v2.5": MIMO_V2_5,
  // Cost tracking in lib/deterministicJson keys prices as `${provider}/${model}`.
  "mimo/mimo-v2.5-pro": MIMO_V2_5_PRO,
  "mimo/mimo-v2.5": MIMO_V2_5,
};
