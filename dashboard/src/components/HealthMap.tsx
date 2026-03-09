"use client";

import { useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';

interface FolderMetric {
  Folder: string;
  Depth: number;
  FileCount: number;
  TotalSizeMB: number;
  UniqueMimeTypes: number;
  MixedContentScore: number;
}

export default function HealthMap() {
  const [data, setData] = useState<FolderMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<FolderMetric | null>(null);

  useEffect(() => {
    fetch('/api/structure')
      .then(res => res.json())
      .then(d => {
        // filter out invalid data
        const valid = d.filter((item: any) => item.Folder && item.Depth !== undefined);
        setData(valid);
        setLoading(false);
      });
  }, []);

  const { xScale, yScale, colorScale, sizeScale } = useMemo(() => {
    if (!data.length) return { xScale: null, yScale: null, colorScale: null, sizeScale: null };

    const maxDepth = d3.max(data, d => d.Depth) || 10;
    const maxFiles = d3.max(data, d => d.FileCount) || 100;
    const maxScore = d3.max(data, d => d.MixedContentScore) || 1;
    const maxSize = d3.max(data, d => d.TotalSizeMB) || 1000;

    const x = d3.scaleLinear().domain([0, maxDepth + 1]).range([50, 750]);
    const y = d3.scaleSymlog().domain([0, maxFiles]).range([550, 50]);
    
    // Warm amber for high entropy/mixed content
    const color = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxScore]);
    
    const size = d3.scaleSqrt().domain([0, maxSize]).range([4, 40]);

    return { xScale: x, yScale: y, colorScale: color, sizeScale: size };
  }, [data]);

  if (loading || !xScale || !yScale || !colorScale || !sizeScale) return (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground font-serif">
      <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
        Analyzing Structural Health...
      </motion.div>
    </div>
  );

  return (
    <div className="relative w-full h-full p-8 flex flex-col items-center justify-center">
      <div className="absolute top-8 left-12 z-10 font-serif">
        <h2 className="text-3xl text-foreground mb-2">Structural Health</h2>
        <p className="text-muted-foreground max-w-md text-sm font-sans leading-relaxed">
          Mapping folders by depth and density. Brighter nodes indicate high entropy (mixed content types), signaling potential clutter hotspots.
        </p>
      </div>

      <svg viewBox="0 0 800 600" className="w-full max-w-5xl h-auto overflow-visible">
        {/* Grid lines */}
        {xScale.ticks(10).map(tick => (
          <line key={`x-${tick}`} x1={xScale(tick)} x2={xScale(tick)} y1={50} y2={550} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
        ))}
        {yScale.ticks(5).map(tick => (
          <line key={`y-${tick}`} x1={50} x2={750} y1={yScale(tick)} y2={yScale(tick)} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
        ))}

        {/* Axes Labels */}
        <text x={400} y={580} textAnchor="middle" fill="rgba(255,255,255,0.4)" className="text-xs font-sans tracking-widest uppercase">Nesting Depth</text>
        <text x={-300} y={20} transform="rotate(-90)" textAnchor="middle" fill="rgba(255,255,255,0.4)" className="text-xs font-sans tracking-widest uppercase">File Density</text>

        {/* Nodes */}
        {data.map((d, i) => (
          <motion.circle
            key={i}
            cx={xScale(d.Depth)}
            cy={yScale(d.FileCount)}
            r={sizeScale(d.TotalSizeMB || 1)}
            fill={colorScale(d.MixedContentScore)}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ delay: i * 0.005, duration: 1, type: "spring" }}
            whileHover={{ opacity: 1, scale: 1.2, stroke: "#fff", strokeWidth: 2 }}
            onMouseEnter={() => setHovered(d)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-crosshair mix-blend-screen"
          />
        ))}
      </svg>

      {/* Hover Info */}
      {hovered && (
        <div className="absolute bottom-12 left-12 bg-background/90 border border-border backdrop-blur-md p-6 rounded-lg max-w-sm pointer-events-none z-50">
          <div className="font-mono text-xs text-muted-foreground mb-1 break-all">{hovered.Folder}</div>
          <div className="font-serif text-xl mb-4 text-foreground">{hovered.FileCount} files</div>
          <div className="grid grid-cols-2 gap-4 font-sans text-sm">
            <div>
              <div className="text-muted-foreground">Depth</div>
              <div className="text-foreground">{hovered.Depth}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Size</div>
              <div className="text-foreground">{hovered.TotalSizeMB?.toFixed(2)} MB</div>
            </div>
            <div>
              <div className="text-muted-foreground">Unique Types</div>
              <div className="text-foreground">{hovered.UniqueMimeTypes}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Entropy</div>
              <div className="text-drive-review font-medium">{hovered.MixedContentScore?.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
