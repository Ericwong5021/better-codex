import assert from "node:assert/strict";
import test from "node:test";
import { normalizeModelCatalog } from "../src/model-catalog.js";

test("normalizes the live Codex model/list response", () => {
  const catalog = normalizeModelCatalog({ data: [
    {
      id: "alias",
      model: "gpt-next",
      displayName: "GPT Next",
      description: "Current model",
      hidden: false,
      isDefault: true,
      defaultReasoningEffort: "high",
      supportedReasoningEfforts: [
        { reasoningEffort: "low", description: "Fast" },
        { reasoningEffort: "high", description: "Deep" },
      ],
    },
    { model: "hidden-model", hidden: true },
  ] });

  assert.deepEqual(catalog, [{
    id: "gpt-next",
    displayName: "GPT Next",
    description: "Current model",
    isDefault: true,
    defaultReasoningEffort: "high",
    supportedReasoningEfforts: [
      { value: "low", description: "Fast" },
      { value: "high", description: "Deep" },
    ],
    serviceTiers: [],
  }]);
});
