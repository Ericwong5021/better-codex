import type { SettingsFeatureState } from "./model.js";
import { createDotsSetupView, openSettingsFeature, type SettingsFeatureView } from "./view.js";
import type { DotsSetupState } from "./model.js";
import { dotsSetupMessage } from "./model.js";
import type { ComponentContext } from "../../core/component.js";

export function createSettingsController(view: SettingsFeatureView) {
  const state: SettingsFeatureState = { destroyed: false, openCount: 0 };
  return {
    open: (initialView: string) => openSettingsFeature(view, state, initialView),
    destroy: () => { state.destroyed = true; },
  };
}

export function createDotsSetupController(context: ComponentContext, options: {
  translate(value: string): string;
  english: boolean;
  copyText(value: string): Promise<void>;
}) {
  const state: DotsSetupState = { copying: false, copied: false, copyFailed: false };
  let destroyed = false;
  const view = createDotsSetupView(context, {
    ...options,
    async onCopy() {
      if (destroyed || state.copying) return;
      state.copying = true; state.copied = false; state.copyFailed = false; view.update(state);
      try { await options.copyText(dotsSetupMessage(options.english)); if (!destroyed) state.copied = true; }
      catch { if (!destroyed) state.copyFailed = true; }
      finally { if (!destroyed) { state.copying = false; view.update(state); } }
    },
  });
  view.update(state);
  return { element: view.element, update() { if (!destroyed) view.update(state); }, destroy() { if (destroyed) return; destroyed = true; view.destroy(); } };
}
