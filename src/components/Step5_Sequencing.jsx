import React, { useState, useMemo, useEffect } from 'react';
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
  RotateCcw,
  Move,
  Info,
  Trash2
} from 'lucide-react';
import { Button } from '../utils';
import PageHeader from './PageHeader';

// --- HELPERS ---

// Generate a color based on team ID to visually distinguish matches
const getTeamColor = (teamName) => {
    const colors = [
        'border-l-blue-500', 'border-l-red-500', 'border-l-green-500', 
        'border-l-yellow-500', 'border-l-purple-500', 'border-l-pink-500',
        'border-l-indigo-500', 'border-l-orange-500'
    ];
    let hash = 0;
    for (let i = 0; i < teamName.length; i++) {
        hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const getMatchQuality = (score) => {
    const percentage = Math.min(100, Math.max(0, (score / 50) * 100));
    return percentage.toFixed(0);
};

// --- CONFIGURATION HELPER ---
const getSequencingConfig = (event) => {
    const params = { ...event, ...(event.eventParameters || {}) };
    return {
        matsAvailable: parseInt(params.mats || params.numMats || 3),
        minRest: parseInt(params.minRest || 1)
    };
};

// --- HELPER ALGORITHMS ---

/**
 * Re-numbers matches sequentially per mat (1-n) to ensure gaps/duplicates are fixed.
 * Preserves relative order based on existing boutNumber.
 */
const renumberSchedule = (schedule) => {
    const matchesByMat = {};
    schedule.forEach(m => {
        if (!matchesByMat[m.matId]) matchesByMat[m.matId] = [];
        matchesByMat[m.matId].push(m);
    });

    const renumbered = [];
    Object.keys(matchesByMat).forEach(matId => {
        matchesByMat[matId].sort((a, b) => a.boutNumber - b.boutNumber);
        matchesByMat[matId].forEach((m, index) => {
            renumbered.push({ ...m, boutNumber: index + 1 });
        });
    });
    return renumbered;
};

const validateSchedule = (schedule, minRest) => {
    const wrestlerLastTimeSlot = {}; 
    const violations = {}; 

    const sorted = [...schedule].sort((a, b) => a.boutNumber - b.boutNumber);

    sorted.forEach(match => {
        [match.w1, match.w2].forEach(w => {
            const history = wrestlerLastTimeSlot[w.id];
            if (history) {
                const gap = match.boutNumber - history.boutNumber - 1; // Gap is matches BETWEEN
                if (gap < minRest) { 
                    if (!violations[match.id]) violations[match.id] = [];
                    violations[match.id].push(`${w.firstName} ${w.lastName} (Gap ${gap})`);
                }
            }
            wrestlerLastTimeSlot[w.id] = { boutNumber: match.boutNumber, matId: match.matId };
        });
    });

    return schedule.map(match => ({
        ...match,
        hasRestViolation: !!violations[match.id],
        restViolationReason: violations[match.id]?.join(', ') || null
    }));
};

const generateSchedule = (matchups, config) => {
    const { matsAvailable, minRest } = config;
    const getAge = (w) => w.age || 0;
    const getMaxAge = (m) => Math.max(getAge(m.w1), getAge(m.w2));
    const byAge = [...matchups].sort((a, b) => getMaxAge(b) - getMaxAge(a));

    const effectiveMats = Math.max(1, matsAvailable);
    const baseChunkSize = Math.floor(byAge.length / effectiveMats);
    const remainder = byAge.length % effectiveMats;

    const matPools = Array.from({ length: effectiveMats }, () => []);
    let startIndex = 0;

    for (let i = 0; i < effectiveMats; i++) {
        const size = baseChunkSize + (i < remainder ? 1 : 0);
        const chunk = byAge.slice(startIndex, startIndex + size);
        matPools[i] = chunk; 
        startIndex += size;
    }

    const wrestlerLoad = {};
    matchups.forEach(m => {
        wrestlerLoad[m.w1.id] = (wrestlerLoad[m.w1.id] || 0) + 1;
        wrestlerLoad[m.w2.id] = (wrestlerLoad[m.w2.id] || 0) + 1;
    });

    const finalSchedule = [];
    const wrestlerLastTimeSlot = {}; 
    let remainingCount = byAge.length;
    let currentBoutIndex = 1; 
    const matBoutCounters = Array(effectiveMats).fill(1);
    const MAX_LOOPS = byAge.length * 2; 

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

    return validateSchedule(finalSchedule, minRest);
};

// --- SUB-COMPONENTS ---

const MoveMatchModal = ({ match, maxMatches, mats, onClose, onMove }) => {
    const [targetMat, setTargetMat] = useState(match.matId);
    const [targetMatchNum, setTargetMatchNum] = useState(match.boutNumber);

    const handleConfirm = () => {
        onMove(match.id, parseInt(targetMat), parseInt(targetMatchNum));
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[120] p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Move size={18} className="text-blue-400"/> Move Match
                    </h3>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="bg-slate-950 p-3 rounded border border-slate-800 mb-4">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Current Position</div>
                        <div className="text-white font-mono">Mat {match.matId} &bull; Match {match.boutNumber}</div>
                        <div className="text-xs text-slate-400 mt-1">{match.w1.firstName} {match.w1.lastName} vs {match.w2.firstName} {match.w2.lastName}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">New Mat</label>
                            <select 
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500"
                                value={targetMat}
                                onChange={e => setTargetMat(e.target.value)}
                            >
                                {mats.map(m => <option key={m} value={m}>Mat {m}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">New Match #</label>
                            <input 
                                type="number"
                                min="1"
                                max={maxMatches + 5} 
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500"
                                value={targetMatchNum}
                                onChange={e => setTargetMatchNum(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="text-[10px] text-slate-500 text-center">
                        Matches will shift automatically to accommodate this move.
                    </div>
                </div>
                <div className="p-4 border-t border-slate-800 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleConfirm}>Confirm Move</Button>
                </div>
            </div>
        </div>
    );
};

const MatchDetailsModal = ({ match, onClose }) => {
    if (!match) return null;
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-800">
                    <h3 className="text-lg font-bold text-white">Match {match.boutNumber} Details</h3>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white" /></button>
                </div>
                <div className="p-6 space-y-6">
                    {/* Header: Score & Mat */}
                    <div className="flex justify-between items-center bg-slate-950 p-4 rounded-lg border border-slate-800">
                        <div className="text-center flex-1">
                            <div className="text-xs text-slate-500 uppercase font-bold">Match Quality</div>
                            <div className="text-2xl font-bold text-blue-400">{getMatchQuality(match.score)}%</div>
                        </div>
                        <div className="h-8 w-px bg-slate-800"></div>
                        <div className="text-center flex-1">
                            <div className="text-xs text-slate-500 uppercase font-bold">Mat Assignment</div>
                            <div className="text-xl font-bold text-white">Mat {match.matId} - Match {match.boutNumber}</div>
                        </div>
                    </div>

                    {/* Matchup Grid */}
                    <div className="grid grid-cols-2 gap-8 relative">
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-800 -translate-x-1/2"></div>
                        
                        {/* Red Corner */}
                        <div className="text-right space-y-2">
                            <div className="font-bold text-red-400 uppercase text-xs mb-2">Red Corner</div>
                            <div className="text-xl font-bold text-white">{match.w1.firstName} {match.w1.lastName}</div>
                            <div className="text-sm text-slate-400 font-medium">{match.w1.teamName}</div>
                            
                            <div className="space-y-1 mt-4 text-xs text-slate-500">
                                <div className="flex justify-end gap-2"><span>Age:</span> <span className="text-slate-300 font-mono">{match.w1.age}</span></div>
                                <div className="flex justify-end gap-2"><span>Weight:</span> <span className="text-slate-300 font-mono">{match.w1.weight}</span></div>
                                <div className="flex justify-end gap-2"><span>Rating:</span> <span className="text-slate-300 font-mono">{match.w1.rating}</span></div>
                                <div className="flex justify-end gap-2"><span>Division:</span> <span className="text-slate-300 font-mono">{match.w1.division || 'N/A'}</span></div>
                                <div className="flex justify-end gap-2"><span>Gender:</span> <span className="text-slate-300 font-mono">{match.w1.gender}</span></div>
                            </div>
                        </div>

                        {/* Green Corner */}
                        <div className="text-left space-y-2">
                            <div className="font-bold text-green-400 uppercase text-xs mb-2">Green Corner</div>
                            <div className="text-xl font-bold text-white">{match.w2.firstName} {match.w2.lastName}</div>
                            <div className="text-sm text-slate-400 font-medium">{match.w2.teamName}</div>

                            <div className="space-y-1 mt-4 text-xs text-slate-500">
                                <div className="flex justify-start gap-2"><span className="text-slate-300 font-mono">{match.w2.age}</span> <span>:Age</span></div>
                                <div className="flex justify-start gap-2"><span className="text-slate-300 font-mono">{match.w2.weight}</span> <span>:Weight</span></div>
                                <div className="flex justify-start gap-2"><span className="text-slate-300 font-mono">{match.w2.rating}</span> <span>:Rating</span></div>
                                <div className="flex justify-start gap-2"><span className="text-slate-300 font-mono">{match.w2.division || 'N/A'}</span> <span>:Division</span></div>
                                <div className="flex justify-start gap-2"><span className="text-slate-300 font-mono">{match.w2.gender}</span> <span>:Gender</span></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-800 flex justify-end">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

const RestIssuesModal = ({ violations, allMatches, onClose }) => {
    const affectedWrestlerIds = useMemo(() => {
        const ids = new Set();
        violations.forEach(v => { ids.add(v.w1.id); ids.add(v.w2.id); });
        return Array.from(ids);
    }, [violations]);

    const contextMatches = useMemo(() => {
        return allMatches.filter(m => 
            affectedWrestlerIds.includes(m.w1.id) || affectedWrestlerIds.includes(m.w2.id)
        ).sort((a, b) => a.boutNumber - b.boutNumber);
    }, [allMatches, affectedWrestlerIds]);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-red-500/50 rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-red-950/20 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="text-red-500" size={20} />
                        <div>
                            <h3 className="text-lg font-bold text-white">Rest Requirement Issues</h3>
                            <p className="text-xs text-red-300">Showing full schedule for affected wrestlers.</p>
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
                            {contextMatches.map((m) => (
                                <tr key={m.id} className={m.hasRestViolation ? "bg-red-900/10 hover:bg-red-900/20" : "hover:bg-slate-800/50"}>
                                    <td className="px-4 py-3 font-mono text-white text-center">{m.matId}</td>
                                    <td className="px-4 py-3 font-mono text-center">{m.boutNumber}</td>
                                    <td className="px-4 py-3"><div className="font-bold text-white">{m.w1.firstName} {m.w1.lastName}</div></td>
                                    <td className="px-4 py-3"><div className="font-bold text-white">{m.w2.firstName} {m.w2.lastName}</div></td>
                                    <td className="px-4 py-3">{m.hasRestViolation ? <span className="text-red-400 text-xs font-bold">{m.restViolationReason}</span> : <span className="text-slate-600 text-xs">OK</span>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end"><Button variant="ghost" onClick={onClose}>Close</Button></div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const Step5_Sequencing = ({ event, onUpdate }) => {
    const config = useMemo(() => getSequencingConfig(event), [event]);
    const [schedule, setSchedule] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [viewMode, setViewMode] = useState('by_mat'); 
    const [filterMat, setFilterMat] = useState('All');
    const [filterTeam, setFilterTeam] = useState('All');
    const [wrestlerSearch, setWrestlerSearch] = useState('');
    
    // Modal States
    const [showIssuesModal, setShowIssuesModal] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [moveMatchTarget, setMoveMatchTarget] = useState(null);

    useEffect(() => { if (event.sequencing) setSchedule(event.sequencing); }, [event.sequencing]);

    const handleGenerate = () => {
        if (!event.matchups || event.matchups.length === 0) { alert("No matchups found. Please complete Step 4 first."); return; }
        
        setIsGenerating(true);
        setTimeout(() => {
            const newSchedule = generateSchedule(event.matchups, config);
            setSchedule(newSchedule);
            onUpdate(event.id, { sequencing: newSchedule, schedulingStatus: 'complete' });
            setIsGenerating(false);
        }, 600);
    };

    const handleReRun = () => {
        if (confirm("Re-generating the schedule will overwrite all manual changes and movements. Continue?")) {
            handleGenerate();
        }
    };

    const handleClear = () => {
        if (confirm("Clear the current schedule sequence?")) {
            setSchedule(null);
            onUpdate(event.id, { sequencing: null, schedulingStatus: 'in_progress' });
        }
    };

    // MANUAL MOVE HANDLER (Smart Shift)
    const handleMoveMatch = (matchId, targetMatId, targetMatchNum) => {
        if (!schedule) return;

        // 1. Get the match
        const matchToMove = schedule.find(m => m.id === matchId);
        if (!matchToMove) return;

        // 2. Remove match from list temporarily
        let tempSchedule = schedule.filter(m => m.id !== matchId);

        // 3. Renumber the remaining list to "close the gap" 
        // This ensures indices are compact (1, 2, 3...) regardless of where we removed from
        tempSchedule = renumberSchedule(tempSchedule);

        // 4. Shift items on the TARGET mat to make room for the new match
        tempSchedule = tempSchedule.map(m => {
            if (m.matId === targetMatId && m.boutNumber >= targetMatchNum) {
                return { ...m, boutNumber: m.boutNumber + 1 };
            }
            return m;
        });

        // 5. Insert the moved match at the target location
        const updatedMatch = { ...matchToMove, matId: targetMatId, boutNumber: targetMatchNum };
        tempSchedule.push(updatedMatch);

        // 6. Sort and final validation
        // renumberSchedule sorts by boutNumber, so our new match will land in the correct visual order
        const finalSchedule = renumberSchedule(tempSchedule);
        const validated = validateSchedule(finalSchedule, config.minRest);
        
        setSchedule(validated);
        onUpdate(event.id, { sequencing: validated });
        setMoveMatchTarget(null);
    };

    const handleDeleteMatch = (matchId) => {
        if (!confirm("Delete this match from the schedule?")) return;
        const newSchedule = schedule.filter(m => m.id !== matchId);
        // Renumber to close gap
        const renumbered = renumberSchedule(newSchedule);
        const validated = validateSchedule(renumbered, config.minRest);
        setSchedule(validated);
        onUpdate(event.id, { sequencing: validated });
    };

    // --- VIEW DATA ---
    const matViewData = useMemo(() => {
        if (!schedule) return [];
        let data = [...schedule];
        if (filterMat !== 'All') data = data.filter(m => m.matId === parseInt(filterMat));
        if (wrestlerSearch) {
            const lower = wrestlerSearch.toLowerCase();
            data = data.filter(m => 
                m.w1.firstName.toLowerCase().includes(lower) || m.w1.lastName.toLowerCase().includes(lower) ||
                m.w2.firstName.toLowerCase().includes(lower) || m.w2.lastName.toLowerCase().includes(lower)
            );
        }
        return data.sort((a,b) => {
            if (a.matId !== b.matId) return a.matId - b.matId;
            return a.boutNumber - b.boutNumber;
        });
    }, [schedule, filterMat, wrestlerSearch]);

    const teamViewData = useMemo(() => {
        if (!schedule) return [];
        const rows = [];
        schedule.forEach(m => {
            rows.push({ uniqueId: `${m.id}-w1`, team: m.w1.teamName, wrestlerName: `${m.w1.firstName} ${m.w1.lastName}`, matId: m.matId, boutNumber: m.boutNumber });
            rows.push({ uniqueId: `${m.id}-w2`, team: m.w2.teamName, wrestlerName: `${m.w2.firstName} ${m.w2.lastName}`, matId: m.matId, boutNumber: m.boutNumber });
        });
        let filtered = rows;
        if (filterTeam !== 'All') filtered = filtered.filter(r => r.team === filterTeam);
        if (wrestlerSearch) filtered = filtered.filter(r => r.wrestlerName.toLowerCase().includes(wrestlerSearch.toLowerCase()));
        return filtered.sort((a,b) => a.wrestlerName.localeCompare(b.wrestlerName));
    }, [schedule, filterTeam, wrestlerSearch]);

    const teams = useMemo(() => event.participatingTeams ? event.participatingTeams.map(t => t.name).sort() : [], [event.participatingTeams]);
    const violations = useMemo(() => schedule ? schedule.filter(m => m.hasRestViolation) : [], [schedule]);
    const violationCount = violations.length;
    const matStats = useMemo(() => {
        if (!schedule) return [];
        const stats = Array(config.matsAvailable).fill(0);
        schedule.forEach(m => { if (m.matId >= 1 && m.matId <= config.matsAvailable) stats[m.matId - 1]++; });
        return stats;
    }, [schedule, config.matsAvailable]);

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 h-full flex flex-col">
            {showIssuesModal && <RestIssuesModal violations={violations} allMatches={schedule} onClose={() => setShowIssuesModal(false)} />}
            {selectedMatch && <MatchDetailsModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />}
            {moveMatchTarget && <MoveMatchModal match={moveMatchTarget} maxMatches={Math.max(...schedule.map(b => b.boutNumber), 0)} mats={Array.from({length: config.matsAvailable}, (_, i) => i + 1)} onClose={() => setMoveMatchTarget(null)} onMove={handleMoveMatch} />}

            <PageHeader title="Schedule Sequencer" description="Distribute bouts across mats and check rest gaps."
                actions={
                    <div className="flex items-center gap-3">
                        {schedule ? (
                            <Button variant="ghost" onClick={handleClear} className="text-red-400 hover:bg-red-950/30">Clear</Button>
                        ) : (
                            <Button onClick={handleGenerate} disabled={isGenerating} className="shadow-lg shadow-blue-900/20">
                                {isGenerating ? 'Calculating...' : 'Generate Schedule'} <Play size={16} className="ml-2 fill-current"/>
                            </Button>
                        )}
                        {schedule && <Button onClick={handleReRun} variant="secondary" className="border-slate-600">Re-Run <ArrowRightLeft size={16} className="ml-2"/></Button>}
                    </div>
                }
            />

            <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl p-6 min-h-0 flex flex-col">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex flex-wrap items-center justify-between gap-4 mb-4 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                            <button onClick={() => setViewMode('by_mat')} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-colors ${viewMode === 'by_mat' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><LayoutGrid size={14}/> By Mat</button>
                            <button onClick={() => setViewMode('by_team')} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-colors ${viewMode === 'by_team' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><Users size={14}/> By Team</button>
                        </div>
                        {schedule && (
                            <div className="flex items-center gap-2">
                                <Filter size={16} className="text-slate-500" />
                                {viewMode === 'by_mat' ? (
                                    <select 
                                        value={filterMat} 
                                        onChange={(e) => setFilterMat(e.target.value)} 
                                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
                                    >
                                        <option value="All">All Mats</option>
                                        {Array.from({length: config.matsAvailable}, (_, i) => i + 1).map(num => <option key={num} value={num}>Mat {num}</option>)}
                                    </select>
                                ) : (
                                    <select 
                                        value={filterTeam} 
                                        onChange={(e) => setFilterTeam(e.target.value)} 
                                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500 max-w-[150px]"
                                    >
                                        <option value="All">All Teams</option>
                                        {teams.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                )}
                                <div className="relative">
                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input type="text" placeholder="Search wrestler..." value={wrestlerSearch} onChange={(e) => setWrestlerSearch(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-blue-500 w-48" />
                                    {wrestlerSearch && (
                                        <button onClick={() => setWrestlerSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1">
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
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
                            <div onClick={() => violationCount > 0 && setShowIssuesModal(true)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all hover:brightness-110 ${violationCount > 0 ? 'bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/30' : 'bg-green-900/20 text-green-400 border-green-900/50'}`}>
                                {violationCount > 0 ? <AlertTriangle size={14}/> : <CheckCircle2 size={14}/>}
                                {violationCount > 0 ? `${violationCount} Rest Issues` : 'Valid'}
                            </div>
                        </div>
                    )}
                </div>

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
                                            <th className="px-4 py-3 border-r border-slate-700">Team (2)</th>
                                            <th className="px-4 py-3 w-24 text-right">Actions</th>
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
                                                <td className="px-2 py-2 text-center bg-slate-800/30">
                                                    <span className="font-mono text-white font-bold">{m.matId}</span>
                                                </td>
                                                <td className="px-2 py-2 text-center border-r border-slate-800">
                                                    <span className="font-mono text-slate-300">{m.boutNumber}</span>
                                                </td>
                                                <td className={`px-4 py-2 border-r border-slate-800 font-medium ${m.hasRestViolation && m.restViolationReason.includes(m.w2.lastName) ? 'text-red-400' : 'text-white'}`}>
                                                    {m.w2.firstName} {m.w2.lastName}
                                                </td>
                                                <td className="px-4 py-2 text-xs text-slate-400 border-r border-slate-800">{m.w2.teamAbbr}</td>
                                                
                                                {/* ACTIONS COLUMN */}
                                                <td className="px-4 py-2 text-right flex items-center justify-end gap-1">
                                                    <button onClick={() => setSelectedMatch(m)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Info"><Info size={14}/></button>
                                                    <button onClick={() => setMoveMatchTarget(m)} className="p-1.5 hover:bg-slate-700 rounded text-blue-400" title="Move"><Move size={14}/></button>
                                                    <button onClick={() => handleDeleteMatch(m.id)} className="p-1.5 hover:bg-slate-700 rounded text-red-400" title="Delete"><Trash2 size={14}/></button>
                                                </td>
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