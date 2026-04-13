"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex items-center gap-2 mb-8"
      >
        <TrendingUp className="h-6 w-6 text-emerald-400" />
        <span className="font-semibold text-lg tracking-tight">Portfolio</span>
      </motion.div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
