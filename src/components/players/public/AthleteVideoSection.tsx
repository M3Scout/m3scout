import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Film } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl } from "@/lib/utils";

interface AthleteVideoSectionProps {
  videoUrl: string | null;
}

// Video thumbnail with premium effects
function VideoThumbnail({ 
  thumbnailUrl,
  onPlay 
}: { 
  thumbnailUrl: string | null;
  onPlay: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  
  return (
    <motion.button
      onClick={onPlay}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "relative w-full aspect-video overflow-hidden group cursor-pointer",
        "rounded-2xl bg-zinc-900"
      )}
    >
      {/* Real thumbnail image */}
      {thumbnailUrl && !imgError && (
        <img
          src={thumbnailUrl}
          alt="Video thumbnail"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={() => setImgError(true)}
        />
      )}
      
      {/* Fallback gradient if no thumbnail */}
      {(!thumbnailUrl || imgError) && (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
      )}
      
      {/* Multi-layer overlay - darkens on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />
      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500 z-10" />
      
      {/* Play button with pulsing glow */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <motion.div 
          className={cn(
            "relative w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center",
            "bg-white/95 backdrop-blur-sm",
            "shadow-[0_8px_40px_-8px_rgba(0,0,0,0.5)]",
            "group-hover:scale-110 transition-transform duration-500"
          )}
        >
          {/* Pulsing ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-white/40"
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.6, 0, 0.6]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* Second pulsing ring (offset) */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-white/30"
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.4, 0, 0.4]
            }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
          
          <Play className="w-7 h-7 md:w-10 md:h-10 text-primary ml-1" fill="hsl(var(--primary))" />
        </motion.div>
      </div>
      
      {/* Label - bottom left with premium styling */}
      <motion.div 
        className="absolute bottom-4 left-4 md:bottom-6 md:left-6 z-20 text-left"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-white/70">Highlights</span>
        <p className="text-white font-semibold text-sm md:text-base mt-0.5">Assista ao vídeo completo</p>
      </motion.div>
      
      {/* Corner accent gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/20 to-transparent rounded-2xl z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.button>
  );
}

export function AthleteVideoSection({ videoUrl }: AthleteVideoSectionProps) {
  const [videoOpen, setVideoOpen] = useState(false);
  
  const embedUrl = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null;
  const thumbnailUrl = videoUrl ? getYouTubeThumbnailUrl(videoUrl, "maxres") : null;

  if (!embedUrl) return null;

  return (
    <motion.section 
      className="mb-10 md:mb-14"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      {/* Section Header */}
      <motion.div 
        className="flex items-center gap-3 mb-6 md:mb-8"
        initial={{ opacity: 0, x: -10 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
      >
        <div className="p-2 rounded-xl bg-primary/10">
          <Film className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Highlights</h2>
          <p className="text-xs text-muted-foreground">Melhores momentos do atleta</p>
        </div>
      </motion.div>
      
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogTrigger asChild>
          <div>
            <VideoThumbnail thumbnailUrl={thumbnailUrl} onPlay={() => setVideoOpen(true)} />
          </div>
        </DialogTrigger>
        <DialogContent className={cn(
          "max-w-5xl p-0 bg-black border-zinc-800",
          "rounded-2xl overflow-hidden"
        )}>
          <div className="aspect-video">
            <iframe
              src={embedUrl}
              title="Player Highlights"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </DialogContent>
      </Dialog>
    </motion.section>
  );
}
