"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { UsageTable, type UsageItem } from "@/components/billingsdk/usage-table";


interface BillingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const usageHistory: UsageItem[] = [
  {
    model: "gpt-5",
    inputWithCache: 0,
    inputWithoutCache: 518131,
    cacheRead: 1646080,
    output: 103271,
    totalTokens: 2267482,
  },
  {
    model: "claude-3.5-sonnet",
    inputWithCache: 176177,
    inputWithoutCache: 28413,
    cacheRead: 434612,
    output: 8326,
    totalTokens: 647528,
    costToYou: 1.0,
  },
  {
    model: "gemini-2.0-flash-exp",
    inputWithCache: 176100,
    inputWithoutCache: 28432,
    cacheRead: 434612,
    output: 8326,
    totalTokens: 647528,
    apiCost: 1,
    costToYou: 0,
  },
  {
    model: "gemini-2.5-pro",
    inputWithCache: 176177,
    inputWithoutCache: 28413,
    cacheRead: 434612,
    output: 7000,
    totalTokens: 647528,
    apiCost: 1,
    costToYou: 0,
  },
  {
    model: "claude-4-sonnet",
    inputWithCache: 68415,
    inputWithoutCache: 902,
    cacheRead: 864450,
    output: 12769,
    totalTokens: 946536,
    apiCost: 0.71,
    costToYou: 0.71,
  },
  {
    model: "claude-3.7-sonnet",
    inputWithCache: 68415,
    inputWithoutCache: 902,
    cacheRead: 864450,
    output: 12769,
    totalTokens: 946536,
    apiCost: 0.71,
  },
  {
    model: "auto",
    inputWithCache: 84551,
    inputWithoutCache: 0,
    cacheRead: 284876,
    output: 9458,
    totalTokens: 378885,
    apiCost: 0.23,
    costToYou: 0,
  },
  {
    model: "sonic",
    inputWithCache: 0,
    inputWithoutCache: 149484,
    cacheRead: 4354855,
    output: 23569,
    totalTokens: 4527908,
    costToYou: 2,
  },
];

export function BillingDialog({ open, onOpenChange }: BillingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl">
        <DialogHeader>
          <DialogTitle>TOKEN用量</DialogTitle>
          <DialogDescription>
            Per-model LLM usage with token counts, cache reads, and API cost.
          </DialogDescription>
        </DialogHeader>
        <UsageTable
          title="Usage Summary"
          usageHistory={usageHistory}
          showTotal={true}
          description="Per-model LLM usage with token counts, cache reads, and API cost."
        />
      </DialogContent>
    </Dialog>
  )
}
