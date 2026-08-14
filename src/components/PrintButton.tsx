"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function PrintButton() {
  return (
    <Button onClick={() => window.print()} icon={<Printer />}>
      Imprimir
    </Button>
  );
}
