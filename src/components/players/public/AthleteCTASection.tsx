import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, MessageCircle } from "lucide-react";

interface AthleteCTASectionProps { playerName: string; playerSlug: string; }
interface StickyCTAProps { playerSlug: string; playerName: string; visible: boolean; }

export function AthleteCTASection({ playerName, playerSlug }: AthleteCTASectionProps) {
  const firstName = (playerName ?? "").split(" ")[0];

  return (
    <section className="py-24 relative">
      {/* Full-width editorial CTA panel — same panel token as .fase / .fcard */}
      <div
        className="border border-white/[0.075] rounded-[8px] bg-[#141318] px-[40px] py-[60px] text-center"
        style={{ background: "linear-gradient(165deg, rgba(236,69,37,0.07), #141318 55%)" }}
      >
        {/* Centered kick label */}
        <div className="font-editorial-mono text-[11px] tracking-[0.24em] uppercase text-[#62616a] font-medium inline-flex gap-[10px] items-center mb-[22px]">
          <span className="w-[34px] h-px bg-white/15 flex-none" />
          M3 Agency · Scouting
          <span className="w-[34px] h-px bg-white/15 flex-none" />
        </div>

        {/* Heading */}
        <h2
          className="font-display font-semibold leading-[1.02] tracking-[-0.025em] text-[#ededee] mb-[14px]"
          style={{ fontSize: "clamp(28px,3.4vw,44px)" }}
        >
          Interessado em{" "}
          <span className="text-[#ec4525]">{firstName}</span>?
        </h2>

        {/* Description */}
        <p className="font-editorial-mono text-[12px] text-[#62616a] tracking-[0.04em] max-w-[340px] mx-auto mb-[34px]">
          Entre em contato com a M3 Agency para mais informações sobre este atleta.
        </p>

        {/* .btn-solid */}
        <Link to={`/contact?player=${playerSlug}`}>
          <span className="font-editorial-mono text-[12px] tracking-[0.12em] uppercase font-semibold inline-flex items-center gap-[9px] rounded-[6px] px-5 py-[14px] bg-[#ec4525] text-[#160603] hover:bg-[#ff5a39] hover:-translate-y-0.5 transition-all duration-[220ms] cursor-pointer">
            Falar com a M3 Agency
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>
    </section>
  );
}

export function StickyMobileCTA({ playerSlug, playerName, visible }: StickyCTAProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        >
          {/* Fade-up from page background */}
          <div
            className="relative px-4 py-4"
            style={{
              background: "linear-gradient(to top, #0c0b0d 65%, rgba(12,11,13,0))",
              paddingBottom: "max(16px, env(safe-area-inset-bottom))",
            }}
          >
            <Link to={`/contact?player=${playerSlug}`}>
              <button className="w-full font-editorial-mono text-[12px] tracking-[0.12em] uppercase font-semibold flex items-center justify-center gap-[9px] rounded-[6px] px-6 py-[14px] bg-[#ec4525] text-[#160603] hover:bg-[#ff5a39] transition-colors duration-[220ms]">
                <MessageCircle className="w-4 h-4" />
                Falar sobre {(playerName ?? "").split(" ")[0]}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
