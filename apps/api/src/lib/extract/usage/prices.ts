import { modelPrices as generatedModelPrices } from "./model-prices";
import { extraModelPrices } from "./model-prices-extra";

interface ModelPrice {
  max_tokens?: number;
  max_input_tokens?: number;
  max_output_tokens?: number;
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  input_cost_per_request?: number;
  cache_read_input_token_cost?: number;
  mode?: string;
  [key: string]: unknown;
}

/**
 * Pricing and context limits for every model we can be pointed at: litellm's
 * generated table plus the hand-maintained additions it does not carry.
 * Always read prices through here, never from ./model-prices directly.
 */
export const modelPrices: Record<string, ModelPrice> = {
  ...generatedModelPrices,
  ...extraModelPrices,
};
