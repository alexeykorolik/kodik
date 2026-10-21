import { Component, StrictMode, Suspense, lazy, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
const legacy =
  Capacitor.isNativePlatform() ||
  (import.meta.env.DEV && import.meta.env.VITE_LEGACY_TEST === "true") ||
  new URLSearchParams(location.search).has("legacy");
const B2BApp = lazy(async () => {
  await import("./b2b/styles.css");
  return import("./b2b/App");
});
const Legacy = lazy(async () => {
  // These styles deliberately override one another. Parallel imports let network/cache
  // timing change the cascade, collapsing Blockly and moving controls after a reload.
  await import("./styles.css");
  await import("./mobileLesson.css");
  await import("./designSystem.css");
  await import("./appPolish.css");
  const { startNativeShell } = await import("./nativeShell");
  requestAnimationFrame(() => {
    void startNativeShell().catch(() => {});
  });
  return import("./App");
});
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="fatal">
        <h1>Не удалось открыть Kodik</h1>
        <button onClick={() => location.reload()}>Обновить страницу</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Boundary>
      <Suspense fallback={<p>Открываем Kodik…</p>}>
        {legacy ? <Legacy /> : <B2BApp />}
      </Suspense>
    </Boundary>
  </StrictMode>,
);
