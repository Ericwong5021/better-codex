import type { BoardFeatureState } from "./model.js";

export interface BoardFeatureView {
  render(state: Readonly<BoardFeatureState>): void;
}

export function renderBoardFeature(view: BoardFeatureView, state: BoardFeatureState) {
  if (state.destroyed) throw new Error("board_feature_destroyed");
  state.active = true;
  state.renderCount += 1;
  view.render(state);
}
