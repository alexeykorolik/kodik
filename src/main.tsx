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
  await Promise.all([
    import("./styles.css"),
    import("./mobileLesson.css"),
    import("./designSystem.css"),
    import("./appPolish.css"),
  ]);
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
