"use client";

import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText } from 'lucide-react';

interface FileNode {
  name: string;
  path?: string;
  size?: number;
  score?: number;
  band?: string;
  snippet?: string;
  id?: string;
  children?: FileNode[];
  value?: number;
}

const colorMap: Record<string, string> = {
  active: 'oklch(0.75 0.12 160)',
  review: 'oklch(0.78 0.12 80)',
  archive_candidate: 'oklch(0.65 0.08 280)',
  dormant: 'oklch(0.40 0.02 250)',
  folder: 'rgba(255, 255, 255, 0.05)',
};

function buildHierarchy(data: any[]): FileNode {
  const root: FileNode = { name: "gdrive:", children: [] };
  
  data.forEach(item => {
    if (!item.Path) return;
    const parts = item.Path.split('/');
    let current = root;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        // file node
        current.children = current.children || [];
        current.children.push({
          name: part,
          path: item.Path,
          size: item.Size || 0,
          score: item.Score || 0,
          band: item.RetentionBand || 'dormant',
          snippet: item.snippet || '',
          id: item.ID || '',
          value: Math.max(item.Size || 0, 1000) // minimum size for visibility
        });
      } else {
        // folder node
        current.children = current.children || [];
        let existing = current.children.find(c => c.name === part && c.children);
        if (!existing) {
          existing = { name: part, children: [] };
          current.children.push(existing);
        }
        current = existing;
      }
    }
  });
  
  return root;
}

export default function DriveMap() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const [focus, setFocus] = useState<d3.HierarchyCircularNode<FileNode> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<d3.HierarchyCircularNode<FileNode> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/value').then(res => res.json()),
      fetch('/api/content').then(res => res.json())
    ]).then(([valueData, contentData]) => {
      const snippetMap = new Map();
      if (Array.isArray(contentData)) {
        contentData.forEach((item: any) => {
          if (item.Path && item.Snippet) {
            snippetMap.set(item.Path, item.Snippet);
          }
        });
      }
      
      const enrichedData = Array.isArray(valueData) ? valueData.map((item: any) => ({
        ...item,
        snippet: snippetMap.get(item.Path) || "",
        ID: item.ID || "" // We need to pull ID here too if possible
      })) : [];
      
      setData(enrichedData);
      setLoading(false);
    });
  }, []);

  const rootNode = useMemo(() => {
    if (!data.length) return null;
    const hierarchyData = buildHierarchy(data);
    const root = d3.hierarchy<FileNode>(hierarchyData)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));
      
    const pack = d3.pack<FileNode>()
      .size([800, 800])
      .padding(3);
      
    return pack(root);
  }, [data]);

  useEffect(() => {
    if (rootNode && !focus) {
      setFocus(rootNode);
    }
  }, [rootNode, focus]);

  // Handle Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery || !rootNode) return [];
    const lowerQuery = searchQuery.toLowerCase();
    return rootNode.leaves().filter(node => 
      node.data.name.toLowerCase().includes(lowerQuery) || 
      (node.data.snippet && node.data.snippet.toLowerCase().includes(lowerQuery))
    ).slice(0, 10);
  }, [searchQuery, rootNode]);

  if (loading || !rootNode || !focus) return (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground font-serif">
      <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
        Mapping Sector...
      </motion.div>
    </div>
  );

  const viewBoxStr = `${focus.x - focus.r} ${focus.y - focus.r} ${focus.r * 2} ${focus.r * 2}`;

  return (
    <div className="relative w-full h-full overflow-hidden bg-background font-sans">
      <div className="absolute top-8 left-12 z-10">
        <h2 className="text-3xl text-foreground font-serif mb-2">Drive Universe</h2>
        <p className="text-muted-foreground text-sm flex gap-2 font-mono">
          <span className="cursor-pointer hover:text-foreground transition-colors" onClick={() => setFocus(rootNode)}>gdrive:</span>
          {focus !== rootNode && (
            <span>/ {focus.data.name}</span>
          )}
        </p>
      </div>

      {/* Semantic Search Overlay */}
      <div className="absolute top-8 right-12 z-20 flex flex-col items-end">
        <button 
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-full hover:bg-white/5 transition-colors text-muted-foreground text-sm"
        >
          <Search size={16} />
          <span>Search Drive...</span>
          <kbd className="font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded ml-2">⌘K</kbd>
        </button>

        <AnimatePresence>
          {isSearchOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 w-96 bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-border/50">
                <input
                  autoFocus
                  type="text"
                  placeholder="Semantic search files and snippets..."
                  className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="max-h-96 overflow-y-auto">
                {searchResults.map((res, i) => (
                  <div 
                    key={i} 
                    className="p-4 border-b border-border/20 hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => {
                      setFocus(res.parent || rootNode);
                      setHoveredNode(res);
                      setIsSearchOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    <div className="font-serif text-foreground truncate">{res.data.name}</div>
                    {res.data.snippet && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {res.data.snippet}
                      </div>
                    )}
                  </div>
                ))}
                {searchQuery && searchResults.length === 0 && (
                  <div className="p-4 text-center text-muted-foreground text-sm">No semantic matches found.</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <svg 
        ref={svgRef}
        viewBox={viewBoxStr} 
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full cursor-crosshair transition-all duration-1000 ease-in-out"
        style={{ transitionDuration: '1s' }}
        onClick={(e) => {
          if (e.target === svgRef.current) setFocus(rootNode);
        }}
      >
        {rootNode.descendants().slice(1).map((node, i) => {
          const isLeaf = !node.children;
          const color = isLeaf ? colorMap[node.data.band as string] || colorMap.dormant : "transparent";
          
          if (node.depth > focus.depth + 2) return null; // Don't render too deep
          
          return (
            <motion.circle
              key={`${node.data.name}-${i}`}
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={color}
              stroke={isLeaf ? "none" : "rgba(255,255,255,0.08)"}
              strokeWidth={isLeaf ? 0 : 1}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: isLeaf ? (hoveredNode === node ? 1 : 0.9) : 1, 
                scale: 1 
              }}
              whileHover={{
                stroke: "rgba(255,255,255,0.8)",
                strokeWidth: 2 / focus.r * 100
              }}
              onMouseEnter={() => {
                if (isLeaf) setHoveredNode(node);
              }}
              onMouseLeave={() => {
                if (isLeaf) setHoveredNode(null);
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!isLeaf) {
                  if (focus === node && node.parent) {
                    setFocus(node.parent);
                  } else {
                    setFocus(node);
                  }
                } else if (node.data.id) {
                  window.open(`https://drive.google.com/file/d/${node.data.id}/view`, '_blank');
                }
              }}
              className={`transition-colors duration-500 ${isLeaf ? 'cursor-pointer' : focus === node ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
            />
          );
        })}
      </svg>

      {/* Hover Info Modal */}
      <AnimatePresence>
        {hoveredNode && hoveredNode.data.path && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-12 left-12 bg-background/95 border border-border backdrop-blur-xl p-6 rounded-xl max-w-md pointer-events-none z-50 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-3">
              <FileText className="text-muted-foreground" size={20} />
              <div className="font-serif text-xl text-foreground truncate">{hoveredNode.data.name}</div>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground mb-4 break-all opacity-70">
              {hoveredNode.data.path}
            </div>
            
            <div className="flex gap-4 mb-4">
              <span className="text-xs tracking-wider uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: colorMap[hoveredNode.data.band || 'dormant'] }}></span>
                {hoveredNode.data.band?.replace('_', ' ')}
              </span>
              <span className="text-xs text-muted-foreground tracking-wider uppercase">
                {((hoveredNode.data.size || 0) / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>

            {hoveredNode.data.snippet ? (
              <div className="text-sm text-foreground/80 leading-relaxed border-t border-border/50 pt-4 relative">
                <div className="absolute top-0 left-0 w-8 h-px bg-white/20"></div>
                <div className="line-clamp-4 italic text-muted-foreground">
                  "{hoveredNode.data.snippet}"
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic border-t border-border/50 pt-4">
                No content extracted for this file.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
