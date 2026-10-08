import { Link } from "waku";
import { Counter } from "../components/counter";

export default function Home() {
  return <section><title>Celld + Waku</title><h1>Full-stack React on Celld</h1><p>Waku owns pages, layouts, server components and API routes. Celld owns Worker execution and bindings.</p><Counter /><p><Link to="/demo">Visit the server-rendered demo →</Link></p></section>;
}

export const getConfig = async () => ({ render: "static" as const });
