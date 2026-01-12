import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface PlayersListSkeletonProps {
  viewMode: "table" | "grid" | "scouting";
  count?: number;
}

export function PlayersListSkeleton({ viewMode, count = 12 }: PlayersListSkeletonProps) {
  if (viewMode === "grid" || viewMode === "scouting") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex gap-2 mt-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Table view skeleton
  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="bg-muted/30 px-4 py-3 border-b border-border/50">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4">
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="col-span-2">
            <Skeleton className="h-4 w-14" />
          </div>
          <div className="col-span-2">
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="col-span-2">
            <Skeleton className="h-4 w-10" />
          </div>
          <div className="col-span-2">
            <Skeleton className="h-4 w-14" />
          </div>
        </div>
      </div>
      
      {/* Table Rows */}
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="px-4 py-3 border-b border-border/30 last:border-0"
        >
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="col-span-2">
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-6 w-12" />
            </div>
            <div className="col-span-2 flex items-center justify-between">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
