import { Skeleton } from "@/components/ui/skeleton";

interface NewsListSkeletonProps {
  isMobile: boolean;
}

export function NewsListSkeleton({ isMobile }: NewsListSkeletonProps) {
  if (isMobile) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div 
            key={i}
            className="rounded-2xl bg-zinc-900/50 border border-zinc-800/40 overflow-hidden"
          >
            {/* Thumbnail skeleton */}
            <Skeleton className="aspect-video w-full" />
            
            <div className="p-4 space-y-3">
              {/* Title */}
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              
              {/* Slug */}
              <Skeleton className="h-3 w-2/3" />
              
              {/* Meta */}
              <Skeleton className="h-3 w-24" />
              
              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-10 w-10 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Desktop table skeleton
  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-zinc-800/50">
        <Skeleton className="h-4 w-[45%]" />
        <Skeleton className="h-4 w-[12%]" />
        <Skeleton className="h-4 w-[12%]" />
        <Skeleton className="h-4 w-[15%]" />
        <Skeleton className="h-4 w-[16%]" />
      </div>
      
      {/* Rows */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-zinc-800/30 last:border-0">
          <div className="flex items-center gap-4 w-[45%]">
            <Skeleton className="w-20 h-12 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-24" />
          <div className="flex items-center gap-1 ml-auto">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
