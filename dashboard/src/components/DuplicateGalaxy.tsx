"use client";

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';

interface CollisionNode extends d3.SimulationNodeDatum {
  id: string;
  path: string;
  target: string;
  size: number;
  score: number;
  group: string; // TargetPath is the group
  isTarget?: boolean;
  isCanonical?: boolean;
  isRemoved?: boolean;
  googleId?: string;
}

interface CollisionLink extends d3.SimulationLinkDatum<CollisionNode> {
  source: string | CollisionNode;
  target: string | CollisionNode;
}

export default function DuplicateGalaxy() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [hoveredNode, setHoveredNode] = useState<CollisionNode | null>(null);
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const [clusterNodes, setClusterNodes] = useState<CollisionNode[]>([]);

  useEffect(() => {
    fetch('/api/collisions')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!data.length || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // clear previous render

    // Group data by TargetPath
    const nodes: CollisionNode[] = [];
    const links: CollisionLink[] = [];
    
    // Create central cluster nodes
    const clusters = new Set<string>();
    
    data.forEach((item, index) => {
      if (!item.TargetPath) return;
      clusters.add(item.TargetPath);
      nodes.push({
        id: `${item.Path}-${index}`, // Make id globally unique
        path: item.Path,
        target: item.TargetPath,
        size: item.Size || 0,
        score: item.Score || 0,
        group: item.TargetPath,
        isCanonical: item.isCanonical,
        isRemoved: item.isRemoved,
        googleId: item.ID || ""
      });
    });

    // Create a virtual node for each cluster target to group them
    const targetNodes = Array.from(clusters).map(target => ({
      id: `TARGET:${target}`,
      path: `Target: ${target}`,
      target: target,
      size: 0,
      score: 0,
      group: target,
      isTarget: true
    }));

    const allNodes = [...nodes, ...targetNodes] as any[];

    nodes.forEach(n => {
      links.push({
        source: n.id,
        target: `TARGET:${n.target}`
      });
    });

    const simulation = d3.forceSimulation(allNodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(20))
      .force("charge", d3.forceManyBody().strength(-30))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => d.isTarget ? 15 : 8));

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Draw links
    const link = g.append("g")
      .attr("stroke", "rgba(255,255,255,0.1)")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1);

    // Draw nodes
    const node = g.append("g")
      .selectAll("circle")
      .data(allNodes)
      .join("circle")
      .attr("r", (d: any) => d.isTarget ? 8 : 4)
      .attr("fill", (d: any) => {
        if (d.isTarget) return "none";
        return d.isCanonical ? "var(--color-drive-active)" : (d.isRemoved ? "oklch(0.4 0.1 20)" : "oklch(0.65 0.08 280)"); // Red-ish if removed
      })
      .attr("stroke", (d: any) => d.isTarget ? "rgba(255,255,255,0.4)" : (d.isRemoved ? "red" : "none"))
      .attr("stroke-width", (d: any) => d.isRemoved ? 1 : 1.5)
      .attr("stroke-dasharray", (d: any) => d.isTarget ? "2 2" : "none")
      .call(d3.drag<Element, unknown, unknown>()
        .on("start", dragstarted as any)
        .on("drag", dragged as any)
        .on("end", dragended as any) as any);

    node.on("mouseover", (event, d: any) => {
      if (!d.isTarget) setHoveredNode(d);
      d3.select(event.currentTarget).attr("stroke", "#fff").attr("stroke-width", 2);
    }).on("mouseout", (event, d: any) => {
      setHoveredNode(null);
      d3.select(event.currentTarget).attr("stroke", d.isTarget ? "rgba(255,255,255,0.4)" : "none");
    }).on("click", (event, d: any) => {
      const targetPath = d.target;
      setActiveCluster(targetPath);
      setClusterNodes(allNodes.filter((n: any) => !n.isTarget && n.target === targetPath) as CollisionNode[]);
    }).on("contextmenu", (event, d: any) => {
      // Right click to open file directly
      if (!d.isTarget && d.googleId) {
        event.preventDefault();
        window.open(`https://drive.google.com/file/d/${d.googleId}/view`, '_blank');
      }
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data]);

  const handleMarkCanonical = async (canonicalNode: CollisionNode) => {
    const others = clusterNodes.filter(n => n.id !== canonicalNode.id);
    const approvalData = {
      targetPath: canonicalNode.target,
      canonical: canonicalNode.path,
      quarantine: others.map(n => n.path)
    };
    
    await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'canonical_selection', data: approvalData })
    });
    
    setActiveCluster(null);
    setClusterNodes([]);
  };

  if (loading) return (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground font-serif">
      <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
        Plotting Duplicates...
      </motion.div>
    </div>
  );

  return (
    <div className="relative w-full h-full flex" ref={containerRef}>
      <div className="flex-1 relative">
        <div className="absolute top-8 left-12 z-10 font-serif pointer-events-none">
          <h2 className="text-3xl text-foreground mb-2">Duplicate Galaxy</h2>
          <p className="text-muted-foreground max-w-xl text-sm font-sans leading-relaxed">
            When multiple files are mapped to the exact same destination name, a <strong>collision</strong> occurs. <br/><br/>
            Each cluster below represents a collision. The center dot is the destination folder, and the orbiting dots are the duplicate files. I have already picked a "Canonical Winner" (green dot) for each based on file size and quality. <br/><br/>
            <strong>Click any cluster</strong> to review the files and manually override the winner if needed.
          </p>
        </div>

        <svg ref={svgRef} className="w-full h-full bg-background cursor-move" />

        {hoveredNode && !activeCluster && (
          <div className="absolute bottom-12 left-12 bg-background/90 border border-border backdrop-blur-md p-6 rounded-lg max-w-lg pointer-events-none z-50">
            <div className="font-mono text-xs text-muted-foreground mb-1 break-all">Source: {hoveredNode.path}</div>
            <div className="font-serif text-lg mb-4 text-drive-review break-all">Target: {hoveredNode.target}</div>
            <div className="grid grid-cols-2 gap-4 font-sans text-sm mb-4">
              <div>
                <div className="text-muted-foreground">Size</div>
                <div className="text-foreground">{(hoveredNode.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
              <div>
                <div className="text-muted-foreground">Score</div>
                <div className="text-foreground">{hoveredNode.score}</div>
              </div>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground border-t border-border/50 pt-3">
              Right-click to open in Google Drive
            </div>
          </div>
        )}
      </div>

      {/* Decision Panel for Canonical Selection */}
      <AnimatePresence>
        {activeCluster && (
          <motion.div 
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            className="w-[450px] bg-background/95 border-l border-border backdrop-blur-xl h-full flex flex-col shadow-2xl z-40 overflow-hidden"
          >
            <div className="p-8 border-b border-border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-serif text-xl text-foreground">Resolve Collision</h3>
                <button onClick={() => setActiveCluster(null)} className="text-muted-foreground hover:text-foreground">
                  <XCircle size={20} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground font-mono break-all mb-2">Target Path:</p>
              <p className="text-sm font-sans text-drive-review break-all">{activeCluster}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-black/20">
              {clusterNodes.map((node) => (
                <div key={node.id} className="bg-card border border-border p-4 rounded-xl relative group">
                  <div className="font-mono text-[10px] text-muted-foreground mb-2 break-all">{node.path}</div>
                  <div className="flex justify-between items-center text-xs mb-4">
                    <span className="text-foreground">{(node.size / 1024 / 1024).toFixed(2)} MB</span>
                    <span className="text-muted-foreground flex gap-4 items-center">
                      <span>Score: <span className="text-foreground">{node.score}</span></span>
                      {node.googleId && (
                        <a 
                          href={`https://drive.google.com/file/d/${node.googleId}/view`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded transition-colors text-foreground"
                          title="Open in Google Drive"
                        >
                          Open
                        </a>
                      )}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleMarkCanonical(node)}
                    disabled={node.isCanonical || node.isRemoved}
                    className={`w-full py-2 flex items-center justify-center gap-2 border rounded-md text-xs tracking-wider uppercase transition-all ${
                      node.isCanonical 
                        ? 'border-drive-active text-drive-active bg-drive-active/10 cursor-default' 
                        : node.isRemoved 
                          ? 'border-red-500/50 text-red-500/50 bg-red-500/5 cursor-default'
                          : 'border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground group-hover:bg-white/5'
                    }`}
                  >
                    <CheckCircle2 size={14} /> {node.isCanonical ? "Canonical Winner" : node.isRemoved ? "Quarantined / Removed" : "Mark Canonical"}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
