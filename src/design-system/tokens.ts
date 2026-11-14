export const tokens = {
  color: {
    ivory: "#F1EBDD",
    charcoal: "#202020",
    lime: "#D7F36A",
    lavender: "#B9A7F5",
    coral: "#FF927E",
    cream: "#EAE1D1",
    creamSecondary: "#F6F0E5",
    lavenderSoft: "#E8E2F5",
    limeSoft: "#EDF4D1",
    coralSoft: "#FAE4DD",
  },
  spacing: ["0.25rem", "0.5rem", "0.75rem", "1rem", "1.25rem", "1.5rem", "2rem", "2.5rem", "3rem", "4rem"],
  radius: { small: "0.75rem", medium: "1.25rem", large: "1.75rem", pill: "999px" },
  shadow: { soft: "0 12px 32px rgb(32 32 32 / 6%)", lift: "0 18px 40px rgb(32 32 32 / 10%)" },
  transition: { fast: "160ms ease", base: "240ms cubic-bezier(0.2, 0.75, 0.25, 1)" },
} as const;
