import { Link, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Clock, ListChecks, BarChart3, Download } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Landing() {
  useEffect(() => { document.title = "Clockwork — Log your hours"; }, []);
  const { session, loading } = useAuth();
  if (!loading && session) return <Navigate to="/app" replace />;
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-semibold">Clockwork</span>
          </div>
          <Button asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <section className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="font-display text-5xl font-semibold leading-tight text-foreground md:text-6xl">
              Log your day,<br />
              <span className="text-primary">quarter hour by quarter hour.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              A calm, personal time tracker. Pick a date, log entries against your TLPs, customers and products, see your daily total, and export everything to CSV when you need it.
            </p>
            <div className="mt-8 flex gap-3">
              <Button asChild size="lg">
                <Link to="/login">Get started</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-baseline justify-between border-b border-border pb-3">
              <span className="font-display text-lg">Friday, May 8, 2026</span>
              <span className="font-display text-2xl text-primary">6.25 hrs</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                ["Client Work", "Acme Corp", "Development", "1.50"],
                ["Internal", "—", "Meetings", "0.75"],
                ["Client Work", "Globex", "Consulting", "2.00"],
                ["Admin", "Internal", "Support", "2.00"],
              ].map(([tlp, cust, prod, hrs], i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="flex gap-2">
                    <span className="font-medium">{tlp}</span>
                    <span className="text-muted-foreground">· {cust} · {prod}</span>
                  </span>
                  <span className="font-mono text-primary">{hrs}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="features" className="mt-24 grid gap-6 md:grid-cols-3">
          {[
            { icon: Clock, title: "15-minute precision", body: "Log time in clean quarter-hour increments. No fiddly minute pickers." },
            { icon: ListChecks, title: "Editable lists", body: "Manage your own TLPs, customers and products. Archive without losing history." },
            { icon: BarChart3, title: "Reports + CSV", body: "Filter by date or category, see totals at a glance, export raw data anytime." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-display text-xl">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><Download className="h-4 w-4" /> Your data, exportable as CSV.</span>
          <span>© Clockwork</span>
        </div>
      </footer>
    </div>
  );
}
