"use client";
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return <button type="button" onClick={() => setCount((current) => current + 1)}>Client counter: {count}</button>;
}
