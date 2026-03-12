"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Battery } from "lucide-react";

export function BatteryMeter() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.6 });
  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    if (isInView) {
      const timer = setInterval(() => {
        setPercentage((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            return 100;
          }
          return prev + 2;
        });
      }, 30);
      return () => clearInterval(timer);
    }
  }, [isInView]);

  const batteryColor =
    percentage < 30
      ? "from-red-400 to-red-600"
      : percentage < 70
      ? "from-yellow-400 to-yellow-600"
      : "from-green-400 to-green-600";

  return (
    <div ref={ref} className="flex flex-col items-center gap-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 shadow-2xl">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white">Charging Progress</h3>
        <p className="mt-1 text-sm text-slate-400">Watch your battery come back to life</p>
      </div>
      
      <div className="relative flex items-center gap-4">
        <div className="relative h-32 w-64 rounded-2xl border-4 border-slate-600 bg-slate-800 p-2">
          <motion.div
            className={`h-full rounded-xl bg-gradient-to-r ${batteryColor} shadow-lg`}
            initial={{ width: 0 }}
            animate={{ width: isInView ? `${percentage}%` : 0 }}
            transition={{ duration: 3, ease: "easeOut" }}
          >
            {percentage > 20 && (
              <motion.div
                className="absolute inset-0 rounded-xl bg-white/20"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}
          </motion.div>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-white drop-shadow-lg">
              {percentage}%
            </span>
          </div>
        </div>
        
        <div className="h-8 w-4 rounded-r-md border-4 border-l-0 border-slate-600 bg-slate-600" />
      </div>

      <div className="flex items-center gap-2 text-sky-400">
        <Battery className="h-5 w-5" />
        <span className="text-sm font-medium">
          {percentage < 100 ? "Charging..." : "Fully Charged!"}
        </span>
      </div>
    </div>
  );
}
