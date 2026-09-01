import React from 'react';

export const TeamOverviewSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-pulse">
      {/* 1. KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between h-32"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 bg-slate-800 rounded-md" />
              <div className="w-8 h-8 rounded-xl bg-slate-800/80" />
            </div>
            <div>
              <div className="h-7 w-20 bg-slate-800 rounded-lg mb-2" />
              <div className="h-3 w-32 bg-slate-800/60 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* 2. Centro Decisionale Copilot Skeleton */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500/5 via-slate-900/80 to-slate-900/60 border border-amber-500/20 p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20" />
            <div className="space-y-1.5">
              <div className="h-4 w-44 bg-slate-800 rounded-md" />
              <div className="h-3 w-64 bg-slate-800/60 rounded-md" />
            </div>
          </div>
          <div className="h-8 w-28 bg-slate-800 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {[1, 2, 3].map((j) => (
            <div key={j} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-28 bg-slate-800 rounded-md" />
                <div className="h-4 w-12 bg-slate-800/60 rounded-full" />
              </div>
              <div className="h-3 w-full bg-slate-800/40 rounded-md" />
              <div className="h-8 w-full bg-slate-800/60 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Toolbar Filtri Skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="h-10 w-72 bg-slate-900/80 border border-slate-800 rounded-xl" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-slate-900/80 border border-slate-800 rounded-xl" />
          <div className="h-9 w-24 bg-slate-900/80 border border-slate-800 rounded-xl" />
        </div>
      </div>

      {/* 4. Griglia Card Atleti Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((k) => (
          <div
            key={k}
            className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/70 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-slate-800" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 bg-slate-800 rounded-md" />
                  <div className="h-3 w-20 bg-slate-800/60 rounded-md" />
                </div>
              </div>
              <div className="h-5 w-16 bg-slate-800 rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/60">
              <div className="space-y-1">
                <div className="h-2.5 w-12 bg-slate-800/60 rounded" />
                <div className="h-4 w-10 bg-slate-800 rounded" />
              </div>
              <div className="space-y-1">
                <div className="h-2.5 w-12 bg-slate-800/60 rounded" />
                <div className="h-4 w-10 bg-slate-800 rounded" />
              </div>
              <div className="space-y-1">
                <div className="h-2.5 w-12 bg-slate-800/60 rounded" />
                <div className="h-4 w-10 bg-slate-800 rounded" />
              </div>
            </div>
            <div className="h-9 w-full bg-slate-800/60 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const AthleteDetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-pulse">
      {/* 1. Header Dettaglio Atleta Skeleton */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800" />
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-6 w-44 bg-slate-800 rounded-lg" />
              <div className="h-5 w-20 bg-slate-800/80 rounded-full" />
            </div>
            <div className="h-4 w-60 bg-slate-800/60 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-28 bg-slate-800 rounded-xl" />
          <div className="h-10 w-32 bg-slate-800 rounded-xl" />
        </div>
      </div>

      {/* 2. KPI Summary Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-3.5 w-24 bg-slate-800 rounded" />
              <div className="w-7 h-7 bg-slate-800 rounded-lg" />
            </div>
            <div className="h-6 w-20 bg-slate-800 rounded" />
            <div className="h-3 w-28 bg-slate-800/50 rounded" />
          </div>
        ))}
      </div>

      {/* 3. Sezioni Grafici e Dettagli Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 h-80 space-y-4">
          <div className="h-5 w-40 bg-slate-800 rounded-md" />
          <div className="h-56 w-full bg-slate-800/30 rounded-xl" />
        </div>
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 h-80 space-y-4">
          <div className="h-5 w-40 bg-slate-800 rounded-md" />
          <div className="h-56 w-full bg-slate-800/30 rounded-xl" />
        </div>
      </div>
    </div>
  );
};
