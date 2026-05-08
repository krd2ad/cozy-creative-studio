import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Check, X, Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

type Kind = "tlp" | "customer" | "product";
type ListItem = { id: string; name: string; kind: Kind; active: boolean };

export default function Lists() {
  const { user } = useAuth();
  useEffect(() => { document.title = "Lists — Time Tracker"; }, []);

  const { data: items = [] } = useQuery({
    queryKey: ["list_items_all", user?.id],
    queryFn: async (): Promise<ListItem[]> => {
      const { data, error } = await supabase.from("list_items").select("id,name,kind,active").order("name");
      if (error) throw error;
      return data as ListItem[];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Lists</h1>
        <p className="text-sm text-muted-foreground">Manage the dropdown values used in your time entries. Archived items keep historical entries intact.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ListColumn kind="tlp" title="TLP" items={items.filter((i) => i.kind === "tlp")} />
        <ListColumn kind="customer" title="Customer" items={items.filter((i) => i.kind === "customer")} />
        <ListColumn kind="product" title="Product" items={items.filter((i) => i.kind === "product")} />
      </div>
    </div>
  );
}

function ListColumn({ kind, title, items }: { kind: Kind; title: string; items: ListItem[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["list_items_all", user?.id] });
    qc.invalidateQueries({ queryKey: ["list_items", user?.id] });
  };

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("list_items").insert({
        user_id: user!.id, kind, name: name.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => { setName(""); toast.success(`${title} added`); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Card className="p-4">
      <h2 className="mb-3 font-display text-xl">{title}</h2>
      <div className="mb-4 flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`New ${title.toLowerCase()}`}
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) add.mutate(); }}
        />
        <Button onClick={() => add.mutate()} disabled={!name.trim() || add.isPending}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ul className="space-y-1">
        {items.length === 0 && <li className="text-sm text-muted-foreground">No items yet.</li>}
        {items.map((i) => <ItemRow key={i.id} item={i} onChanged={invalidate} />)}
      </ul>
    </Card>
  );
}

function ItemRow({ item, onChanged }: { item: ListItem; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("list_items").update({ name: name.trim() }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); setEditing(false); onChanged(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("list_items").update({ active: !item.active }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(item.active ? "Archived" : "Restored"); onChanged(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <li className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
      {editing ? (
        <Input className="h-8" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      ) : (
        <span className={`flex-1 ${item.active ? "" : "text-muted-foreground line-through"}`}>{item.name}</span>
      )}
      {!item.active && <Badge variant="secondary">Archived</Badge>}
      {editing ? (
        <>
          <Button size="icon" variant="ghost" onClick={() => save.mutate()}><Check className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setName(item.name); }}><X className="h-4 w-4" /></Button>
        </>
      ) : (
        <>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => toggle.mutate()}>
            {item.active ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
          </Button>
        </>
      )}
    </li>
  );
}
