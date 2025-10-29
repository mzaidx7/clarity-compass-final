"use client";

import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { apiSafe } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const { logout, user } = useAuth();
  const { toast } = useToast();
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000', []);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      const result = await apiSafe.clearAllData();
      
      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to clear data');
      }

      // Also clear localStorage
      try {
        if (user?.id) localStorage.removeItem(`cc_history_${user.id}`);
        localStorage.removeItem('cc_history_local');
      } catch {}

      toast({
        title: "✅ Data Cleared Successfully",
        description: `${result.data.items_cleared} items removed. You can start fresh!`,
      });

      // Reload page after 1 second to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "❌ Clear Failed",
        description: error?.message || "Could not clear data. Please try again.",
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="container mx-auto p-0">
        <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage your application settings.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Session and authentication.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">Signed in as: <span className="font-medium">{user?.id ?? 'anonymous'}</span></p>
              <Button variant="secondary" onClick={logout}>Log out</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>API</CardTitle>
              <CardDescription>Backend configuration overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">Base URL: <span className="font-medium">{apiBase}</span></p>
              <p className="text-sm">Mode: <span className="font-medium">Live</span></p>
            </CardContent>
          </Card>

          {/* Clear All Data - Danger Zone */}
          <Card className="md:col-span-2 border-destructive/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </div>
              <CardDescription>
                Irreversible actions that permanently delete your data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                <h3 className="text-sm font-semibold mb-1">Clear All Data</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  This will permanently delete all your assessments, calendar events, and history. 
                  This action <strong>cannot be undone</strong>.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isClearing}>
                      {isClearing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Clearing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Clear All Data
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>
                          This will permanently delete:
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                          <li>All burnout assessments and quick checks</li>
                          <li>All calendar events</li>
                          <li>All historical data and progress tracking</li>
                          <li>Browser local storage data</li>
                        </ul>
                        <p className="font-semibold text-destructive mt-3">
                          This action cannot be undone!
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearAllData}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, Delete Everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
