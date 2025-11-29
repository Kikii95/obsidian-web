"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Github, Mail, Calendar, Shield } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  const user = session.user as {
    name?: string;
    email?: string;
    image?: string;
    username?: string;
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Link>
      </Button>

      {/* Profile Card */}
      <Card className="border-primary/20">
        <CardHeader className="text-center pb-2">
          <Avatar className="h-24 w-24 mx-auto mb-4 ring-4 ring-primary/20">
            <AvatarImage src={user.image || ""} alt={user.name || ""} />
            <AvatarFallback className="text-2xl bg-primary/20">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl">{user.name}</CardTitle>
          <CardDescription className="flex items-center justify-center gap-1">
            <Github className="h-4 w-4" />
            @{user.username}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email */}
          {user.email && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
          )}

          {/* GitHub Link */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Github className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Profil GitHub</p>
              <a
                href={`https://github.com/${user.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                github.com/{user.username}
              </a>
            </div>
          </div>

          {/* Access Level */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Niveau d'accès</p>
              <Badge className="mt-1 bg-green-500/20 text-green-400 border-green-500/30">
                Propriétaire du Vault
              </Badge>
            </div>
          </div>

          {/* Session Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Session</p>
              <p className="font-medium text-sm">Active (expire dans 30 jours)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
