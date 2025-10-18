"use client";

import { Suspense } from "react";
import TerminationsContent from "./TerminationsContent";

export default function TerminationsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading terminations...</div>
      </div>
    }>
      <TerminationsContent />
    </Suspense>
  );
}