"use client";

import { useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';

export default function ValueLandscape() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/value').then(res => res.json()),
      fetch('/api/failures').then(res => res.json())
    ]).then(([vData, fData]) => {
      const failurePaths = new Set();
      if (Array.isArray(fData)) {
        fData.forEach((f: any) => {
          if (f.Path) failurePaths.add(f.Path);
        });
      }
      
      const merged = (Array.isArray(vData) ? vData : []).map(item => {
        if (failurePaths.has(item.Path)) {
          return { ...item, RetentionBand: 'extraction_failure' };
        }
        return item;
      }).filter(item => item.RetentionBand);
      
      setData(merged);
      setLoading(false);
    });
  }, []);

  const { bands, timelineData } = useMemo(() => {
    if (!data.length) return { bands: [], timelineData: [] };

    // Aggregate by RetentionBand
    const bandMap = d3.rollup(data, 
      v => ({ count: v.length, size: d3.sum(v, d => d.Size || 0) }), 
      d => d.RetentionBand
    );

    const bandOrder = ["active", "review", "archive_candidate", "dormant", "extraction_failure"];
    const bands = bandOrder.map(b => ({
      name: b,
      count: bandMap.get(b)?.count || 0,
      size: bandMap.get(b)?.size || 0
    }));

    // Generate timeline data for an area chart
    // Group by age days, smoothed out
    const ageGroups = d3.groups(data, d => Math.floor((d.AgeDays || 0) / 30) * 30);
    const sortedAges = ageGroups.sort((a, b) => a[0] - b[0]).slice(0, 50); // limit to 50 months (approx 4 years)
    
    const timelineData = sortedAges.map(([age, items]) => {
      return {
        age,
        active: items.filter(i => i.RetentionBand === "active").length,
        review: items.filter(i => i.RetentionBand === "review").length,
        archive: items.filter(i => i.RetentionBand === "archive_candidate").length,
        dormant: items.filter(i => i.RetentionBand === "dormant").length,
        failure: items.filter(i => i.RetentionBand === "extraction_failure").length,
        total: items.length
      };
    });

    return { bands, timelineData };
  }, [data]);

  if (loading) return (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground font-serif">
      <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
        Surveying Landscape...
      </motion.div>
    </div>
  );

  const totalSize = d3.sum(bands, d => d.size);

  const colorMap: Record<string, string> = {
    active: 'var(--color-drive-active)',
    review: 'var(--color-drive-review)',
    archive_candidate: 'var(--color-drive-archive)',
    dormant: 'var(--color-drive-dormant)',
    extraction_failure: 'oklch(0.45 0.15 20)'
  };

  // Stack setup for timeline
  const stack = d3.stack<any>()
    .keys(["active", "review", "archive", "dormant", "failure"])
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetWiggle);

  const series = stack(timelineData);
  const xDomain = d3.extent(timelineData, d => d.age) as [number, number];
  
  let yMin = d3.min(series, layer => d3.min(layer, d => d[0])) || 0;
  let yMax = d3.max(series, layer => d3.max(layer, d => d[1])) || 1;
  
  const xScale = d3.scaleLinear().domain(xDomain).range([0, 800]);
  const yScale = d3.scaleLinear().domain([yMin, yMax]).range([300, 0]);

  const areaGen = d3.area<any>()
    .x(d => xScale(d.data.age))
    .y0(d => yScale(d[0]))
    .y1(d => yScale(d[1]))
    .curve(d3.curveBasis);

  const seriesColorMap: Record<string, string> = {
    active: 'var(--color-drive-active)',
    review: 'var(--color-drive-review)',
    archive: 'var(--color-drive-archive)',
    dormant: 'var(--color-drive-dormant)',
    failure: 'oklch(0.45 0.15 20)'
  };

  return (
    <div className="relative w-full h-full p-12 flex flex-col justify-center">
      <div className="mb-16 font-serif">
        <h2 className="text-3xl text-foreground mb-2">Value Landscape</h2>
        <p className="text-muted-foreground max-w-md text-sm font-sans leading-relaxed">
          Distribution of stored intelligence by retention class, extraction health, and age.
        </p>
      </div>

      <div className="flex flex-col gap-16 max-w-4xl w-full">
        {/* Stacked Bar - Total Volume */}
        <div>
          <h3 className="font-sans text-xs tracking-widest uppercase text-muted-foreground mb-4">Total Volume by Value</h3>
          <div className="flex h-16 w-full rounded-sm overflow-hidden border border-border">
            {bands.map((band, i) => {
              const width = (band.size / totalSize) * 100;
              if (width === 0) return null;
              return (
                <motion.div
                  key={band.name}
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: i * 0.1 }}
                  className="h-full relative group"
                  style={{ backgroundColor: colorMap[band.name] }}
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-0 text-xs font-mono whitespace-nowrap z-10 bg-background/90 px-2 py-1 border border-border">
                    {band.name}: {(band.size / 1024 / 1024 / 1024).toFixed(2)} GB ({band.count} items)
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="flex justify-between mt-4 text-xs font-sans text-muted-foreground uppercase tracking-widest">
            {bands.map(b => (
              <div key={b.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colorMap[b.name] }} />
                <span>{b.name.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Area Chart */}
        <div>
           <h3 className="font-sans text-xs tracking-widest uppercase text-muted-foreground mb-4">Information Entropy over Time (Days Old)</h3>
           <svg viewBox="0 0 800 300" className="w-full h-auto overflow-visible">
             <g transform="translate(0,0)">
                {series.map((layer, i) => (
                  <motion.path
                    key={layer.key}
                    d={areaGen(layer) || ""}
                    fill={seriesColorMap[layer.key]}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 0.8, y: 0 }}
                    transition={{ duration: 1.5, delay: i * 0.2 }}
                    whileHover={{ opacity: 1 }}
                    className="cursor-pointer mix-blend-screen"
                  />
                ))}
             </g>
           </svg>
           <div className="flex justify-between w-full mt-2 text-xs font-mono text-muted-foreground opacity-50">
             <span>Recent</span>
             <span>Older</span>
           </div>
        </div>
      </div>
    </div>
  );
}
