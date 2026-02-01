"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AnalyticsChart,
  StatCard,
  DistributionChart,
} from "@/components/shares/analytics-chart";
import {
  ArrowLeft,
  BarChart3,
  Eye,
  Share2,
  Calendar,
  TrendingUp,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface Analytics {
  totalViews: number;
  shareCount: number;
  byDay: { date: string; count: number }[];
  topShares: {
    token: string;
    name: string | null;
    folderPath: string;
    views: number;
  }[];
}

export default function ShareAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState("30");

  useEffect(() => {
    async function fetchAnalytics() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/shares/analytics?days=${days}`);
        if (!res.ok) throw new Error("Erreur de chargement");
        const data = await res.json();
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalytics();
  }, [days]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Erreur de chargement</h2>
          <p className="text-muted-foreground text-center max-w-md">
            {error || "Impossible de charger les analytics. Vérifiez votre connexion et réessayez."}
          </p>
          <details className="text-xs text-muted-foreground bg-muted p-3 rounded-lg max-w-md">
            <summary className="cursor-pointer hover:text-foreground">Détails techniques</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">
              {JSON.stringify({ error, days, timestamp: new Date().toISOString() }, null, 2)}
            </pre>
          </details>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/shares">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux partages
              </Link>
            </Button>
            <Button onClick={() => { setError(null); setDays(days); }}>
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/shares">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <span className="text-muted-foreground">|</span>
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Analytics des partages</h1>
        </div>

        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 derniers jours</SelectItem>
            <SelectItem value="30">30 derniers jours</SelectItem>
            <SelectItem value="90">90 derniers jours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Vues totales"
          value={analytics?.totalViews || 0}
          icon={<Eye className="h-4 w-4" />}
        />
        <StatCard
          label="Partages actifs"
          value={analytics?.shareCount || 0}
          icon={<Share2 className="h-4 w-4" />}
        />
        <StatCard
          label="Jours avec visites"
          value={analytics?.byDay.length || 0}
          icon={<Calendar className="h-4 w-4" />}
        />
      </div>

      {/* Views chart */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Évolution des vues
          </h2>
          <Badge variant="outline">
            {analytics?.byDay.reduce((sum, d) => sum + d.count, 0) || 0} vues
          </Badge>
        </div>
        <AnalyticsChart
          data={analytics?.byDay || []}
          height={250}
          className="mt-4"
        />
      </div>

      {/* Top shares */}
      {analytics?.topShares && analytics.topShares.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Top partages
            </h2>
          </div>
          <div className="divide-y">
            {analytics.topShares.map((share, i) => {
              const displayName =
                share.name || share.folderPath.split("/").pop() || share.folderPath;

              return (
                <div
                  key={share.token}
                  className="flex items-center justify-between p-4 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium">{displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        {share.folderPath}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">{share.views} vues</Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/shares/${share.token}/analytics`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {analytics?.totalViews === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-semibold">Aucune donnée disponible</h3>
          <p className="text-muted-foreground mt-2">
            Les statistiques apparaîtront une fois que vos partages auront été visités.
          </p>
        </div>
      )}
    </div>
  );
}
