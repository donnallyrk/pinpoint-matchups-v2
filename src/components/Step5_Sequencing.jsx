import React, { useState, useEffect, useMemo } from 'react';
import { 
  ListOrdered, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  LayoutGrid, 
  ArrowRightLeft,
  Play,
  Settings,
  Users,
  Filter,
  X,
  Search,
  Edit2,
  Save,
  RotateCcw
} from 'lucide-react';
import { Button } from '../utils';
import PageHeader from './PageHeader';

// ... (KEEP ALL HELPERS AND ALGORITHMS UNCHANGED) ...
// NOTE: I am omitting the helper functions here for brevity in the output block, 
// but they MUST remain in the file. I will assume they are present or pasted back in.
// FOR THE FULL FILE REWRITE, I WILL INCLUDE THEM TO BE SAFE.

// --- CONFIGURATION HELPER ---
const getSequencingConfig = (event) => {
    // 1. Merge sources to handle both Flat (root) and Nested (eventParameters) storage
    // We prioritize eventParameters because Step 3 explicitly saves there.
    const params = {
        ...event,
        ...(event.eventParameters || {})
    };

    console.log("Sequencing Config - Merged Params:", params);

    return {
        // Step 3 uses 'mats', we fallback to 'numMats' for safety
        matsAvailable: parseInt(params.mats || params.numMats || 3),
        // Step 3 uses 'minRest'
        minRest: parseInt(params.minRest || 1)
    };
};

// --- HELPER ALGORITHMS ---

/**
 * Re-numbers matches sequentially per mat (1-n) to ensure gaps/duplicates from manual editing are fixed.
 * Preserves relative order based on existing boutNumber.
 */
const renumberSchedule = (schedule) => {
    // 1. Group by Mat
    const matchesByMat = {};
    schedule.forEach(m => {
        if (!matchesByMat[m.matId]) matchesByMat[m.matId] = [];
        matchesByMat[m.matId].push(m);
    });

    // 2. Sort and re-assign within each mat
    const renumbered = [];
    Object.keys(matchesByMat).forEach(matId => {
        // Sort by current boutNumber to keep relative user intent
        matchesByMat[matId].sort((a, b) => a.boutNumber - b.boutNumber);
        
        // Re-assign 1-n
        matchesByMat[matId].forEach((m, index) => {
            renumbered.push({
                ...m,
                boutNumber: index + 1
            });
        });
    });

    return renumbered;
};

/**
 * Validates a schedule for rest violations.
 * Extracted from generateSchedule for reuse after manual edits.
 */
const validateSchedule = (schedule, minRest) => {
    const wrestlerLastTimeSlot = {}; // { wrestlerId: { timeSlot, matId } }
    const violations = {}; // { matchId: [reasons] }

    // We need to process in "Time" order (Global sequence)
    // We infer "Time" from boutNumber, assuming mats run in parallel.
    // Ideally we'd use a calculated 'timeSlot' but boutNumber is the primary editable field now.
    // Let's sort by Bout Number to simulate time progression.
    const sorted = [...schedule].sort((a, b) => a.boutNumber - b.boutNumber);

    sorted.forEach(match => {
        // We track history for both wrestlers
        [match.w1, match.w2].forEach(w => {
            const history = wrestlerLastTimeSlot[w.id];
            if (history) {
                // Calculate Gap based on bout numbers
                // Note: This is a simplification. Real time depends on bout duration.
                // But comparing bout numbers is the standard heuristic here.
                const gap = match.boutNumber - history.boutNumber;
                
                if (gap <= minRest) { // Gap must be > minRest
                    if (!violations[match.id]) violations[match.id] = [];
                    
                    const matInfo = history.matId !== match.matId 
                        ? `(Moved M${history.matId}->M${match.matId})` 
                        : '';
                        
                    violations[match.id].push(
                        `${w.firstName} ${w.lastName} (Gap ${gap})`
                    );
                }
            }
            // Update History
            wrestlerLastTimeSlot[w.id] = { boutNumber: match.boutNumber, matId: match.matId };
        });
    });

    return schedule.map(match => ({
        ...match,
        hasRestViolation: !!violations[match.id],
        restViolationReason: violations[match.id]?.join(', ') || null
    }));
};

/**
 * DYNAMIC PRIORITY SCHEDULER
 */
const generateSchedule = (matchups, config) => {
    const { matsAvailable, minRest } = config;

    // --- PHASE 1: MAT ASSIGNMENT (Binning) ---
    const getAge = (w) => w.age || 0;
    const getMaxAge = (m) => Math.max(getAge(m.w1), getAge(m.w2));
    
    // Sort all matches by Age (Oldest First)
    const byAge = [...matchups].sort((a, b) => getMaxAge(b) - getMaxAge(a));

    // Distribute into Pools for each Mat
    const totalMatches = byAge.length;
    const effectiveMats = Math.max(1, matsAvailable);
    const baseChunkSize = Math.floor(totalMatches / effectiveMats);
    const remainder = totalMatches % effectiveMats;

    const matPools = Array.from({ length: effectiveMats }, () => []);
    let startIndex = 0;

    for (let i = 0; i < effectiveMats; i++) {
        const size = baseChunkSize + (i < remainder ? 1 : 0);
        const chunk = byAge.slice(startIndex, startIndex + size);
        matPools[i] = chunk; 
        startIndex += size;
    }

    // --- PHASE 2: DYNAMIC SEQUENCING (Simulation) ---
    const wrestlerLoad = {};
    matchups.forEach(m => {
        wrestlerLoad[m.w1.id] = (wrestlerLoad[m.w1.id] || 0) + 1;
        wrestlerLoad[m.w2.id] = (wrestlerLoad[m.w2.id] || 0) + 1;
    });

    const finalSchedule = [];
    const wrestlerLastTimeSlot = {}; 
    let remainingCount = totalMatches;
    let currentBoutIndex = 1; 

    // Track sequential match numbers PER MAT
    const matBoutCounters = Array(effectiveMats).fill(1);
    const MAX_LOOPS = totalMatches * 2; 

    while (remainingCount > 0 && currentBoutIndex < MAX_LOOPS) {
        const busyInSlot = new Set();

        for (let matIdx = 0; matIdx < effectiveMats; matIdx++) {
            const pool = matPools[matIdx];
            if (pool.length === 0) continue; 

            let bestMatchIdx = -1;
            let bestScore = -Infinity;

            for (let i = 0; i < pool.length; i++) {
                const m = pool[i];
                if (busyInSlot.has(m.w1.id) || busyInSlot.has(m.w2.id)) continue;

                const last1 = wrestlerLastTimeSlot[m.w1.id] || -999;
                const last2 = wrestlerLastTimeSlot[m.w2.id] || -999;
                
                const gap1 = currentBoutIndex - last1;
                const gap2 = currentBoutIndex - last2;
                
                const isRested = gap1 > minRest && gap2 > minRest;
                const urgency = (wrestlerLoad[m.w1.id] || 0) + (wrestlerLoad[m.w2.id] || 0);

                let score = 0;
                if (isRested) {
                    score += 10000;
                    score += (urgency * 100);
                    score -= (m.w1.weight + m.w2.weight) * 0.01;
                } else {
                    score = -10000 + (gap1 + gap2);
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestMatchIdx = i;
                }
            }

            if (bestMatchIdx !== -1) {
                const match = pool[bestMatchIdx];
                pool.splice(bestMatchIdx, 1);
                
                match.matId = matIdx + 1;
                match.timeSlot = currentBoutIndex; 
                match.boutNumber = matBoutCounters[matIdx]; 
                matBoutCounters[matIdx]++; 

                // Check for violation (using direct logic here for initial gen)
                const last1 = wrestlerLastTimeSlot[match.w1.id];
                const last2 = wrestlerLastTimeSlot[match.w2.id];
                const gap1 = last1 ? currentBoutIndex - last1 : 999;
                const gap2 = last2 ? currentBoutIndex - last2 : 999;
                
                const violationDetails = [];
                if (gap1 <= minRest && last1) violationDetails.push(`${match.w1.firstName} ${match.w1.lastName} (Gap ${gap1})`);
                if (gap2 <= minRest && last2) violationDetails.push(`${match.w2.firstName} ${match.w2.lastName} (Gap ${gap2})`);
                
                match.hasRestViolation = violationDetails.length > 0;
                match.restViolationReason = violationDetails.length > 0 ? violationDetails.join(', ') : null;

                finalSchedule.push(match);
                wrestlerLastTimeSlot[match.w1.id] = currentBoutIndex;
                wrestlerLastTimeSlot[match.w2.id] = currentBoutIndex;
                wrestlerLoad[match.w1.id]--;
                wrestlerLoad[match.w2.id]--;
                busyInSlot.add(match.w1.id);
                busyInSlot.add(match.w2.id);
                
                remainingCount--;
            }
        }
        currentBoutIndex++;
    }

    return finalSchedule;
};

// --- REST ISSUES MODAL (Updated) ---
const RestIssuesModal = ({ violations, allMatches, onClose }) => {
    // Get unique wrestler IDs involved in violations
    const affectedWrestlerIds = useMemo(() => {
        const ids = new Set();
        violations.forEach(v => {
            // Parse reasons to find who failed? Or just add both?
            // Safer to just check string match or assume logic
            // Let's scan all matches for these wrestlers
            ids.add(v.w1.id);
            ids.add(v.w2.id);
        });
        return Array.from(ids);
    }, [violations]);

    // Filter schedule for ONLY these wrestlers' matches to show context
    const contextMatches = useMemo(() => {
        return allMatches.filter(m => 
            affectedWrestlerIds.includes(m.w1.id) || 
            affectedWrestlerIds.includes(m.w2.id)
        ).sort((a, b) => a.boutNumber - b.boutNumber); // Sort by global time roughly
    }, [allMatches, affectedWrestlerIds]);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-red-500/50 rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-red-950/20 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="text-red-500" size={20} />
                        <div>
                            <h3 className="text-lg font-bold text-white">Rest Requirement Issues</h3>
                            <p className="text-xs text-red-300">Showing full schedule for affected wrestlers to help diagnosis.</p>
                        </div>
                    </div>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white" /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-0">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-800 text-slate-400 uppercase font-bold text-xs sticky top-0">
                            <tr>
                                <th className="px-4 py-3 text-center">Mat</th>
                                <th className="px-4 py-3 text-center">Match</th>
                                <th className="px-4 py-3">Wrestler 1</th>
                                <th className="px-4 py-3">Wrestler 2</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {contextMatches.map((m, idx) => {
                                const isViolation = m.hasRestViolation;
                                return (
                                    <tr key={m.id} className={isViolation ? "bg-red-900/10 hover:bg-red-900/20" : "hover:bg-slate-800/50"}>
                                        <td className="px-4 py-3 font-mono text-white text-center">{m.matId}</td>
                                        <td className="px-4 py-3 font-mono text-center">{m.boutNumber}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-white">{m.w1.firstName} {m.w1.lastName}</div>
                                            <div className="text-xs text-slate-500">{m.w1.teamAbbr}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-white">{m.w2.firstName} {m.w2.lastName}</div>
                                            <div className="text-xs text-slate-500">{m.w2.teamAbbr}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {isViolation ? (
                                                <span className="text-red-400 text-xs font-bold">{m.restViolationReason}</span>
                                            ) : (
                                                <span className="text-slate-600 text-xs">OK</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                
                <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

// --- EDITABLE CELL ---
const EditableCell = ({ value, onChange, type="text", className="" }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    // Sync if external value changes
    useEffect(() => { setTempValue(value); }, [value]);

    const handleCommit = () => {
        setIsEditing(false);
        if (tempValue !== value) {
            onChange(tempValue);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleCommit();
        if (e.key === 'Escape') {
            setTempValue(value);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <input 
                type={type}
                autoFocus
                className={`w-16 bg-blue-900/50 text-white font-bold text-center border border-blue-500 rounded outline-none p-1 ${className}`}
                value={tempValue}
                onChange={e => setTempValue(e.target.value)}
                onBlur={handleCommit}
                onKeyDown={handleKeyDown}
            />
        );
    }

    return (
        <div 
            onClick={() => setIsEditing(true)} 
            className={`cursor-pointer hover:bg-slate-700/50 rounded px-2 py-1 transition-colors flex items-center justify-center gap-1 group ${className}`}
        >
            {value}
            <Edit2 size={10} className="text-slate-600 opacity-0 group-hover:opacity-100" />
        </div>
    );
};

// --- MAIN COMPONENT ---

const Step5_Sequencing = ({ event, onUpdate }) => {
    const config = useMemo(() => getSequencingConfig(event), [event]);
    
    const [schedule, setSchedule] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // View & Filter State
    const [viewMode, setViewMode] = useState('by_mat'); 
    const [filterMat, setFilterMat] = useState('All');
    const [filterTeam, setFilterTeam] = useState('All');
    const [wrestlerSearch, setWrestlerSearch] = useState('');
    
    // Modal State
    const [showIssuesModal, setShowIssuesModal] = useState(false);

    // Load
    useEffect(() => {
        if (event.sequencing) {
            setSchedule(event.sequencing);
        }
    }, [event.sequencing]);

    // Handlers
    const handleGenerate = () => {
        if (!event.matchups || event.matchups.length === 0) {
            alert("No matchups found. Please complete Step 4 first.");
            return;
        }
        setIsGenerating(true);
        setTimeout(() => {
            const newSchedule = generateSchedule(event.matchups, config);
            setSchedule(newSchedule);
            onUpdate(event.id, { sequencing: newSchedule, schedulingStatus: 'complete' });
            setIsGenerating(false);
        }, 600);
    };

    const handleClear = () => {
        if (confirm("Clear the current schedule sequence?")) {
            setSchedule(null);
            onUpdate(event.id, { sequencing: null, schedulingStatus: 'in_progress' });
        }
    };

    // MANUAL EDIT HANDLER
    const handleScheduleChange = (matchId, field, newValue) => {
        if (!schedule) return;

        // 1. Create deep copy & update value
        let newSchedule = schedule.map(m => {
            if (m.id === matchId) {
                return { ...m, [field]: parseInt(newValue) || 0 };
            }
            return m;
        });

        // 2. Re-number to ensure 1-n integrity per mat
        // This fixes duplicates or gaps caused by manual edits
        newSchedule = renumberSchedule(newSchedule);

        // 3. Re-validate entire schedule for rest issues
        const validatedSchedule = validateSchedule(newSchedule, config.minRest);
        
        setSchedule(validatedSchedule);
        // Persist
        onUpdate(event.id, { sequencing: validatedSchedule });
    };

    // --- VIEW DATA PREPARATION ---

    // 1. By Mat Data
    const matViewData = useMemo(() => {
        if (!schedule) return [];
        let data = [...schedule];
        
        if (filterMat !== 'All') {
            data = data.filter(m => m.matId === parseInt(filterMat));
        }

        return data.sort((a,b) => {
            if (a.matId !== b.matId) return a.matId - b.matId;
            return a.boutNumber - b.boutNumber;
        });
    }, [schedule, filterMat]);

    // 2. By Team Data (Exploded)
    const teamViewData = useMemo(() => {
        if (!schedule) return [];
        
        const rows = [];
        schedule.forEach(m => {
            rows.push({
                uniqueId: `${m.id}-w1`,
                team: m.w1.teamName,
                teamAbbr: m.w1.teamAbbr,
                wrestlerName: `${m.w1.firstName} ${m.w1.lastName}`,
                matId: m.matId,
                boutNumber: m.boutNumber
            });
            rows.push({
                uniqueId: `${m.id}-w2`,
                team: m.w2.teamName,
                teamAbbr: m.w2.teamAbbr,
                wrestlerName: `${m.w2.firstName} ${m.w2.lastName}`,
                matId: m.matId,
                boutNumber: m.boutNumber
            });
        });

        let filtered = rows;
        if (filterTeam !== 'All') filtered = filtered.filter(r => r.team === filterTeam || r.teamAbbr === filterTeam);
        if (wrestlerSearch) filtered = filtered.filter(r => r.wrestlerName.toLowerCase().includes(wrestlerSearch.toLowerCase()));

        return filtered.sort((a,b) => a.wrestlerName.localeCompare(b.wrestlerName));
    }, [schedule, filterTeam, wrestlerSearch]);

    const teams = useMemo(() => {
       if (!event.participatingTeams) return [];
       return event.participatingTeams.map(t => t.name).sort();
    }, [event.participatingTeams]);

    const violations = useMemo(() => schedule ? schedule.filter(m => m.hasRestViolation) : [], [schedule]);
    const violationCount = violations.length;

    const matStats = useMemo(() => {
        if (!schedule) return [];
        const stats = Array(config.matsAvailable).fill(0);
        schedule.forEach(m => {
            if (m.matId >= 1 && m.matId <= config.matsAvailable) {
                stats[m.matId - 1]++;
            }
        });
        return stats;
    }, [schedule, config.matsAvailable]);

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 h-full flex flex-col">
            
            {showIssuesModal && (
                <RestIssuesModal violations={violations} allMatches={schedule} onClose={() => setShowIssuesModal(false)} />
            )}

            {/* Standard Page Header */}
            <PageHeader 
                title="Schedule Sequencer" 
                description="Distribute bouts across mats and check rest gaps."
                actions={
                    <div className="flex items-center gap-3">
                        {schedule ? (
                            <Button variant="ghost" onClick={handleClear} className="text-red-400 hover:bg-red-950/30">Clear</Button>
                        ) : (
                            <Button onClick={handleGenerate} disabled={isGenerating} className="shadow-lg shadow-blue-900/20">
                                {isGenerating ? 'Calculating...' : 'Generate Schedule'} <Play size={16} className="ml-2 fill-current"/>
                            </Button>
                        )}
                        
                        {schedule && (
                            <Button onClick={handleGenerate} variant="secondary" className="border-slate-600">
                                Re-Run <ArrowRightLeft size={16} className="ml-2"/>
                            </Button>
                        )}
                    </div>
                }
            />

            {/* Core Content Container */}
            <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl p-6 min-h-0 flex flex-col">
                
                {/* TOOLBAR */}
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex flex-wrap items-center justify-between gap-4 mb-4 shrink-0">
                    
                    {/* LEFT: View Toggles & Filters */}
                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                            <button 
                                onClick={() => setViewMode('by_mat')}
                                className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-colors ${viewMode === 'by_mat' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                <LayoutGrid size={14}/> By Mat
                            </button>
                            <button 
                                onClick={() => setViewMode('by_team')}
                                className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-colors ${viewMode === 'by_team' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                <Users size={14}/> By Team
                            </button>
                        </div>

                        {schedule && (
                            <>
                                {viewMode === 'by_mat' ? (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
                                        <Filter size={14} className="text-slate-400" />
                                        <select 
                                            value={filterMat} 
                                            onChange={(e) => setFilterMat(e.target.value)}
                                            className="bg-transparent text-xs font-bold text-white outline-none"
                                        >
                                            <option value="All">All Mats</option>
                                            {Array.from({length: config.matsAvailable}, (_, i) => i + 1).map(num => (
                                                <option key={num} value={num}>Mat {num}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
                                            <Filter size={14} className="text-slate-400" />
                                            <select 
                                                value={filterTeam} 
                                                onChange={(e) => setFilterTeam(e.target.value)}
                                                className="bg-transparent text-xs font-bold text-white outline-none max-w-[150px]"
                                            >
                                                <option value="All">All Teams</option>
                                                {teams.map(t => (<option key={t} value={t}>{t}</option>))}
                                            </select>
                                        </div>
                                        <div className="relative">
                                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                            <input 
                                                type="text" 
                                                placeholder="Search wrestler..." 
                                                value={wrestlerSearch}
                                                onChange={(e) => setWrestlerSearch(e.target.value)}
                                                className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-blue-500 w-48"
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* RIGHT: Stats */}
                    {schedule && (
                        <div className="flex items-center gap-4">
                            <div className="flex gap-1 items-center">
                                {matStats.map((count, idx) => (
                                    <div key={idx} className="flex flex-col items-center justify-center w-8 bg-slate-800 rounded border border-slate-700 py-1" title={`Mat ${idx + 1}: ${count} matches`}>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase">M{idx + 1}</span>
                                        <span className={`text-[10px] font-bold ${count === 0 ? 'text-slate-600' : 'text-blue-200'}`}>{count}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="h-8 w-px bg-slate-800" />
                            <div 
                                onClick={() => violationCount > 0 && setShowIssuesModal(true)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all hover:brightness-110 ${violationCount > 0 ? 'bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/30' : 'bg-green-900/20 text-green-400 border-green-900/50'}`}
                            >
                                {violationCount > 0 ? <AlertTriangle size={14}/> : <CheckCircle2 size={14}/>}
                                {violationCount > 0 ? `${violationCount} Rest Issues` : 'Valid'}
                            </div>
                        </div>
                    )}
                </div>

                {/* MAIN TABLE AREA - Separate Container */}
                <div className="flex-1 min-h-0 bg-slate-900 border border-slate-700 rounded-xl relative overflow-hidden flex flex-col">
                    {!schedule ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900/30">
                            <ListOrdered size={48} className="opacity-20 mb-4" />
                            <h3 className="text-lg font-bold text-slate-300">No Schedule Generated</h3>
                            <p className="text-sm">Click Generate to sequence bouts across {config.matsAvailable} mats.</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-slate-800 text-slate-400 uppercase font-bold text-xs sticky top-0 z-10 shadow-sm">
                                    {viewMode === 'by_mat' ? (
                                        <tr>
                                            <th className="px-4 py-3 border-r border-slate-700">Team (1)</th>
                                            <th className="px-4 py-3 border-r border-slate-700">Wrestler (1)</th>
                                            <th className="px-4 py-3 w-20 text-center">Mat</th>
                                            <th className="px-4 py-3 w-20 text-center border-r border-slate-700">Match</th>
                                            <th className="px-4 py-3 border-r border-slate-700">Wrestler (2)</th>
                                            <th className="px-4 py-3">Team (2)</th>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <th className="px-4 py-3">Team</th>
                                            <th className="px-4 py-3">Wrestler</th>
                                            <th className="px-4 py-3 text-center">Mat</th>
                                            <th className="px-4 py-3 text-center">Match</th>
                                        </tr>
                                    )}
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {viewMode === 'by_mat' ? (
                                        matViewData.map(m => (
                                            <tr key={m.id} className={`hover:bg-slate-800/50 ${m.hasRestViolation ? 'bg-red-900/10' : ''}`}>
                                                <td className="px-4 py-2 text-xs text-slate-400 border-r border-slate-800">{m.w1.teamAbbr}</td>
                                                <td className={`px-4 py-2 border-r border-slate-800 font-medium ${m.hasRestViolation && m.restViolationReason.includes(m.w1.lastName) ? 'text-red-400' : 'text-white'}`}>
                                                    {m.w1.firstName} {m.w1.lastName}
                                                </td>
                                                
                                                {/* EDITABLE MAT CELL */}
                                                <td className="px-2 py-2 text-center bg-slate-800/30">
                                                    <EditableCell 
                                                        value={m.matId} 
                                                        type="number"
                                                        onChange={(val) => handleScheduleChange(m.id, 'matId', val)} 
                                                        className="font-mono text-white font-bold"
                                                    />
                                                </td>
                                                
                                                {/* EDITABLE MATCH CELL */}
                                                <td className="px-2 py-2 text-center border-r border-slate-800">
                                                    <EditableCell 
                                                        value={m.boutNumber} 
                                                        type="number"
                                                        onChange={(val) => handleScheduleChange(m.id, 'boutNumber', val)} 
                                                        className="font-mono text-slate-300"
                                                    />
                                                </td>

                                                <td className={`px-4 py-2 border-r border-slate-800 font-medium ${m.hasRestViolation && m.restViolationReason.includes(m.w2.lastName) ? 'text-red-400' : 'text-white'}`}>
                                                    {m.w2.firstName} {m.w2.lastName}
                                                </td>
                                                <td className="px-4 py-2 text-xs text-slate-400">{m.w2.teamAbbr}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        teamViewData.map(row => (
                                            <tr key={row.uniqueId} className="hover:bg-slate-800/50">
                                                <td className="px-4 py-2 font-medium text-slate-400">{row.team}</td>
                                                <td className="px-4 py-2 font-bold text-white">{row.wrestlerName}</td>
                                                <td className="px-4 py-2 font-mono text-center">{row.matId}</td>
                                                <td className="px-4 py-2 font-mono text-center">{row.boutNumber}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Step5_Sequencing;