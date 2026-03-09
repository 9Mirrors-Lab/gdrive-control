"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function NamingHealth() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = () => {
      fetch('/api/naming-health')
        .then(res => res.json())
        .then(d => {
          setData(d);
          setLoading(false);
        });
    };
    
    fetchData();
    const interval = setInterval(fetchData, 5000); // Auto-refresh every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground font-serif">
      <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
        Loading Naming Health...
      </motion.div>
    </div>
  );

  if (data?.error) return (
    <div className="w-full h-full flex items-center justify-center text-red-500 font-serif">
      Error loading data: {data.error}
    </div>
  );

  const { totalOddFiles = 0, oddFilesBreakdown = {}, actionHistory = [] } = data || {};
  const totalRenamed = actionHistory.filter((a: any) => a.Status === 'Success').length;
  const remaining = Math.max(0, totalOddFiles - totalRenamed);
  const progress = totalOddFiles > 0 ? (totalRenamed / totalOddFiles) * 100 : 100;

  return (
    <div className="relative w-full h-full p-12 flex flex-col overflow-hidden">
      <div className="mb-12 font-serif flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-3xl text-foreground mb-2">Naming Health & Automation</h2>
          <p className="text-muted-foreground max-w-xl text-sm font-sans leading-relaxed">
            Monitoring the Drive for files that violate the semantic naming convention. The Auto-Renamer agent is actively fixing these in the background.
          </p>
        </div>
      </div>

      <div className="flex gap-12 h-full min-h-0">
        {/* Metrics Sidebar */}
        <div className="w-1/4 min-w-[300px] flex flex-col gap-8 shrink-0 overflow-y-auto no-scrollbar pb-12">
          <div className="bg-card border border-border/50 rounded-xl p-6 flex flex-col gap-4">
            <h3 className="text-xs font-sans tracking-widest uppercase text-muted-foreground">Overall Progress</h3>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-serif text-foreground">{totalRenamed}</span>
              <span className="text-sm text-muted-foreground mb-1">/ {totalOddFiles} Fixed</span>
            </div>
            
            <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden mt-2">
              <motion.div 
                className="h-full bg-drive-active"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <div className="text-xs text-muted-foreground font-mono text-right">{progress.toFixed(1)}% Complete</div>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-6 flex flex-col gap-4">
            <h3 className="text-xs font-sans tracking-widest uppercase text-muted-foreground">Violation Types</h3>
            <div className="flex flex-col gap-3">
              {Object.entries(oddFilesBreakdown).sort((a: any, b: any) => b[1] - a[1]).map(([cat, count]: any) => (
                <div key={cat} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{cat}</span>
                  <span className="font-mono text-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action History Log */}
        <div className="flex-1 bg-background/50 border border-border rounded-xl p-8 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-6 shrink-0 border-b border-border/50 pb-4">
            <h3 className="font-serif text-xl text-foreground">
              Action History
            </h3>
            <span className="text-xs font-mono text-drive-active flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-drive-active opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-drive-active"></span>
              </span>
              Agent Active
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar pr-2 font-mono text-[10px]">
            {actionHistory.length === 0 ? (
              <div className="text-muted-foreground text-center py-12 text-sm font-sans">No actions recorded yet.</div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                {actionHistory.map((action: any, i: number) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`flex flex-col gap-2 p-4 rounded-lg border break-inside-avoid ${
                      action.Status === 'Success' 
                        ? 'bg-drive-active/5 border-drive-active/20' 
                        : action.Status === 'Skipped'
                        ? 'bg-white/5 border-white/10'
                        : 'bg-red-500/5 border-red-500/20'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-muted-foreground/50 truncate mb-2" title={action.OriginalPath}>
                          {action.OriginalPath}
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="text-muted-foreground line-through truncate" title={action.OriginalName}>
                            {action.OriginalName}
                          </div>
                          <div className="text-muted-foreground/50 text-[8px] pl-2">↓</div>
                          <div className={`truncate font-bold ${action.Status === 'Success' ? 'text-drive-active' : 'text-foreground'}`} title={action.NewName}>
                            {action.NewName}
                          </div>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded text-[9px] uppercase tracking-wider shrink-0 ${
                        action.Status === 'Success' ? 'bg-drive-active/20 text-drive-active' : 
                        action.Status === 'Skipped' ? 'bg-white/10 text-muted-foreground' : 
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {action.Status}
                      </div>
                    </div>
                    {action.Snippet && (
                      <div className="mt-3 text-muted-foreground/60 text-[9px] italic border-l-2 border-border/50 pl-2 line-clamp-3 leading-relaxed">
                        "{action.Snippet}"
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
