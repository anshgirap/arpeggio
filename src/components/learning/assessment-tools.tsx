import styles from "./assessment-tools.module.css";

export function AssessmentProgress({ current, total, completed, label = "Question" }: { current: number; total: number; completed: number; label?: string }) {
  const value = Math.max(0, Math.min(completed, total));
  return <div className={styles.progress} aria-label={`${label} ${current} of ${total}`}>
    <div className={styles.progressMeta}><span>{label} {current} of {total}</span><span>{value} complete</span></div>
    <div className={styles.track} role="progressbar" aria-label={`${label} progress`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={value}><span style={{ width: `${(value / total) * 100}%` }} /></div>
  </div>;
}

export function AssessmentComplete({ title, message, onContinue }: { title: string; message: string; onContinue: () => void }) {
  return <section className={styles.complete} aria-live="polite">
    <span className={styles.mark} aria-hidden="true">✓</span>
    <p className={styles.kicker}>Assessment complete</p>
    <h2>{title}</h2>
    <p className={styles.message}>{message}</p>
    <p className={styles.encouragement}>You took the time to listen, compare and work it out.</p>
    <button className={styles.continue} onClick={onContinue}>Continue the lesson ↗</button>
  </section>;
}
