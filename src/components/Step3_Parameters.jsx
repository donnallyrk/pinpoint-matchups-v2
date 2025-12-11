import React, { useState } from 'react';
import { 
  Settings, 
  Clock, 
  LayoutGrid, 
  ShieldAlert,
  Users,
  Scale,
  Zap,
  Swords,
  Info,
  Minus, // Added
  Plus   // Added
} from 'lucide-react';
import { Card } from '../utils';
import PageHeader from './PageHeader';

// --- SUB-COMPONENTS FOR CONTROLS ---

const Tooltip = ({ text }) => {
  if (!text) return null;
  return (
    <div className="group relative ml-2">
      <Info size={14} className="text-slate-500 hover:text-blue-400 cursor-help transition-colors" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 border border-slate-700 rounded-lg text-[10px] text-slate-300 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-700" />
      </div>
    </div>
  );
};

const NumberControl = ({ label, value, onChange, min, max, step = 1, unit = '', tooltip }) => {
  const handleStep = (direction) => {
    const delta = direction === 'up' ? step : -step;
    const nextVal = value + delta;
    
    // Clamp and fix floating point precision
    if (nextVal >= min && nextVal <= max) {
      // Handle decimals nicely (e.g. 3 + 0.5 = 3.5, not 3.500000000004)
      onChange(Math.round(nextVal * 100) / 100);
    }
  };

  return (
    <div className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
      <div className="flex items-center">
          <span className="text-sm text-slate-300 font-medium whitespace-nowrap">{label}</span>
          <Tooltip text={tooltip} />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {/* Decrement Button */}
        <button 
          onClick={() => handleStep('down')}
          disabled={value <= min}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Minus size={14} />
        </button>

        <input 
          type="range" 
          min={min} 
          max={max} 
          step={step}
          value={value} 
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-20 accent-blue-500 cursor-pointer"
        />

        {/* Increment Button */}
        <button 
          onClick={() => handleStep('up')}
          disabled={value >= max}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={14} />
        </button>

        {/* Display */}
        <div className="w-16 text-right font-mono text-white font-bold bg-slate-800 px-2 py-1 rounded whitespace-nowrap text-sm">
          {value}{unit}
        </div>
      </div>
    </div>
  );
};

const ToggleControl = ({ label, description, checked, onChange, tooltip }) => (
  <div className="flex justify-between items-start bg-slate-950 p-3 rounded-lg border border-slate-800 cursor-pointer" onClick={() => onChange(!checked)}>
    <div>
      <div className="flex items-center">
          <div className="text-sm text-slate-300 font-medium whitespace-nowrap">{label}</div>
          <Tooltip text={tooltip} />
      </div>
      {description && <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">{description}</div>}
    </div>
    <div className={`w-10 h-5 rounded-full relative transition-colors duration-200 mt-1 shrink-0 ${checked ? 'bg-blue-600' : 'bg-slate-700'}`}>
      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200 ${checked ? 'left-6' : 'left-1'}`} />
    </div>
  </div>
);

const SelectControl = ({ label, value, onChange, options, tooltip }) => (
  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
    <div className="flex items-center mb-2">
        <div className="text-sm text-slate-300 font-medium whitespace-nowrap">{label}</div>
        <Tooltip text={tooltip} />
    </div>
    <div className="flex bg-slate-900 rounded-lg p-1">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
            value === opt.value 
            ? 'bg-blue-600 text-white shadow' 
            : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

const Step3_Parameters = ({ event, onUpdate }) => {
  
  const updateEventParams = (key, value) => {
    const currentParams = event.eventParameters || {
        mats: 4,
        durationHours: 3.0,
        maxMatches: 3,
        minRest: 4,
        matchCycle: 5 // Default to 5 min
    };
    onUpdate(event.id, { 
        eventParameters: { ...currentParams, [key]: value } 
    });
  };

  const updateMatchRules = (key, value) => {
    const currentRules = event.matchRules || {
        intraTeam: 'no',
        mixedGender: 'yes',
        ageMode: 'age', 
        ageTolerance: 1.0,
        weightTolerance: 10,
        ratingTolerance: 1.0,
        lowRatingPairing: false
    };
    onUpdate(event.id, { 
        matchRules: { ...currentRules, [key]: value } 
    });
  };

  // Defaults
  const params = event.eventParameters || { mats: 4, durationHours: 3.0, maxMatches: 3, minRest: 4, matchCycle: 5 };
  const rules = event.matchRules || { 
      intraTeam: 'no', 
      mixedGender: 'yes', 
      ageMode: 'age',
      ageTolerance: 1.0,
      weightTolerance: 10, 
      ratingTolerance: 1.0, 
      lowRatingPairing: false 
  };

  // MATCH CYCLE CONSTANT (5 Minutes)
  // Logic: 60 mins / 5 min cycle = 12 matches per hour per mat
  const MATCHES_PER_HOUR_PER_MAT = 12;
  
  // Calculate Capacity Range
  const baseCapacity = Math.round(MATCHES_PER_HOUR_PER_MAT * params.mats * params.durationHours);
  const maxCapacity = Math.ceil(baseCapacity * 1.10); // +10% buffer

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 h-full flex flex-col">
      
      {/* Standard Page Header */}
      <PageHeader 
        title="Event Parameters" 
        description="Configure matchmaking rules and logistics." 
      />

      {/* Core Content Container */}
      <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl p-6 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* --- LEFT COLUMN: EVENT LOGISTICS --- */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-700 pb-4">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <LayoutGrid size={20} className="text-blue-400"/>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">Event Logistics</h3>
                        <p className="text-xs text-slate-400">Resource and timing constraints</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <NumberControl 
                        label="Available Mats" 
                        value={params.mats} 
                        min={1} max={10} 
                        onChange={v => updateEventParams('mats', v)}
                        tooltip="Number of mats available for concurrent matches."
                    />
                    <NumberControl 
                        label="Event Duration" 
                        value={params.durationHours} 
                        min={1} max={12} step={0.5} unit=" hrs"
                        onChange={v => updateEventParams('durationHours', v)}
                        tooltip="Used to estimate total match capacity (matches/hour * mats * duration)."
                    />
                    <NumberControl 
                        label="Max Matches / Wrestler" 
                        value={params.maxMatches} 
                        min={1} max={6} 
                        onChange={v => updateEventParams('maxMatches', v)}
                        tooltip="Maximum number of matches a single wrestler can be scheduled for."
                    />
                    <NumberControl 
                        label="Min Rest (Matches)" 
                        value={params.minRest} 
                        min={0} max={10} 
                        onChange={v => updateEventParams('minRest', v)}
                        tooltip="Minimum number of matches a wrestler must sit out between bouts."
                    />
                </div>

                <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-900/30">
                    <div className="flex justify-between text-xs text-blue-200 mb-1">
                        <span>Estimated Capacity:</span>
                        {/* UPDATED CALCULATION: Range from Base to Base+10% */}
                        <span className="font-bold">~{baseCapacity} - {maxCapacity} Matches</span>
                    </div>
                    <p className="text-[10px] text-blue-400/60">
                        Based on avg. 5 mins/match cycle (12 matches/hr/mat) with a 10% buffer.
                    </p>
                </div>
            </div>

            {/* --- RIGHT COLUMN: MATCH RULES --- */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-700 pb-4">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                        <Scale size={20} className="text-orange-400"/>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">Match Rules</h3>
                        <p className="text-xs text-slate-400">Criteria for valid pairings</p>
                    </div>
                </div>

                <div className="space-y-4">
                    
                    {/* Pairing Strategy */}
                    <SelectControl 
                        label="Age Pairing Mode"
                        value={rules.ageMode}
                        options={[
                            { value: 'division', label: 'Strict Division' },
                            { value: 'age', label: 'Age Tolerance' }
                        ]}
                        onChange={v => updateMatchRules('ageMode', v)}
                        tooltip="Choose to match strictly by Division name or by Date of Birth proximity."
                    />

                    {rules.ageMode === 'age' && (
                        <NumberControl 
                            label="Max Age Gap" 
                            value={rules.ageTolerance} 
                            min={0} max={5} step={0.5} unit=" yrs"
                            onChange={v => updateMatchRules('ageTolerance', v)}
                            tooltip="Maximum allowed age difference between opponents."
                        />
                    )}

                    <NumberControl 
                        label="Weight Tolerance" 
                        value={rules.weightTolerance} 
                        min={5} max={20} step={1} unit="%"
                        onChange={v => updateMatchRules('weightTolerance', v)}
                        tooltip="Max % difference: (Heavier - Lighter) / Lighter."
                    />

                    <NumberControl 
                        label="Rating Tolerance" 
                        value={rules.ratingTolerance} 
                        min={0} max={3} step={0.5}
                        onChange={v => updateMatchRules('ratingTolerance', v)}
                        tooltip="Maximum difference in wrestler rating (skill level)."
                    />

                    {/* Toggles */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <ToggleControl 
                            label="Mixed Gender"
                            description="Allow Boys vs Girls"
                            checked={rules.mixedGender === 'yes'}
                            onChange={v => updateMatchRules('mixedGender', v ? 'yes' : 'no')}
                            tooltip="If enabled, matches can be created between different genders."
                        />
                        <ToggleControl 
                            label="Intra-Team"
                            description="Teammates can match"
                            checked={rules.intraTeam === 'yes'}
                            onChange={v => updateMatchRules('intraTeam', v ? 'yes' : 'no')}
                            tooltip="If enabled, matches can be created between wrestlers from the same team."
                        />
                    </div>

                    {/* Low Rating Shield */}
                    <div 
                        onClick={() => updateMatchRules('lowRatingPairing', !rules.lowRatingPairing)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                            rules.lowRatingPairing 
                            ? 'bg-emerald-500/10 border-emerald-500/50' 
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`p-1.5 rounded-full shrink-0 ${rules.lowRatingPairing ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                <ShieldAlert size={14} />
                            </div>
                            <div>
                                <div className={`text-sm font-bold flex items-center gap-2 ${rules.lowRatingPairing ? 'text-emerald-400' : 'text-slate-300'}`}>
                                    Beginner Shield (Rating 0)
                                    <Tooltip text="Forces wrestlers with Rating 0 to ONLY match with other Rating 0 wrestlers, ignoring other tolerances." />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 leading-tight max-w-[200px]">
                                    Only match rating "0" with other "0"s.
                                </p>
                            </div>
                        </div>
                        
                        {/* Explicit Status Indicator */}
                        <div className={`text-xs font-bold px-2 py-1 rounded border ${
                            rules.lowRatingPairing 
                            ? 'bg-emerald-500 text-white border-emerald-400' 
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}>
                            {rules.lowRatingPairing ? 'ON' : 'OFF'}
                        </div>
                    </div>

                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Step3_Parameters;