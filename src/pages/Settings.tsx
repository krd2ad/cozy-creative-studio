import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, KeyRound } from "lucide-react";

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { document.title = "Settings — Clockwork"; }, []);

  const handleReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}${window.location.pathname}#/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent.");
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-display text-3xl">Settings</h1>

      <Card className="p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Signed in as</div>
        <div className="mt-1 font-display text-xl">{user?.email}</div>
      </Card>

      <Card className="space-y-3 p-5">
        <Button variant="outline" onClick={handleReset}>
          <KeyRound className="mr-2 h-4 w-4" /> Send password reset email
        </Button>
        <Button variant="destructive" onClick={async () => { await signOut(); navigate("/"); }}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </Card>
    </div>
  );
}
