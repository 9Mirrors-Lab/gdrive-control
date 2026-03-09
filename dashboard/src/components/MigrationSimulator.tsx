"use client";

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, Search, Settings2, Plus, X, RefreshCw } from 'lucide-react';

export default function MigrationSimulator() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProposed, setIsProposed] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredFile, setHoveredFile] = useState<any | null>(null);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const [isRemapping, setIsRemapping] = useState(false);
  const [colorMode, setColorMode] = useState<'retention' | 'type'>('retention');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [tags, setTags] = useState<Record<string, string>>({});
  const [taggingItem, setTaggingItem] = useState<any | null>(null);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    fetch('/api/migration')
      .then(res => res.json())
      .then(d => {
        setData(d); // load all for searchability
        setLoading(false);
      });
      
    fetch('/api/rules')
      .then(res => res.json())
      .then(r => setRules(r || []));
      
    fetch('/api/tags')
      .then(res => res.json())
      .then(t => setTags(t || {}));
  }, []);

  const getFileType = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    if (!ext || ext === path) return 'unknown';
    
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return 'doc';
    if (['ppt', 'pptx', 'key'].includes(ext)) return 'ppt';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'xls';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
    if (['zip', 'rar', 'tar', 'gz'].includes(ext)) return 'archive';
        if (['js', 'ts', 'py', 'html', 'css', 'json', 'ipynb', 'csv'].includes(ext)) return 'code';
    
    return 'unknown';
  };

  const filteredData = useMemo(() => {
    let result = data;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(item => 
        (item.Path && item.Path.toLowerCase().includes(lower)) || 
        (item.TargetPath && item.TargetPath.toLowerCase().includes(lower))
      );
    }
    if (activeFilter) {
      if (colorMode === 'retention') {
        result = result.filter(item => item.RetentionBand === activeFilter);
      } else {
        result = result.filter(item => {
          const type = getFileType(item.Path);
          return type === activeFilter || (activeFilter === 'unknown' && type === 'unknown');
        });
      }
    }
    return result;
  }, [data, searchTerm, activeFilter, colorMode]);

  const { currentGroups, proposedGroups } = useMemo(() => {
    if (!filteredData.length) return { currentGroups: {}, proposedGroups: {} };

    const curr: Record<string, any[]> = {};
    const prop: Record<string, any[]> = {};

    filteredData.forEach(item => {
      if (!item.Path || !item.TargetPath) return;
      
      const currFolder = item.Path.split('/')[0] || "root";
      
      // Get the first TWO levels for proposed, to show the semantic topics
      // e.g. "01-Active/Trading & Market Analysis"
      const propParts = item.TargetPath.split('/');
      // Instead of flattening, let's keep the exact target directory as the "folder" group
              // E.g., if path is "Trading/file.txt", the folder is "Trading"
      const propFolder = propParts.slice(0, -1).join('/') || "root";

      if (!curr[currFolder]) curr[currFolder] = [];
      curr[currFolder].push(item);

      if (!prop[propFolder]) prop[propFolder] = [];
      prop[propFolder].push(item);
    });

    return { currentGroups: curr, proposedGroups: prop };
  }, [data]);

  const handleApprove = async () => {
    await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        type: 'migration_approval', 
        data: { timestamp: new Date().toISOString(), approvedItems: data.length } 
      })
    });
    setIsApproved(true);
  };

  const handleSaveRules = async (newRules: any[]) => {
    setRules(newRules);
    await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRules)
    });
  };

  const handleRemap = async () => {
    setIsRemapping(true);
    try {
      await fetch('/api/rerun', { method: 'POST' });
      // Refresh data
      const d = await fetch('/api/migration').then(res => res.json());
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRemapping(false);
    }
  };

  const handleSaveTag = async (path: string, tag: string) => {
    const newTags = { ...tags, [path]: tag };
    if (!tag) delete newTags[path];
    setTags(newTags);
    await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTags)
    });
    setTaggingItem(null);
    setTagInput("");
  };

  if (loading) return (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground font-serif">
      <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
        Preparing Simulation...
      </motion.div>
    </div>
  );

  const activeGroups = isProposed ? proposedGroups : currentGroups;

  const colorMap: Record<string, string> = {
    active: 'var(--color-drive-active)',
    review: 'var(--color-drive-review)',
    archive_candidate: 'var(--color-drive-archive)',
    dormant: 'var(--color-drive-dormant)'
  };

  const typeColorMap: Record<string, string> = {
    doc: '#3b82f6', // blue
    ppt: '#ef4444', // red
    pdf: '#ef4444', // red/orange
    xls: '#22c55e', // green
    image: '#a855f7', // purple
    video: '#f59e0b', // violet
    audio: '#ec4899', // pink
    archive: '#71717a', // gray
    code: '#eab308', // amber
    unknown: 'var(--color-drive-dormant)'
  };

  const getFileColor = (item: any, mode: 'retention' | 'type') => {
    if (mode === 'retention') {
      return colorMap[item.RetentionBand] || colorMap.dormant;
    } else {
      const type = getFileType(item.Path);
      return typeColorMap[type] || typeColorMap.unknown;
    }
  };

  const selectedItems = selectedFolder ? activeGroups[selectedFolder] : [];

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      <div className={`flex-1 p-6 md:p-8 lg:p-10 flex flex-col overflow-y-auto no-scrollbar transition-all duration-500 ease-in-out ${showRuleBuilder ? 'ml-[450px]' : ''} ${isProposed ? 'pb-[35vh]' : ''}`}>
        <div className="mb-8 font-serif flex justify-between items-end">
          <div>
            <h2 className="text-3xl text-foreground mb-2 flex items-center gap-4">
              Migration Simulator
              {isApproved && <span className="text-sm font-sans tracking-widest text-drive-active border border-drive-active px-3 py-1 rounded-full flex items-center gap-2"><CheckCircle2 size={14}/> APPROVED</span>}
            </h2>
            <p className="text-muted-foreground max-w-md text-sm font-sans leading-relaxed mb-4">
              Preview the structural realignment. Watch as disparate files reorganize into the proposed domain architecture.
            </p>
            {colorMode === 'retention' ? (
              <div className="flex flex-wrap gap-4 items-center text-[10px] uppercase tracking-widest font-mono">
                {Object.entries(colorMap).map(([key, color]) => (
                  <div 
                    key={key} 
                    onClick={() => setActiveFilter(activeFilter === key ? null : key)}
                    className={`flex items-center gap-1 cursor-pointer transition-all ${activeFilter && activeFilter !== key ? 'opacity-30 grayscale' : 'opacity-100 hover:opacity-80'}`}
                  >
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: color}}></div> 
                    {key.replace('_', ' ')}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-4 items-center text-[10px] uppercase tracking-widest font-mono">
                {Object.entries(typeColorMap).map(([key, color]) => {
                  if (['video', 'audio', 'archive'].includes(key)) return null; // keep legend simple
                  const label = key === 'doc' ? 'Docs' : key === 'ppt' ? 'Slides' : key === 'xls' ? 'Sheets' : key === 'image' ? 'Media' : key === 'code' ? 'Code' : 'Other';
                  return (
                    <div 
                      key={key} 
                      onClick={() => setActiveFilter(activeFilter === key ? null : key)}
                      className={`flex items-center gap-1 cursor-pointer transition-all ${activeFilter && activeFilter !== key ? 'opacity-30 grayscale' : 'opacity-100 hover:opacity-80'}`}
                    >
                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: color}}></div> 
                      {label}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => {
                setColorMode(colorMode === 'retention' ? 'type' : 'retention');
                setActiveFilter(null);
              }}
              className="px-4 py-2 border border-border rounded-full font-sans text-sm transition-colors hover:bg-white/5 text-muted-foreground flex items-center gap-2"
              title="Toggle color mode"
            >
              <div className="w-3 h-3 rounded-full overflow-hidden flex border border-border/50">
                <div className="w-1/2 h-full" style={{backgroundColor: colorMode === 'retention' ? colorMap.active : typeColorMap.doc}}></div>
                <div className="w-1/2 h-full" style={{backgroundColor: colorMode === 'retention' ? colorMap.archive_candidate : typeColorMap.image}}></div>
              </div>
              Color By: {colorMode === 'retention' ? 'Status' : 'Type'}
            </button>
            <button
              onClick={() => setShowRuleBuilder(true)}
              className="px-4 py-2 border border-border rounded-full font-sans text-sm transition-colors hover:bg-white/5 text-muted-foreground flex items-center gap-2"
              title="Configure routing rules"
            >
              <Settings2 size={16} /> Rules
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input 
                type="text" 
                placeholder="Search files or paths..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value === "") {
                    setSelectedFolder(null);
                    setHoveredFile(null);
                  }
                }}
                className="pl-10 pr-4 py-2 bg-background border border-border rounded-full font-sans text-sm focus:outline-none focus:border-foreground transition-colors w-64 text-foreground placeholder:text-muted-foreground/50"
              />
              <AnimatePresence>
                {searchTerm && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-4 w-96 max-h-96 bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-y-auto z-50"
                  >
                    <div className="p-3 text-xs font-mono text-muted-foreground border-b border-border/50 bg-black/20">
                      Found {filteredData.length} matches
                    </div>
                    {filteredData.slice(0, 20).map((res, i) => {
                      const filename = res.Path.split('/').pop() || res.Path;
                      const displayPath = isProposed ? res.TargetPath : res.Path;
                      return (
                        <div 
                          key={i} 
                          className="p-4 border-b border-border/20 hover:bg-white/5 cursor-pointer transition-colors"
                          onClick={() => {
                            setHoveredFile(res);
                            const folder = isProposed 
                              ? res.TargetPath.split('/').slice(0, -1).join('/') || "root" 
                              : res.Path.split('/')[0] || "root";
                            setSelectedFolder(folder);
                            setSearchTerm("");
                          }}
                        >
                          <div className="font-serif text-foreground truncate">{filename}</div>
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {displayPath}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={() => {
                setIsProposed(!isProposed);
                setSelectedFolder(null);
                setSearchTerm("");
              }}
              className="px-6 py-2 border border-border rounded-full font-sans text-sm tracking-wide uppercase transition-colors hover:bg-white/5 text-muted-foreground hover:text-foreground shrink-0"
            >
              {isProposed ? "View Current Structure" : "Simulate Migration"}
            </button>
          </div>
        </div>

        <div className="flex gap-12 pb-[60vh] overflow-x-auto no-scrollbar items-start">
          {!isProposed ? (
            // CURRENT STRUCTURE VIEW
            <div className="flex flex-col gap-16 shrink-0 w-full max-w-[1200px]">
              <div className="flex flex-col gap-8 relative">
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-8">
                  {Object.entries(currentGroups).sort((a,b) => a[0].localeCompare(b[0])).map(([folder, items]) => (
                    <div key={folder} className="break-inside-avoid mb-10 pl-3 border-l border-border/40 relative">
                      <div className="mb-4 break-inside-avoid relative">
                        <h3 
                          className="font-mono text-xs text-muted-foreground mb-2 border-b border-border/30 pb-1 cursor-pointer hover:text-foreground transition-colors flex justify-between"
                          onClick={() => setSelectedFolder(folder)}
                        >
                          <span>/{folder}</span>
                          <span>{items.length}</span>
                        </h3>
                        <div className="flex flex-wrap gap-[3px] pr-2">
                          {items.map((item, i) => (
                            <div key={`${item.Path}-${i}`} className="relative group">
                              <motion.div
                                layoutId={`${item.Path}-${i}`}
                                onClick={(e) => {
                                  if (item.ID) {
                                    e.stopPropagation();
                                    window.open(`https://drive.google.com/file/d/${item.ID}/view`, '_blank');
                                  } else {
                                    setSelectedFolder(folder);
                                    setHoveredFile(null);
                                  }
                                }}
                                onMouseEnter={() => setHoveredFile(item)}
                                onMouseLeave={() => setHoveredFile(null)}
                                className="w-[6px] h-[6px] rounded-full cursor-pointer hover:scale-150 transition-transform relative z-10"
                                style={{ backgroundColor: getFileColor(item, colorMode) }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // PROPOSED STRUCTURE VIEW (Flat taxonomy, no 01-Active/02-Review wrappers)
            <div className="flex flex-col gap-16 shrink-0 w-full">
              <div className="columns-1 md:columns-2 xl:columns-3 2xl:columns-4 gap-12 space-y-12">
                {/* Group top-level domains */}
                {Object.entries(
                  Object.entries(proposedGroups).reduce((acc, [folder, items]) => {
                    const topLevel = folder.split('/')[0];
                    if (!acc[topLevel]) acc[topLevel] = [];
                    acc[topLevel].push([folder, items]);
                    return acc;
                  }, {} as Record<string, [string, any[]][]>)
                ).sort((a,b) => a[0].localeCompare(b[0])).map(([topLevel, subFolders]) => (
                  
                  <div key={topLevel} className="break-inside-avoid relative bg-black/20 rounded-2xl p-6 border border-border/50 shadow-sm">
                    <div className="sticky top-0 z-20 bg-transparent pb-4 mb-4 border-b border-border/50">
                      <h3 className="text-xl font-serif text-foreground flex items-center gap-3">
                        {topLevel}
                      </h3>
                    </div>
                    
                    <div className="flex flex-col gap-6">
                      {subFolders.sort((a,b) => a[0].localeCompare(b[0])).map(([folder, items]) => {
                        const displayFolder = folder.replace(`${topLevel}/`, '') || "Root";
                        
                        return (
                          <div key={folder} className="break-inside-avoid relative pl-3 border-l border-border/30 hover:border-border transition-colors">
                            <h3 
                              className="font-mono text-xs text-muted-foreground mb-2 border-b border-border/20 pb-1 cursor-pointer hover:text-foreground transition-colors flex justify-between group"
                              onClick={() => setSelectedFolder(folder)}
                            >
                              <span className="group-hover:translate-x-1 transition-transform">{displayFolder === "Root" ? "/" : `↳ /${displayFolder}`}</span>
                              <span className="bg-background px-1.5 rounded text-[9px]">{items.length}</span>
                            </h3>
                            <div className="flex flex-wrap gap-[4px] pr-2 mt-3">
                              {items.map((item, i) => (
                                <div key={`${item.Path}-${i}`} className="relative group">
                                  <motion.div
                                    layoutId={`${item.Path}-${i}`}
                                    transition={{ type: "spring", stiffness: 40, damping: 15 }}
                                    onClick={(e) => {
                                      if (item.ID) {
                                        e.stopPropagation();
                                        window.open(`https://drive.google.com/file/d/${item.ID}/view`, '_blank');
                                      }
                                    }}
                                    onMouseEnter={() => setHoveredFile(item)}
                                    onMouseLeave={() => setHoveredFile(null)}
                                    className="w-[8px] h-[8px] rounded-full cursor-pointer hover:scale-150 transition-transform relative z-10"
                                    style={{ backgroundColor: getFileColor(item, colorMode) }}
                                  />
                                  {hoveredFile === item && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[300px] bg-background border border-border rounded-md shadow-xl p-3 z-50 pointer-events-none">
                                      <div className="text-xs text-foreground break-all mb-1 font-sans">{item.Path}</div>
                                      <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getFileColor(item, colorMode) }}></span>
                                        {item.RetentionBand} • {Math.round(item.Size / 1024)}KB
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decision Panel (Rule Builder) */}
      <AnimatePresence>
        {showRuleBuilder && (
          <motion.div 
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            className="absolute top-0 left-0 h-full w-[450px] z-40 bg-background/95 border-r border-border backdrop-blur-xl flex flex-col shadow-2xl"
          >
            <div className="p-8 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="font-serif text-xl text-foreground">Routing Rules</h3>
                <p className="text-xs text-muted-foreground font-sans mt-1">Override semantic mapping logic.</p>
              </div>
              <button onClick={() => setShowRuleBuilder(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {[...rules, { isNew: true, conditionType: 'extension', conditionValue: '', targetDomain: '' }].map((rule, idx) => {
                const isNewRule = (rule as any).isNew;
                return (
                <div key={idx} className={`flex flex-col gap-2 p-4 rounded-lg border ${isNewRule ? 'border-dashed border-border/50 bg-transparent' : 'border-border bg-card'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest">{isNewRule ? 'Add New Rule' : `Rule ${idx + 1}`}</span>
                    {!isNewRule && (
                      <button 
                        onClick={() => {
                          const newRules = rules.filter((_, i) => i !== idx);
                          setRules(newRules);
                        }}
                        className="text-red-500/70 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-[auto_1fr] items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground font-mono w-12">IF</span>
                    <select 
                      className="bg-background border border-border rounded px-2 py-1 text-xs font-sans w-full"
                      value={rule.conditionType}
                      onChange={(e) => {
                        const newRules = [...rules];
                        if (isNewRule) newRules.push({ conditionType: e.target.value, conditionValue: '', targetDomain: '' });
                        else newRules[idx].conditionType = e.target.value;
                        setRules(newRules);
                      }}
                    >
                      <option value="extension">Extension</option>
                      <option value="path_contains">Path Contains</option>
                      <option value="name_contains">Name Contains</option>
                      <option value="mime_type">Mime Type</option>
                    </select>
                    
                    <span className="text-xs text-muted-foreground font-mono w-12">IS</span>
                    <input 
                      type="text" 
                      className="bg-background border border-border rounded px-3 py-1 text-xs font-sans w-full"
                      placeholder="e.g. .ipynb or colab"
                      value={rule.conditionValue}
                      onChange={(e) => {
                        const newRules = [...rules];
                        if (isNewRule) newRules.push({ conditionType: rule.conditionType, conditionValue: e.target.value, targetDomain: '' });
                        else newRules[idx].conditionValue = e.target.value;
                        setRules(newRules);
                      }}
                    />
                    
                    <span className="text-xs text-muted-foreground font-mono w-12">ROUTE</span>
                    <input 
                      type="text" 
                      className="bg-background border border-border rounded px-3 py-1 text-xs font-sans w-full"
                      placeholder="e.g. Colab Notebooks"
                      value={rule.targetDomain}
                      onChange={(e) => {
                        const newRules = [...rules];
                        if (isNewRule) newRules.push({ conditionType: rule.conditionType, conditionValue: '', targetDomain: e.target.value });
                        else newRules[idx].targetDomain = e.target.value;
                        setRules(newRules);
                      }}
                    />
                  </div>
                </div>
              )})}
            </div>
            
            <div className="p-6 border-t border-border bg-card">
              <button 
                onClick={async () => {
                  await handleSaveRules(rules);
                  handleRemap();
                }}
                disabled={isRemapping}
                className="w-full py-3 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRemapping ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><RefreshCw size={14} /></motion.div> : <RefreshCw size={14} />}
                {isRemapping ? "Remapping Data..." : "Save & Re-run Mapping"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Execution Plan (Bottom Drawer) */}
      <AnimatePresence>
        {isProposed && (
          <motion.div 
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            className="absolute bottom-0 left-0 w-full h-[35vh] bg-background/95 border-t border-border backdrop-blur-xl flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.3)] z-30"
          >
            <div className="flex justify-between items-center px-8 py-4 border-b border-border bg-card">
              <div className="flex items-center gap-6">
                <h3 className="font-serif text-lg text-foreground">Execution Plan</h3>
                <span className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest flex items-center gap-3 border-l border-border pl-6">
                  <span>{selectedFolder ? `Showing moves into /${selectedFolder}` : 'Showing sample moves'}</span>
                  <span className="w-1 h-1 rounded-full bg-border"></span>
                  <span>{filteredData.length} total operations</span>
                </span>
              </div>
              
              <div>
                {!isApproved ? (
                  <button 
                    onClick={handleApprove}
                    title="Finalize mapping and prepare the dry-run script for execution"
                    className="px-4 py-1.5 flex items-center gap-2 bg-foreground text-background font-medium rounded-full text-xs hover:bg-foreground/90 transition-colors shadow-sm"
                  >
                    <CheckCircle2 size={14} /> Generate Script
                  </button>
                ) : (
                  <div className="px-4 py-1.5 flex items-center gap-2 border border-drive-active text-drive-active font-medium rounded-full text-xs bg-drive-active/5">
                    <CheckCircle2 size={14} /> Script Ready
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-black/20 font-mono text-[11px] relative">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(selectedFolder ? selectedItems : filteredData).slice(0, 150).map((item, i) => {
                  const tag = tags[item.Path];
                  return (
                  <div 
                    key={i} 
                    className={`bg-card border p-3 pr-12 rounded-md flex flex-col gap-1.5 hover:border-foreground/50 transition-colors group cursor-pointer relative ${tag ? 'border-drive-active/50' : 'border-border'}`}
                    onClick={() => {
                      setTaggingItem(item);
                      setTagInput(tag || "");
                    }}
                  >
                    <div className="text-muted-foreground break-all truncate group-hover:text-foreground/80 transition-colors" title={item.Path}>{item.Path}</div>
                    <div className="flex items-center gap-2 text-drive-review break-all truncate" title={item.TargetPath}>
                      <ArrowRight size={12} className="shrink-0" /> {item.TargetPath}
                    </div>
                    {tag && (
                      <div className="mt-1 inline-block px-2 py-0.5 bg-drive-active/10 text-drive-active border border-drive-active/30 rounded-full text-[9px] w-max max-w-full truncate">
                        🏷️ {tag}
                      </div>
                    )}
                    {item.ID && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://drive.google.com/file/d/${item.ID}/view`, '_blank');
                        }}
                        className="absolute top-2 right-2 text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-foreground transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Open in Google Drive"
                      >
                        Open
                      </div>
                    )}
                  </div>
                )})}
              </div>
              
              {(!selectedFolder && filteredData.length > 150) && (
                <div className="text-center text-muted-foreground p-4 mt-4 border-t border-border/30">...and {filteredData.length - 150} more records</div>
              )}
              
              {/* Tagging Popover */}
              <AnimatePresence>
                {taggingItem && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-4 w-[320px] z-[100] flex flex-col gap-3 font-sans"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-xs font-medium text-foreground truncate" title={taggingItem.Path}>
                          {taggingItem.Path.split('/').pop()}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate" title={taggingItem.Path}>
                          {taggingItem.Path.split('/').slice(0, -1).join('/') || '/'}
                        </p>
                      </div>
                      <button onClick={() => setTaggingItem(null)} className="text-muted-foreground hover:text-foreground shrink-0 p-1.5 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                    
                    <div className="relative">
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="Type tag & press Enter..." 
                        className="w-full bg-black/20 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-foreground transition-colors pr-16"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTag(taggingItem.Path, tagInput);
                          if (e.key === 'Escape') setTaggingItem(null);
                        }}
                      />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {tags[taggingItem.Path] && (
                          <button 
                            onClick={() => handleSaveTag(taggingItem.Path, "")}
                            className="text-[9px] font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-1.5 py-1 rounded transition-colors"
                            title="Remove tag"
                          >
                            Clear
                          </button>
                        )}
                        {tagInput.trim() && (
                          <div className="text-[9px] text-muted-foreground font-mono bg-white/5 border border-border/50 px-1.5 py-0.5 rounded pointer-events-none flex items-center gap-0.5">
                            ↵
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {Array.from(new Set(Object.values(tags).filter(Boolean))).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from(new Set(Object.values(tags).filter(Boolean))).map((t, idx) => {
                          const isSelected = tags[taggingItem.Path] === t;
                          return (
                            <button
                              key={idx}
                              onClick={() => handleSaveTag(taggingItem.Path, t as string)}
                              className={`px-2 py-1 border rounded-md text-[10px] transition-all flex items-center gap-1 shadow-sm
                                ${isSelected 
                                  ? 'bg-drive-active/10 border-drive-active/50 text-drive-active' 
                                  : 'bg-white/5 hover:bg-white/10 border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                                }`}
                            >
                              {t as string}
                              {isSelected && <CheckCircle2 size={10} />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
