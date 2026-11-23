import styles from "./lesson-feedback.module.css";

export type LessonFeedbackTone = "success" | "error" | "neutral";

export function LessonFeedback({ message, tone }: { message: string; tone: LessonFeedbackTone }) {
  const symbol = tone === "success" ? "✓" : tone === "error" ? "!" : "♪";
  return <p className={`${styles.feedback} ${styles[tone]}`} role="status" aria-live="polite">
    <span className={styles.symbol} aria-hidden="true">{symbol}</span>
    <span>{message}</span>
  </p>;
}
