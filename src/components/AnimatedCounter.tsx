import React from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatter?: (value: number) => string;
}

export default function AnimatedCounter({ value, formatter = (v) => Math.floor(v).toLocaleString() }: AnimatedCounterProps) {
  return <span>{formatter(value)}</span>;
}
