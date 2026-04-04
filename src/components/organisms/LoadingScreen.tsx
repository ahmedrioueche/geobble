import React from 'react';
import { motion } from 'framer-motion';

export const LoadingScreen: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--color-bg-primary)]"
    >
      <div className="relative">
        {/* Animated Globe Effect */}
        <motion.div
          animate={{ 
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            rotate: { duration: 20, repeat: Infinity, ease: "linear" },
            scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }}
          className="w-32 h-32 rounded-full border-4 border-[var(--color-accent)] border-t-transparent flex items-center justify-center shadow-[0_0_50px_rgba(56,189,248,0.2)]"
        >
          <span className="text-4xl">🌍</span>
        </motion.div>
        
        {/* Scanning Pulse */}
        <motion.div
          animate={{ scale: [1, 2], opacity: [0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-[var(--color-accent)] pointer-events-none"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 flex flex-col items-center gap-2"
      >
        <h2 className="text-2xl font-black tracking-tighter text-[var(--color-accent)] uppercase">
          Initializing Geobble
        </h2>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              className="w-2 h-2 rounded-full bg-[var(--color-accent)]"
            />
          ))}
        </div>
      </motion.div>
      
      <div className="absolute bottom-12 text-[var(--color-text-secondary)] text-[10px] font-black uppercase tracking-[0.5em] opacity-30">
        Loading Satellite Data...
      </div>
    </motion.div>
  );
};
