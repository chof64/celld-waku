import type { ReactNode } from "react";
import "../styles.css";

export default function Layout({ children }: { children: ReactNode }) {
  return <div className="app-root">{children}</div>;
}

export const getConfig = async () => ({ render: "static" as const });
