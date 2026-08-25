import type { BoardFeatureState } from "./model.js";
import { renderBoardFeature, type BoardFeatureView } from "./view.js";

export function createBoardController(view: BoardFeatureView) {
  const state: BoardFeatureState = { active: false, destroyed: false, renderCount: 0 };
  return {
    render: () => renderBoardFeature(view, state),
    deactivate: () => { state.active = false; },
    destroy: () => { state.active = false; state.destroyed = true; },
  };
}
