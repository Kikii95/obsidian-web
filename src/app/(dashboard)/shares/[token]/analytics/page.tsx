"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AnalyticsChart,
  StatCard,
  DistributionChart,
} from "@/components/shares/analytics-chart";
import {
  ArrowLeft,
  BarChart3,
  Eye,
  Calendar,
  Clock,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface ShareAnalytics {
  share: {
    token: string;
    name: string | null;
    folderPath: string;
    mode: string;
    createdAt: string;
    expiresAt: string;
    accessCount: number;
  };
  analytics: {
    totalViews: number;
    uniqueDays: number;
    byDay: { date: string; count: number }[];
    byDevice: { device: string; count: number }[];
    byBrowser: { browser: string; count: number }[];
    byCountry: { country: string; count: number }[];
    recentAccess: { accessedAt: string; country: string | null; device: string | null }[];
  };
}

export default function ShareAnalyticsDetailPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<ShareAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState("30");

  useEffect(() => {
    async function fetchAnalytics() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/shares/${token}/analytics?days=${days}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Partage non trouvé");
          if (res.status === 403) throw new Error("Non autorisé");
          throw new Error("Erreur de chargement");
        }
        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalytics();
  }, [token, days]);

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
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
          <h2 className="text-xl font-semibold">Erreur</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" asChild>
            <Link href="/shares/analytics">Retour aux analytics</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { share, analytics } = data;
  const displayName = share.name || share.folderPath.split("/").pop() || share.folderPath;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/shares/analytics">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <span className="text-muted-foreground">|</span>
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{share.folderPath}</p>
          </div>
          <Badge variant="outline">{share.mode}</Badge>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Vues totales"
          value={analytics.totalViews}
          icon={<Eye className="h-4 w-4" />}
        />
        <StatCard
          label="Vues (tout temps)"
          value={share.accessCount}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <StatCard
          label="Jours actifs"
          value={analytics.uniqueDays}
          icon={<Calendar className="h-4 w-4" />}
        />
        <StatCard
          label="Expire dans"
          value={formatDistanceToNow(new Date(share.expiresAt), { locale: fr })}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* Views chart */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-4">Évolution des vues</h2>
        <AnalyticsChart data={analytics.byDay} height={250} />
      </div>

      {/* Distribution charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DistributionChart
          data={analytics.byDevice.map((d) => ({ label: d.device, count: d.count }))}
          title="Par appareil"
        />
        <DistributionChart
          data={analytics.byBrowser.map((d) => ({ label: d.browser, count: d.count }))}
          title="Par navigateur"
        />
        <DistributionChart
          data={analytics.byCountry.map((d) => ({ label: d.country, count: d.count }))}
          title="Par pays"
        />
      </div>

      {/* Recent access */}
      {analytics.recentAccess.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Accès récents</h2>
          </div>
          <ScrollArea className="h-64">
            <div className="divide-y">
              {analytics.recentAccess.map((access, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(access.device || "desktop")}
                    <div>
                      <p className="text-sm">
                        {access.device || "Desktop"} depuis {access.country || "Inconnu"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(access.accessedAt), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                  </div>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
