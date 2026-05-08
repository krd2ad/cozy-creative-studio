import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { downloadCSV } from "@/lib/csv";

type ListItem = { id: string; name: string; kind: "tlp" | "customer" | "product" };
type Entry = {
  id: string; entry_date: string; description: string; hours: number;
  tlp_id: string; customer_id: string; product_id: string;
};

const isoDate = (d: Date) => format(d, "yyyy-MM-dd");

export default function Reports() {
  const { user } = useAuth();
  const [start, setStart] = useState(isoDate(subDays(new Date(), 29)));
  const [end, setEnd] = useState(isoDate(new Date()));
  const [tlpFilter, setTlpFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");

  useEffect(() => { document.title = "Reports — Clockwork"; }, []);

  const { data: items = [] } = useQuery({
    queryKey: ["list_items_all", user?.id],
    queryFn: async (): Promise<ListItem[]> => {
      const { data, error } = await supabase.from("list_items").select("id,name,kind").order("name");
      if (error) throw error;
      return data as ListItem[];
    },
    enabled: !!user,
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["entries_range", user?.id, start, end],
    queryFn: async (): Promise<Entry[]> => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("id,entry_date,description,hours,tlp_id,customer_id,product_id")
        .gte("entry_date", start).lte("entry_date", end)
        .order("entry_date");
      if (error) throw error;
      return data as Entry[];
    },
    enabled: !!user,
  });

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i.name])), [items]);
  const tlps = items.filter((i) => i.kind === "tlp");
  const customers = items.filter((i) => i.kind === "customer");
  const products = items.filter((i) => i.kind === "product");

  const filtered = entries.filter((e) =>
    (tlpFilter === "all" || e.tlp_id === tlpFilter) &&
    (customerFilter === "all" || e.customer_id === customerFilter) &&
    (productFilter === "all" || e.product_id === productFilter)
  );

  const totalHours = filtered.reduce((s, e) => s + Number(e.hours), 0);
  const dayCount = new Set(filtered.map((e) => e.entry_date)).size;
  const avgPerDay = dayCount ? totalHours / dayCount : 0;

  const groupBy = (key: keyof Entry) => {
    const map = new Map<string, number>();
    filtered.forEach((e) => map.set(String(e[key]), (map.get(String(e[key])) ?? 0) + Number(e.hours)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };
  const byDate = groupBy("entry_date");
  const byTlp = groupBy("tlp_id");
  const byCustomer = groupBy("customer_id");
  const byProduct = groupBy("product_id");

  const top = (rows: [string, number][]) => rows[0] ? itemMap.get(rows[0][0]) ?? rows[0][0] : "—";

  const handleExport = () => {
    const rows = filtered.map((e) => ({
      date: e.entry_date,
      tlp: itemMap.get(e.tlp_id) ?? "",
      customer: itemMap.get(e.customer_id) ?? "",
      product: itemMap.get(e.product_id) ?? "",
      description: e.description,
      hours: Number(e.hours).toFixed(2),
    }));
    downloadCSV(`time-entries-${start}-to-${end}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl">Reports</h1>
        <Button onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Download CSV
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <Field label="Start"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="End"><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          <Field label="TLP"><FilterSelect value={tlpFilter} onChange={setTlpFilter} items={tlps} /></Field>
          <Field label="Customer"><FilterSelect value={customerFilter} onChange={setCustomerFilter} items={customers} /></Field>
          <Field label="Product"><FilterSelect value={productFilter} onChange={setProductFilter} items={products} /></Field>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Stat title="Total hours" value={totalHours.toFixed(2)} />
        <Stat title="Entries" value={String(filtered.length)} />
        <Stat title="Avg / day" value={avgPerDay.toFixed(2)} />
        <Stat title="Top TLP" value={top(byTlp)} />
        <Stat title="Top Customer" value={top(byCustomer)} />
        <Stat title="Top Product" value={top(byProduct)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GroupTable title="By Date" rows={byDate.map(([k, v]) => [format(new Date(k + "T00:00:00"), "PP"), v])} />
        <GroupTable title="By TLP" rows={byTlp.map(([k, v]) => [itemMap.get(k) ?? "—", v])} />
        <GroupTable title="By Customer" rows={byCustomer.map(([k, v]) => [itemMap.get(k) ?? "—", v])} />
        <GroupTable title="By Product" rows={byProduct.map(([k, v]) => [itemMap.get(k) ?? "—", v])} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
    </div>
  );
}

function FilterSelect({ value, onChange, items }: { value: string; onChange: (v: string) => void; items: ListItem[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-1 truncate font-display text-2xl text-primary">{value}</div>
    </Card>
  );
}

function GroupTable({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <Card>
      <div className="border-b border-border p-3 font-display text-lg">{title}</div>
      {rows.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">No data.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow><TableHead>{title.replace("By ", "")}</TableHead><TableHead className="text-right">Hours</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(([k, v]) => (
              <TableRow key={k}>
                <TableCell>{k}</TableCell>
                <TableCell className="text-right font-mono">{v.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
