import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet";
type ButtonSize = "small" | "medium" | "large";

export function Button({ variant = "primary", size = "medium", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={`ui-button ui-button--${variant} ui-button--${size} ${className}`} {...props} />;
}

export function Card({ children, className = "", surface = "cream", ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode; surface?: "cream" | "lavender" | "lime" | "coral" }) {
  return <section className={`ui-card ui-card--${surface} ${className}`} {...props}>{children}</section>;
}

export function Badge({ children, tone = "lime" }: { children: ReactNode; tone?: "lime" | "lavender" | "coral" | "dark" }) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const boundedValue = Math.max(0, Math.min(100, value));
  return <div className="progress-wrap"><div className="progress-meta"><span>{label}</span><span>{boundedValue}%</span></div><div className="progress-track" role="progressbar" aria-label={label} aria-valuenow={boundedValue} aria-valuemin={0} aria-valuemax={100}><span className="progress-fill" style={{ width: `${boundedValue}%` }} /></div></div>;
}
