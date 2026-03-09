"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DriveMap from "@/components/DriveMap";
import HealthMap from "@/components/HealthMap";
import DuplicateGalaxy from "@/components/DuplicateGalaxy";
import ValueLandscape from "@/components/ValueLandscape";
import MigrationSimulator from "@/components/MigrationSimulator";
import { smoothTransition, fadeIn } from "@/lib/motion";

import GovernanceDashboard from "@/components/GovernanceDashboard";
import StandardsMap from "@/components/StandardsMap";

import NamingHealth from "@/components/NamingHealth";

const VIEWS = [
  { id: "drive-map", label: "Drive Universe" },
  { id: "health-map", label: "Structural Health" },
  { id: "naming-health", label: "Naming Health" },
  { id: "duplicate-galaxy", label: "Duplicate Galaxy" },
  { id: "value-landscape", label: "Value Landscape" },
  { id: "migration-simulator", label: "Migration Simulator" },
  { id: "standards-map", label: "Hygiene & Standards" },
  { id: "governance", label: "Governance Model" },
];

export default function DriveAtlas() {
  const [activeView, setActiveView] = useState(VIEWS[0].id);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Sidebar / Navigation */}
      <nav className="w-64 border-r border-border/20 p-8 flex flex-col justify-between z-50 bg-background/80 backdrop-blur-md">
        <div>
          <h1 className="text-3xl font-serif mb-2 tracking-tight">Drive Atlas</h1>
          <p className="text-muted-foreground text-sm font-sans mb-12">
            Exploration Layer
          </p>
          
          <div className="flex flex-col gap-4 font-sans text-sm">
            {VIEWS.map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`text-left transition-all duration-500 relative py-1 pl-4 ${
                  activeView === view.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/80"
                }`}
              >
                {activeView === view.id && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute left-0 top-0 bottom-0 w-0.5 bg-foreground"
                    transition={smoothTransition}
                  />
                )}
                {view.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground/50 font-mono">
          RUN_20260306_151014
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 relative bg-background">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0"
          >
            {activeView === "drive-map" && <DriveMap />}
            {activeView === "health-map" && <HealthMap />}
            {activeView === "naming-health" && <NamingHealth />}
            {activeView === "duplicate-galaxy" && <DuplicateGalaxy />}
            {activeView === "value-landscape" && <ValueLandscape />}
            {activeView === "migration-simulator" && <MigrationSimulator />}
            {activeView === "standards-map" && <StandardsMap />}
            {activeView === "governance" && <GovernanceDashboard />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
