import { Link } from "waku";

export default function NotFoundPage() {
  return (
    <main className="not-found">
      <div className="not-found-mark" aria-hidden="true">#</div>
      <h1>We couldn't find that room.</h1>
      <p>It may have moved, or the channel name isn't valid.</p>
      <Link to="/">Return to General →</Link>
    </main>
  );
}

export const getConfig = async () => ({ render: "static" as const });
