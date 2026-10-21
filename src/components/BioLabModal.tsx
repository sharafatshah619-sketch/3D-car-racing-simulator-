import React, { useEffect, useState } from 'react';
import { BioCompound } from '../types/game';
import { BIO_COMPOUNDS } from '../data/scienceData';
import { fetchPubChemDetails, PubChemCompoundDetails } from '../services/pubchemService';
import { X, ExternalLink, Dna, Zap, ShieldAlert, CheckCircle2, Sparkles, BookOpen } from 'lucide-react';

interface BioLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCompound: BioCompound;
  onSelectCompound: (c: BioCompound) => void;
}

export const BioLabModal: React.FC<BioLabModalProps> = ({
  isOpen,
  onClose,
  activeCompound,
  onSelectCompound,
}) => {
  const [selected, setSelected] = useState<BioCompound>(activeCompound);
  const [pubchemData, setPubchemData] = useState<PubChemCompoundDetails | null>(null);
  const [loadingPubChem, setLoadingPubChem] = useState(false);

  useEffect(() => {
    setSelected(activeCompound);
  }, [activeCompound]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingPubChem(true);

    fetchPubChemDetails(selected.cid).then((res) => {
      if (isMounted) {
        setPubchemData(res);
        setLoadingPubChem(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selected, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/60 text-cyan-400">
              <Dna className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Biomechanical Catalyst & Fuel Synthesis Lab
              </h2>
              <p className="text-xs text-slate-400">
                Ground-truth biochemistry from PubChem & UniProtKB powering 3D vehicle thermodynamics
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Compound Selector Chips Bar */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 bg-slate-950/50 px-6 py-3">
          <span className="text-xs font-semibold text-slate-400 shrink-0">Biomolecules:</span>
          {BIO_COMPOUNDS.map((c) => (
            <button
              key={c.cid}
              type="button"
              onClick={() => setSelected(c)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0 ${
                selected.cid === c.cid
                  ? 'border border-cyan-500 bg-cyan-950 text-cyan-200 shadow-sm'
                  : 'border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
              }`}
            >
              <span>{c.name.split(' ')[0]}</span>
              {selected.cid === c.cid && <Sparkles className="h-3 w-3 text-cyan-400" />}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto p-6">
          {/* Left Column: 2D Chemical Structure & Provenance */}
          <div className="md:col-span-5 flex flex-col gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex flex-col items-center">
              <div className="relative flex h-52 w-full items-center justify-center rounded-lg border border-slate-800/80 bg-white p-2">
                {loadingPubChem ? (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                    <span className="text-xs">Fetching PubChem PUG Structure...</span>
                  </div>
                ) : (
                  <img
                    src={pubchemData?.imageUrl || `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${selected.cid}/PNG?image_size=300x300`}
                    alt={selected.name}
                    className="max-h-full max-w-full object-contain"
                  />
                )}

                {/* Provenance Badge */}
                <div className="absolute top-2 left-2 rounded bg-slate-900/90 px-2 py-0.5 text-[10px] font-mono font-medium text-cyan-300 border border-slate-700">
                  PubChem CID: {selected.cid}
                </div>
              </div>

              {/* Chemical Monospace Properties */}
              <div className="mt-3 w-full space-y-1.5 text-xs">
                <div className="flex justify-between border-b border-slate-800 py-1">
                  <span className="text-slate-400">Formula</span>
                  <span className="font-mono font-bold text-slate-200">
                    {pubchemData?.molecularFormula || selected.formula}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800 py-1">
                  <span className="text-slate-400">Molecular Weight</span>
                  <span className="font-mono font-bold text-slate-200">
                    {pubchemData?.molecularWeight || selected.molecularWeight} g/mol
                  </span>
                </div>
                {selected.uniprotTarget && (
                  <div className="flex justify-between border-b border-slate-800 py-1">
                    <span className="text-slate-400">Biological Target</span>
                    <span className="font-mono text-cyan-400 text-right truncate max-w-[180px]">
                      {selected.uniprotTarget}
                    </span>
                  </div>
                )}
              </div>

              {/* Authoritative Outbound Links */}
              <div className="mt-4 flex w-full gap-2">
                <a
                  href={selected.pubchemUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-slate-700 hover:text-cyan-200 transition-colors"
                >
                  <span>PubChem Record</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                {selected.uniprotAccession && (
                  <a
                    href={`https://www.uniprot.org/uniprotkb/${selected.uniprotAccession}/entry`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-slate-700 hover:text-emerald-200 transition-colors"
                  >
                    <span>UniProtKB</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Biochemical Mechanism & Racing Buffs */}
          <div className="md:col-span-7 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              {/* Title & Category */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-cyan-900/40 border border-cyan-700/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                    {selected.category} Catalyst
                  </span>
                  <span className="rounded bg-emerald-900/40 border border-emerald-700/60 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-300">
                    [Peer-Reviewed Biology]
                  </span>
                </div>
                <h3 className="mt-1 text-xl font-black text-white">{selected.name}</h3>
                <p className="mt-1 font-mono text-[11px] text-slate-400 line-clamp-2">
                  {pubchemData?.iupacName || selected.iupacName}
                </p>
              </div>

              {/* Biological Role */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-1.5">
                  <BookOpen className="h-4 w-4 text-cyan-400" />
                  <span>Physiological & Biochemical Mechanism</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">
                  {selected.biologicalRole}
                </p>
              </div>

              {/* Vehicle Performance Multipliers */}
              <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/30 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 mb-2">
                  <Zap className="h-4 w-4 text-cyan-400" />
                  <span>Active Vehicle Performance Modifiers</span>
                </div>
                <p className="text-xs font-semibold text-emerald-400 mb-3">
                  {selected.racingBuffDescription}
                </p>

                {/* Metric Bars */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Acceleration:</span>
                      <span className="font-mono text-cyan-300 font-bold">
                        +{selected.statBoosts.accelBonus}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-cyan-400"
                        style={{ width: `${Math.min(100, selected.statBoosts.accelBonus * 3)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Top Speed:</span>
                      <span className="font-mono text-cyan-300 font-bold">
                        +{selected.statBoosts.topSpeedBonus}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-cyan-400"
                        style={{ width: `${Math.min(100, selected.statBoosts.topSpeedBonus * 4)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Reflex Steering:</span>
                      <span className="font-mono text-cyan-300 font-bold">
                        {selected.statBoosts.handlingBonus >= 0 ? '+' : ''}{selected.statBoosts.handlingBonus}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-400"
                        style={{ width: `${Math.max(10, Math.min(100, 50 + selected.statBoosts.handlingBonus * 2))}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Adrenaline Yield:</span>
                      <span className="font-mono text-amber-400 font-bold">
                        +{selected.statBoosts.adrenalineGainBonus}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${Math.min(100, selected.statBoosts.adrenalineGainBonus * 2)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Zero latency biological injector</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  onSelectCompound(selected);
                  onClose();
                }}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all shadow-lg ${
                  activeCompound.cid === selected.cid
                    ? 'bg-slate-800 text-slate-300 cursor-default'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500'
                }`}
              >
                {activeCompound.cid === selected.cid ? (
                  <span>Currently Equipped</span>
                ) : (
                  <span>Equip {selected.name.split(' ')[0]} to Chassis</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
