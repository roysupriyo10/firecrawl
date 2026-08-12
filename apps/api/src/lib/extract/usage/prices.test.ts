import { describe, expect, it } from "vitest";
import { modelPrices } from "./prices";

describe("modelPrices", () => {
  it("keeps the generated litellm entries", () => {
    expect(modelPrices["gpt-4o-mini"]?.mode).toBe("chat");
  });

  it("carries MiMo, which litellm does not ship", () => {
    const pro = modelPrices["mimo-v2.5-pro"];
    expect(pro).toBeDefined();
    expect(pro.mode).toBe("chat");
    // 1M context / 128K output — the numbers getModelLimits reads.
    expect(pro.max_input_tokens).toBe(1048576);
    expect(pro.max_output_tokens).toBe(131072);
    // $0.435 per 1M input tokens.
    expect(pro.input_cost_per_token).toBeCloseTo(4.35e-7, 12);
  });

  it("exposes MiMo under the provider/model key too", () => {
    expect(modelPrices["mimo/mimo-v2.5"]).toEqual(modelPrices["mimo-v2.5"]);
  });
});
