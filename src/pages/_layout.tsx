import type { ReactNode } from "react";
import { Link } from "waku";
import "../styles.css";

export default function Layout({ children }: { children: ReactNode }) {
  return <div className="shell"><header><Link to="/">Celld + Waku</Link><nav><Link to="/">Home</Link><Link to="/demo">Demo</Link></nav></header><main>{children}</main><footer>Waku + React Server Components on a Workers runtime</footer></div>;
}

export const getConfig = async () => ({ render: "static" as const });
