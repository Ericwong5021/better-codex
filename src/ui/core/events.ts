export function listen(target: EventTarget, type: string, listener: EventListener, signal: AbortSignal, options: AddEventListenerOptions = {}) {
  target.addEventListener(type, listener, { ...options, signal });
}
