export interface ComponentContext {
  feature: string;
  host: string;
  mountId: string;
  themeSource: string;
}

export interface ComponentHandle<P> {
  element: HTMLElement;
  update(next: P): void;
  destroy(): void;
}

export function componentFailure(component: string, phase: string, context: ComponentContext, error: unknown) {
  return new Error(JSON.stringify({
    code: "ui_component_failed",
    component,
    feature: context.feature,
    host: context.host,
    mountId: context.mountId,
    phase,
    themeSource: context.themeSource,
  }), { cause: error });
}
