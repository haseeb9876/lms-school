"use client";

import { Printer } from "lucide-react";
import { Button } from "./Button";

/**
 * Triggers the browser's own print dialog. A school office prints result
 * cards and fee receipts constantly, and the print stylesheet in
 * globals.css already strips the app chrome — so this needs no separate
 * "printable version" page to maintain alongside the real one.
 */
export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button variant="secondary" size="sm" onClick={() => window.print()} data-print-hide>
      <Printer className="h-4 w-4" aria-hidden="true" />
      {label}
    </Button>
  );
}
