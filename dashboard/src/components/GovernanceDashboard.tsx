"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle, FileWarning, Clock } from 'lucide-react';

interface GovernanceMetrics {
  ScanDate: string;
  TotalFiles: number;
  TotalSizeGB: number;
  StaleFileCount: number;
  StaleFilePercentage: number;
  StandardsViolations: number;
  ComplianceScore: number;
}

export default function GovernanceDashboard() {
  const [metrics, setMetrics] = useState<GovernanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/governance')
      .then(res => res.json())
      .then(d => {
        setMetrics(d);
        setLoading(false);
      });
  }, []);

  if (loading || !metrics) return (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground font-serif">
      <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
        Loading Governance Rollup...
      </motion.div>
    </div>
  );

  return (
    <div className="relative w-full h-full p-12 flex flex-col justify-center overflow-y-auto no-scrollbar">
      <div className="mb-16 font-serif">
        <h2 className="text-3xl text-foreground mb-2 flex items-center gap-4">
          Governance Model
          {metrics.ComplianceScore > 90 ? (
            <span className="text-sm font-sans tracking-widest text-drive-active border border-drive-active px-3 py-1 rounded-full flex items-center gap-2"><ShieldCheck size={14}/> HEALTHY</span>
          ) : (
            <span className="text-sm font-sans tracking-widest text-drive-review border border-drive-review px-3 py-1 rounded-full flex items-center gap-2"><AlertTriangle size={14}/> ACTION REQUIRED</span>
          )}
        </h2>
        <p className="text-muted-foreground max-w-md text-sm font-sans leading-relaxed">
          High-level operational metrics and compliance tracking. These KPIs inform the automated scanning cadence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl">
        {/* Compliance Score */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="p-8 border border-border bg-card rounded-xl flex flex-col gap-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldCheck size={64} />
          </div>
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Compliance Score</h3>
          <div className="text-6xl font-serif text-foreground">{metrics.ComplianceScore}%</div>
          <p className="text-xs text-muted-foreground">Target: &gt;90%</p>
        </motion.div>

        {/* Standards Violations */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="p-8 border border-border bg-card rounded-xl flex flex-col gap-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 text-drive-review">
            <FileWarning size={64} />
          </div>
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Standards Violations</h3>
          <div className="text-6xl font-serif text-drive-review">{metrics.StandardsViolations}</div>
          <p className="text-xs text-muted-foreground">Lazy naming, bad versioning, etc.</p>
        </motion.div>

        {/* Stale File Ratio */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-8 border border-border bg-card rounded-xl flex flex-col gap-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Clock size={64} />
          </div>
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Stale Files (&gt;1 Yr)</h3>
          <div className="text-6xl font-serif text-foreground">{metrics.StaleFilePercentage}%</div>
          <p className="text-xs text-muted-foreground">{metrics.StaleFileCount} items dormant.</p>
        </motion.div>

        {/* Total Surface Area */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="p-8 border border-border bg-card rounded-xl flex flex-col gap-4 relative overflow-hidden"
        >
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Total Volume Managed</h3>
          <div className="text-4xl font-serif text-foreground">{metrics.TotalSizeGB} <span className="text-xl">GB</span></div>
          <p className="text-xs text-muted-foreground">Across {metrics.TotalFiles} files.</p>
        </motion.div>
      </div>
      
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-16 max-w-4xl p-8 border border-border bg-background rounded-xl text-sm leading-relaxed text-muted-foreground font-sans"
      >
        <h3 className="text-foreground font-serif text-xl mb-4">Intervention Playbook</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>If <strong>Compliance Score drops below 90%</strong>: Trigger Phase 9 cleanup script to automatically sanitize nested folders and resolve bad naming conventions.</li>
          <li>If <strong>Stale File Percentage exceeds 40%</strong>: Execute Phase 5 Value Scoring logic and generate a dry-run migration to move all `archive_candidate` files into deep cold storage (`03-Archive/`).</li>
          <li>Weekly incremental scans are scheduled via system cron to monitor these KPIs continuously.</li>
        </ul>
      </motion.div>
    </div>
  );
}