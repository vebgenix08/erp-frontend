import {
  ArrowRight,
  ClipboardList,
  Hash,
  Landmark,
  ReceiptText,
  RefreshCw,
  Scale,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../shared/ui/card";
import { Badge } from "../../../shared/ui/badge";

const setupLinks = [
  {
    step: 1,
    title: "Fee heads",
    description: "Define charge categories, refundability, and operating rules.",
    to: "/admin/finance/fee-heads",
    icon: Hash,
  },
  {
    step: 2,
    title: "Fee structures",
    description: "Combine fee heads into a unified annual charge structure.",
    to: "/admin/finance/fee-structures",
    icon: Scale,
  },
  {
    step: 3,
    title: "Fee schedules",
    description: "Define annual, one-time, periodic, or manual charging patterns.",
    to: "/admin/finance/fee-schedules",
    icon: ClipboardList,
  },
  {
    step: 4,
    title: "Class fee mapping",
    description: "Map an active structure and schedule to an academic class.",
    to: "/admin/finance/assignments",
    icon: Landmark,
  },
  {
    step: 5,
    title: "Receipt template",
    description: "Configure receipt branding, paper size, notes, and signature.",
    to: "/admin/finance/receipt-template",
    icon: ReceiptText,
  },
];

export function FinanceSetupWorkspace() {
  return (
    <section className="space-y-4">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Finance setup guide</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Configure fee structures and collection parameters before creating student fee orders.
          </p>
        </div>
        <Badge variant="brand" className="py-1 px-2.5 flex items-center gap-1.5">
          <RefreshCw size={12} /> Setup before collection
        </Badge>
      </header>

      {/* Step Sequence Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {setupLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className="group block">
              <Card className="h-full transition-all group-hover:border-brand-600 group-hover:shadow-xs">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-xs font-bold text-slate-700 group-hover:bg-brand-50 group-hover:text-brand-700">
                      {item.step}
                    </span>
                    <CardTitle className="text-xs font-bold">{item.title}</CardTitle>
                  </div>
                  <Icon size={16} className="text-slate-400 group-hover:text-brand-600" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <CardDescription className="text-xs">{item.description}</CardDescription>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-brand-600 pt-1 group-hover:underline">
                    <span>Open step</span>
                    <ArrowRight size={12} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
