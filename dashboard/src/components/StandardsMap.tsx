"use client";

import { useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';

export default function StandardsMap() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/standards')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }, []);

  const { breakdown, groupedFiles } = useMemo(() => {
    if (!data.length) return { breakdown: [], groupedFiles: {} };

    // Standard violations are pipe separated: "Lazy/Default Naming | Excessive Nesting Depth"
    // We want to explode them to count categories
    const categories: Record<string, any[]> = {};

    data.forEach(item => {
      const violations = item.Violations.split(" | ");
      violations.forEach((v: string) => {
        if (!categories[v]) categories[v] = [];
        categories[v].push(item);
      });
    });

    const breakdownArr = Object.entries(categories).map(([name, items]) => ({
      name,
      count: items.length
    })).sort((a,b) => b.count - a.count);

    return { breakdown: breakdownArr, groupedFiles: categories };
  }, [data]);

  if (loading) return (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground font-serif">
      <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
        Analyzing Hygiene Violations...
      </motion.div>
    </div>
  );

  const activeCategory = selectedCategory || (breakdown.length > 0 ? breakdown[0].name : null);
  const activeFiles = activeCategory ? groupedFiles[activeCategory] : [];

  return (
    <div className="relative w-full h-full p-12 flex flex-col overflow-y-auto no-scrollbar">
      <div className="mb-12 font-serif flex justify-between items-end">
        <div>
          <h2 className="text-3xl text-foreground mb-2">Hygiene & Standards</h2>
          <p className="text-muted-foreground max-w-md text-sm font-sans leading-relaxed">
            Visualizing structural and naming violations. These {data.length} files breach the defined Drive Standards and will require manual or automated cleanup.
          </p>
        </div>
      </div>

      <div className="flex gap-12">
        {/* Sidebar categories */}
        <div className="w-1/3 flex flex-col gap-4">
          <h3 className="text-xs font-sans tracking-widest uppercase text-muted-foreground mb-2">Violation Types</h3>
          {breakdown.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setSelectedCategory(cat.name)}
              className={`p-4 rounded-xl border cursor-pointer transition-colors flex justify-between items-center ${
                activeCategory === cat.name ? "bg-drive-review/10 border-drive-review text-drive-review" : "bg-card border-border/50 text-muted-foreground hover:border-border hover:bg-white/5"
              }`}
            >
              <span className="font-serif text-lg">{cat.name}</span>
              <span className="font-mono text-sm">{cat.count}</span>
            </motion.div>
          ))}
        </div>

        {/* File List for Active Category */}
        <div className="flex-1 bg-background/50 border border-border rounded-xl p-8 overflow-y-auto h-[60vh] no-scrollbar">
          <h3 className="font-serif text-xl mb-6 text-foreground border-b border-border/50 pb-4">
            {activeCategory} Offenders
          </h3>
          
          <div className="flex flex-col gap-3 font-mono text-[10px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-2"
              >
                {activeFiles.slice(0, 100).map((file: any, i: number) => {
                  const parts = file.Path.split('/');
                  const filename = parts.pop();
                  const path = parts.join('/') + '/';
                  
                  return (
                    <div key={i} className="flex flex-col gap-1 p-3 bg-card border border-border/50 rounded hover:border-border hover:bg-white/5 transition-colors">
                      <div className="text-muted-foreground/50 truncate" title={path}>{path}</div>
                      <div className="text-drive-review text-xs truncate" title={filename}>{filename}</div>
                    </div>
                  );
                })}
                {activeFiles.length > 100 && (
                  <div className="text-center p-4 text-muted-foreground">...and {activeFiles.length - 100} more items</div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}