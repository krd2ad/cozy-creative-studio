import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, addDays, subDays, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { HOUR_OPTIONS } from "@/lib/csv";

type ListItem = { id: string; name: string; kind: "tlp" | "customer" | "product"; active: boolean };
type Entry = {
  id: string; entry_date: string; description: string; hours: number;
  tlp_id: string; customer_id: string; product_id: string;
};

const isoDate = (d: Date) => format(d, "yyyy-MM-dd");

export default function AppPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [date, setDate] = useState<Date>(new Date());
  const dateStr = isoDate(date);

  useEffect(() => { document.title = "Time — Time Tracker"; }, []);

  const { data: items = [] } = useQuery({
    queryKey: ["list_items", user?.id],
    queryFn: async (): Promise<ListItem[]> => {
      const { data, error } = await supabase.from("list_items").select("id,name,kind,active").order("name");
      if (error) throw error;
      return data as ListItem[];
    },
    enabled: !!user,
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["entries", user?.id, dateStr],
    queryFn: async (): Promise<Entry[]> => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("id,entry_date,description,hours,tlp_id,customer_id,product_id")
        .eq("entry_date", dateStr)
        .order("created_at");
      if (error) throw error;
      return data as Entry[];
    },
    enabled: !!user,
  });

  const tlps = items.filter((i) => i.kind === "tlp" && i.active);
  const customers = items.filter((i) => i.kind === "customer" && i.active);
  const products = items.filter((i) => i.kind === "product" && i.active);
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i.name])), [items]);

  const total = entries.reduce((s, e) => s + Number(e.hours), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setDate(subDays(date, 1))} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-display text-2xl">{format(date, "EEEE, MMMM d, yyyy")}</h1>
          <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDate(new Date())}>Today</Button>
        </div>
        <div className="font-display text-2xl text-primary">{total.toFixed(2)} hours</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card className="p-3">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && setDate(d)}
            className="rounded-md"
          />
        </Card>

        <div className="space-y-4">
          <NewEntryForm
            dateStr={dateStr}
            tlps={tlps}
            customers={customers}
            products={products}
            onSaved={() => qc.invalidateQueries({ queryKey: ["entries", user?.id, dateStr] })}
            userId={user!.id}
          />

          <Card>
            {entries.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No entries for this day yet. Add your first one above.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>TLP</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <EntryRow
                      key={e.id} entry={e} itemMap={itemMap}
                      tlps={tlps} customers={customers} products={products}
                      onChanged={() => qc.invalidateQueries({ queryKey: ["entries", user?.id, dateStr] })}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function NewEntryForm({
  dateStr, tlps, customers, products, onSaved, userId,
}: {
  dateStr: string;
  tlps: ListItem[]; customers: ListItem[]; products: ListItem[];
  onSaved: () => void; userId: string;
}) {
  const [tlp, setTlp] = useState("");
  const [customer, setCustomer] = useState("");
  const [product, setProduct] = useState("");
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("0.25");

  useEffect(() => { setDescription(""); }, [dateStr]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("time_entries").insert({
        user_id: userId,
        entry_date: dateStr,
        tlp_id: tlp,
        customer_id: customer,
        product_id: product,
        description,
        hours: Number(hours),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entry added");
      setDescription("");
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add entry"),
  });

  const canSave = tlp && customer && product && hours;

  return (
    <Card className="p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_2fr_110px_auto] md:items-end">
        <ListSelect label="TLP" value={tlp} onChange={setTlp} items={tlps} />
        <ListSelect label="Customer" value={customer} onChange={setCustomer} items={customers} />
        <ListSelect label="Product" value={product} onChange={setProduct} items={products} />
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What did you work on?" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Hours</label>
          <Select value={hours} onValueChange={setHours}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {HOUR_OPTIONS.map((h) => (
                <SelectItem key={h} value={h.toFixed(2)}>{h.toFixed(2)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => save.mutate()} disabled={!canSave || save.isPending}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>
    </Card>
  );
}

function ListSelect({
  label, value, onChange, items,
}: { label: string; value: string; onChange: (v: string) => void; items: ListItem[] }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={`Select ${label}`} /></SelectTrigger>
        <SelectContent>
          {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
          {items.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">No active items. Add some on the Lists page.</div>}
        </SelectContent>
      </Select>
    </div>
  );
}

function EntryRow({
  entry, itemMap, tlps, customers, products, onChanged,
}: {
  entry: Entry;
  itemMap: Map<string, string>;
  tlps: ListItem[]; customers: ListItem[]; products: ListItem[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [tlp, setTlp] = useState(entry.tlp_id);
  const [customer, setCustomer] = useState(entry.customer_id);
  const [product, setProduct] = useState(entry.product_id);
  const [description, setDescription] = useState(entry.description);
  const [hours, setHours] = useState(Number(entry.hours).toFixed(2));

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("time_entries")
        .update({ tlp_id: tlp, customer_id: customer, product_id: product, description, hours: Number(hours) })
        .eq("id", entry.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Entry updated"); setEditing(false); onChanged(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("time_entries").delete().eq("id", entry.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Entry deleted"); onChanged(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  if (editing) {
    return (
      <TableRow>
        <TableCell>
          <Select value={tlp} onValueChange={setTlp}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{tlps.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <Select value={customer} onValueChange={setCustomer}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{customers.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <Select value={product} onValueChange={setProduct}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{products.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
          </Select>
        </TableCell>
        <TableCell><Input className="h-8" value={description} onChange={(e) => setDescription(e.target.value)} /></TableCell>
        <TableCell className="text-right">
          <Select value={hours} onValueChange={setHours}>
            <SelectTrigger className="h-8 w-24 ml-auto"><SelectValue /></SelectTrigger>
            <SelectContent>{HOUR_OPTIONS.map((h) => <SelectItem key={h} value={h.toFixed(2)}>{h.toFixed(2)}</SelectItem>)}</SelectContent>
          </Select>
        </TableCell>
        <TableCell className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => update.mutate()} disabled={update.isPending}><Check className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>{itemMap.get(entry.tlp_id) ?? "—"}</TableCell>
      <TableCell>{itemMap.get(entry.customer_id) ?? "—"}</TableCell>
      <TableCell>{itemMap.get(entry.product_id) ?? "—"}</TableCell>
      <TableCell className="max-w-xs truncate text-muted-foreground">{entry.description || "—"}</TableCell>
      <TableCell className="text-right font-mono">{Number(entry.hours).toFixed(2)}</TableCell>
      <TableCell className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /></Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
              <AlertDialogDescription>
                {format(parseISO(entry.entry_date), "PPP")} · {Number(entry.hours).toFixed(2)} hours. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => remove.mutate()}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}
