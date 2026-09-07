import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors leading-normal",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-800",
        secondary: "bg-slate-50 text-slate-600 border border-slate-200",
        destructive: "bg-rose-50 text-rose-700 border border-rose-200",
        outline: "border border-slate-300 text-slate-700",
        success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        warning: "bg-amber-50 text-amber-800 border border-amber-200",
        brand: "bg-brand-50 text-brand-700 border border-brand-200",
        blue: "bg-blue-50 text-blue-700 border border-blue-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
