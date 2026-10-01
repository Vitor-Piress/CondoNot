import type { PropsWithChildren, ReactNode } from "react";

interface PanelProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  leftAction?: ReactNode;
}

export function Panel({
  title,
  subtitle,
  action,
  leftAction,
  children,
}: PanelProps) {
  return (
    <section className="print:hidden rounded-2xl border print:border-none border-slate-200 bg-white p-6 shadow-sm print:shadow-none">
      <header className="print:hidden mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {leftAction}
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
