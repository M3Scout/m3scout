import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AthleteCTASectionProps {
  playerName: string;
  playerSlug: string;
}

interface StickyCTAProps {
  playerSlug: string;
  playerName: string;
  visible: boolean;
}

// Final CTA section at bottom of page
export function AthleteCTASection({ playerName, playerSlug }: AthleteCTASectionProps) {
  const firstName = playerName.split(" ")[0];

  return (
    <motion.section
      className={cn(
        "relative text-center py-12 md:py-16 mt-8 px-6",
        "rounded-3xl overflow-hidden"
      )}
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
    >
      {/* Background with gradient layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/50 via-zinc-900/40 to-zinc-950/50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02]" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }} 
      />
      
      {/* Decorative corner elements */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-3xl" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-primary/10 to-transparent rounded-3xl" />

      <div className="relative z-10">
        {/* Icon */}
        <motion.div 
          className="inline-flex p-3 rounded-2xl bg-primary/10 mb-4"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring", delay: 0.1 }}
        >
          <Sparkles className="w-6 h-6 text-primary" />
        </motion.div>

        {/* Heading */}
        <motion.h3 
          className="text-2xl md:text-3xl font-bold text-foreground mb-3"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
        >
          Interessado em <span className="text-primary">{firstName}</span>?
        </motion.h3>
        
        <motion.p 
          className="text-muted-foreground mb-6 md:mb-8 max-w-md mx-auto text-sm md:text-base"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          Entre em contato com a M3 Agency para mais informações sobre este atleta.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25 }}
        >
          <Link to={`/contact?player=${playerSlug}`}>
            <motion.button 
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "group relative inline-flex items-center gap-2.5",
                "px-8 py-4 rounded-2xl",
                "font-semibold text-primary-foreground text-base",
                "bg-gradient-to-r from-primary via-primary to-primary/90",
                "shadow-[0_8px_32px_-8px] shadow-primary/40",
                "hover:shadow-[0_12px_40px_-8px] hover:shadow-primary/50",
                "transition-all duration-300"
              )}
            >
              <MessageCircle className="w-5 h-5" />
              <span>Falar com a M3 Agency</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              
              {/* Animated glow ring */}
              <motion.div 
                className="absolute inset-0 rounded-2xl border-2 border-primary/30"
                animate={{ 
                  scale: [1, 1.05, 1],
                  opacity: [0.5, 0, 0.5]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              
              {/* Background glow */}
              <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
}

// Sticky mobile CTA
export function StickyMobileCTA({ playerSlug, playerName, visible }: StickyCTAProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        >
          {/* Gradient backdrop */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/98 to-transparent pointer-events-none" />
          
          <div className="relative px-4 py-4 pb-safe">
            <Link to={`/contact?player=${playerSlug}`}>
              <motion.button 
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "w-full group relative flex items-center justify-center gap-2.5",
                  "px-6 py-4 rounded-2xl",
                  "font-semibold text-primary-foreground text-sm",
                  "bg-gradient-to-r from-primary to-primary/90",
                  "shadow-[0_8px_32px_-8px] shadow-primary/40",
                  "active:scale-[0.98] transition-transform"
                )}
              >
                <MessageCircle className="w-4 h-4" />
                <span>Falar sobre {playerName.split(" ")[0]}</span>
                <ChevronRight className="w-4 h-4" />
                
                {/* Subtle glow behind button */}
                <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl -z-10" />
              </motion.button>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
