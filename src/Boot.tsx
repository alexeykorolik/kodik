/** The loading screen. index.html paints the same markup before any script runs and carries its
 *  styles inline, so it looks identical while the app chunk and its CSS are still on the way. */
export function Boot({ text = "Открываем Kodik…" }: { text?: string }) {
  return (
    <div className="boot" role="status" aria-live="polite">
      <span className="boot-mark" aria-hidden="true">k.</span>
      <span className="boot-dots" aria-hidden="true"><i /><i /><i /></span>
      <span className="boot-text">{text}</span>
    </div>
  );
}
