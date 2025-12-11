import React, { useState, useMemo, useEffect } from 'react';
import { 
  Swords, 
  RefreshCw, 
  Trash2, 
  Eye, 
  Plus, 
  Filter, 
  X, 
  Gauge, 
  Info,
  UserX,
  CheckCircle,
  Check,
  XCircle,
  ArrowUpDown,
  Search,
  Play,
  RotateCcw,
  UserPlus // Added Icon
} from 'lucide-react';
import { Button } from '../utils';
import PageHeader from './PageHeader';
import { getPlayerValidationIssues, createPlayer } from '../models'; // Added createPlayer

// --- HELPERS ---

const calculateAge = (dob) => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    if (isNaN(birthDate)) return 0;
    const today = new Date();
    const diffTime = Math.abs(today - birthDate);
    const age = diffTime / (1000 * 60 * 60 * 24 * 365.25); 
    return parseFloat(age.toFixed(1));
};

// Centralized Capacity Logic
const calculateCapacity = (event) => {
    const params = { ...event, ...(event.eventParameters || {}) };
    const numMats = parseInt(params.mats || params.numMats || 3);
    const rawDuration = params.durationHours || params.eventDuration || 4; 
    const sessionHours = parseFloat(rawDuration); 
    const matchesPerHourPerMat = 12;
    
    const targetCapacity = Math.floor(numMats * matchesPerHourPerMat * sessionHours);
    const hardCap = Math.ceil(targetCapacity * 1.10); 
    
    return { targetCapacity, hardCap, numMats, sessionHours };
};

// --- SCORING VISUALIZATION ---

const getMatchQuality = (score) => {
    const percentage = Math.min(100, Math.max(0, (score / 50) * 100));
    let label = 'Poor';
    let color = 'text-red-500';
    let bg = 'bg-red-500';

    if (score >= 45) { label = 'Perfect'; color = 'text-emerald-400'; bg = 'bg-emerald-500'; }
    else if (score >= 35) { label = 'Good'; color = 'text-blue-400'; bg = 'bg-blue-500'; }
    else if (score >= 25) { label = 'Fair'; color = 'text-yellow-400'; bg = 'bg-yellow-500'; }

    return { percentage, label, color, bg };
};

const MatchQualityBadge = ({ score }) => {
    const { percentage, label, color, bg } = getMatchQuality(score);
    return (
        <div className="flex flex-col w-24">
            <div className="flex justify-between items-center text-[10px] mb-1">
                <span className={`font-bold ${color}`}>{label}</span>
                <span className="text-slate-500">{percentage.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${bg} transition-all duration-500`} style={{ width: `${percentage}%` }} />
            </div>
        </div>
    );
};

// --- CORE ALGORITHM: SCORING ---
const calculateMatchMetrics = (w1, w2, matchRules) => {
    const { 
        intraTeam = 'no', mixedGender = 'no', ageMode = 'age', ageTolerance = 1.0, 
        weightTolerance = 10, ratingTolerance = 1.0, lowRatingPairing = false 
    } = matchRules || {};

    let qualified = true;
    const reasons = [];

    const isSameTeam = w1.teamId === w2.teamId;
    const isSameGender = w1.gender === w2.gender;
    const ageDiff = Math.abs(w1.age - w2.age);
    
    const lighter = Math.min(w1.weight, w2.weight);
    const heavier = Math.max(w1.weight, w2.weight);
    const weightDiffPct = lighter > 0 ? ((heavier - lighter) / lighter) * 100 : 100;
    const ratingDiff = Math.abs(w1.rating - w2.rating);

    if (isSameTeam && intraTeam === 'no') { qualified = false; reasons.push('Same Team'); }
    if (!isSameGender && mixedGender === 'no') { qualified = false; reasons.push('Gender'); }
    if (weightDiffPct > weightTolerance) { qualified = false; reasons.push(`Weight (${weightDiffPct.toFixed(1)}%)`); }
    
    if (ageMode === 'division') {
        if (w1.division !== w2.division) { qualified = false; reasons.push('Division'); }
    } else {
        if (ageDiff > ageTolerance) { qualified = false; reasons.push(`Age Gap (${ageDiff.toFixed(1)})`); }
    }
    
    if (lowRatingPairing) {
        if ((w1.rating === 0 || w2.rating === 0) && (w1.rating !== w2.rating)) { qualified = false; reasons.push('Beginner Shield'); }
    }
    
    if (ratingDiff > ratingTolerance) { qualified = false; reasons.push(`Rating Diff (${ratingDiff})`); }

    let teamVal = !isSameTeam ? 10 : (intraTeam === 'yes' ? 7 : 3);
    let genderVal = isSameGender ? 10 : (mixedGender === 'yes' ? 7 : 3);
    let ageVal = 10 - (ageDiff * 5);
    let weightVal = 10 - weightDiffPct;
    let skillVal = 10 - (ratingDiff * 3.3);

    const totalScore = Math.max(0, teamVal + genderVal + ageVal + weightVal + skillVal);

    return { score: totalScore, qualified, reasons };
};

// --- CORE ALGORITHM: SOLVER ---
const runMatchmaking = (event) => {
    const { participatingTeams, matchRules, eventParameters } = event;
    const maxMatches = eventParameters?.maxMatches || 3;
    const { hardCap } = calculateCapacity(event);
    
    // 1. Flatten Roster
    let allWrestlers = [];
    participatingTeams.forEach(t => {
        if(t.roster) {
            t.roster.forEach(w => {
                if (getPlayerValidationIssues(w).length > 0) return;
                allWrestlers.push({ 
                    ...w, 
                    teamId: t.id, 
                    teamName: t.name, 
                    teamAbbr: t.abbr || t.name.substring(0,3).toUpperCase(),
                    age: calculateAge(w.dob)
                });
            });
        }
    });

    // 2. Pre-Calculate Edges
    let potentialMatches = [];
    const wrestlerOptions = {}; 
    const wrestlerPotentialCount = {}; 
    allWrestlers.forEach(w => {
        wrestlerOptions[w.id] = new Set();
        wrestlerPotentialCount[w.id] = 0;
    });

    for (let i = 0; i < allWrestlers.length; i++) {
        for (let j = i + 1; j < allWrestlers.length; j++) {
            const w1 = allWrestlers[i];
            const w2 = allWrestlers[j];
            const metrics = calculateMatchMetrics(w1, w2, matchRules);

            if (metrics.qualified) {
                const matchId = `${w1.id}::${w2.id}`;
                potentialMatches.push({ id: matchId, w1Id: w1.id, w2Id: w2.id, ...metrics });
                wrestlerOptions[w1.id].add(matchId);
                wrestlerOptions[w2.id].add(matchId);
                wrestlerPotentialCount[w1.id]++;
                wrestlerPotentialCount[w2.id]++;
            }
        }
    }

    const selectedMatches = [];
    const matchesPerWrestler = {};
    allWrestlers.forEach(w => matchesPerWrestler[w.id] = 0);

    // 3. Main Loop
    let availableMatches = [...potentialMatches];
    let iterations = 0;
    const MAX_ITERATIONS = potentialMatches.length + 500;

    while (availableMatches.length > 0 && iterations < MAX_ITERATIONS) {
        if (selectedMatches.length >= hardCap) break;
        iterations++;

        availableMatches.forEach(m => {
            const opts1 = wrestlerOptions[m.w1Id].size;
            const opts2 = wrestlerOptions[m.w2Id].size;
            let priority = (opts1 === 1 || opts2 === 1) ? 1000 : (opts1 <= 2 || opts2 <= 2 ? 500 : 0);
            m.selectionWeight = m.score + priority;
        });

        availableMatches.sort((a, b) => b.selectionWeight - a.selectionWeight);
        const bestMatch = availableMatches[0];

        const w1Id = bestMatch.w1Id;
        const w2Id = bestMatch.w2Id;

        if (matchesPerWrestler[w1Id] < maxMatches && matchesPerWrestler[w2Id] < maxMatches) {
            const w1 = allWrestlers.find(w => w.id === w1Id);
            const w2 = allWrestlers.find(w => w.id === w2Id);
            selectedMatches.push({ ...bestMatch, w1, w2 });
            matchesPerWrestler[w1Id]++;
            matchesPerWrestler[w2Id]++;
        }

        availableMatches = availableMatches.filter(m => m.id !== bestMatch.id);
        
        // Cleanup
        const maxedWrestlers = new Set();
        if (matchesPerWrestler[w1Id] >= maxMatches) maxedWrestlers.add(w1Id);
        if (matchesPerWrestler[w2Id] >= maxMatches) maxedWrestlers.add(w2Id);

        if (maxedWrestlers.size > 0) {
            availableMatches = availableMatches.filter(m => {
                const isInvalid = maxedWrestlers.has(m.w1Id) || maxedWrestlers.has(m.w2Id);
                if (isInvalid) {
                    if (maxedWrestlers.has(m.w1Id)) wrestlerOptions[m.w2Id]?.delete(m.id);
                    if (maxedWrestlers.has(m.w2Id)) wrestlerOptions[m.w1Id]?.delete(m.id);
                }
                return !isInvalid;
            });
        }
    }

    // 4. Orphan Recovery
    const isAtCapacity = selectedMatches.length >= hardCap;
    const orphans = allWrestlers.filter(w => matchesPerWrestler[w.id] === 0 && wrestlerPotentialCount[w.id] > 0);

    orphans.forEach(orphan => {
        let bestRecoveryMatch = null;
        let bestRecoveryScore = -1;

        for (let i = 0; i < allWrestlers.length; i++) {
            const opponent = allWrestlers[i];
            if (opponent.id === orphan.id) continue;

            const metrics = calculateMatchMetrics(orphan, opponent, matchRules);
            if (metrics.qualified) {
                if (metrics.score > bestRecoveryScore) {
                    bestRecoveryScore = metrics.score;
                    bestRecoveryMatch = { 
                        id: `${orphan.id}::${opponent.id}::RECOVERY`,
                        w1Id: orphan.id, w2Id: opponent.id,
                        w1: orphan, w2: opponent, ...metrics 
                    };
                }
            }
        }

        if (bestRecoveryMatch) {
            const { w2: opponent } = bestRecoveryMatch;
            const oppId = opponent.id;
            
            if (matchesPerWrestler[oppId] < maxMatches && !isAtCapacity) {
                 selectedMatches.push(bestRecoveryMatch);
                 matchesPerWrestler[orphan.id]++;
                 matchesPerWrestler[oppId]++;
            } else {
                const swapCandidateIndex = selectedMatches.findIndex(m => {
                    const isOpp = (m.w1.id === oppId || m.w2.id === oppId);
                    if (!isOpp) return false;
                    const otherPersonId = m.w1.id === oppId ? m.w2.id : m.w1.id;
                    return matchesPerWrestler[otherPersonId] > 1; 
                });

                if (swapCandidateIndex !== -1) {
                    const matchToRemove = selectedMatches[swapCandidateIndex];
                    const otherPersonId = matchToRemove.w1.id === oppId ? matchToRemove.w2.id : matchToRemove.w1.id;
                    
                    selectedMatches.splice(swapCandidateIndex, 1); 
                    matchesPerWrestler[otherPersonId]--; 
                    
                    selectedMatches.push(bestRecoveryMatch); 
                    matchesPerWrestler[orphan.id]++;
                } 
            }
        }
    });

    const wrestlerStats = allWrestlers.map(w => ({
        ...w,
        matchCount: matchesPerWrestler[w.id] || 0,
        potentialMatches: wrestlerPotentialCount[w.id] || 0
    }));

    return { matches: selectedMatches, wrestlerStats, totalWrestlers: allWrestlers.length };
};

// --- SUB-COMPONENTS ---

const WrestlerHeader = ({ wrestler }) => (
    <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
        <div>
            <h3 className="text-xl font-bold text-white">{wrestler.firstName} {wrestler.lastName}</h3>
            <p className="text-sm text-slate-400">{wrestler.teamName}</p>
        </div>
        <div className="flex gap-4 text-xs font-mono text-slate-300">
            <div className="flex flex-col items-end"><span className="text-slate-500 uppercase text-[10px]">Division</span><span className="font-bold">{wrestler.division || 'N/A'}</span></div>
            <div className="flex flex-col items-end"><span className="text-slate-500 uppercase text-[10px]">Age</span><span className="font-bold">{wrestler.age}</span></div>
            <div className="flex flex-col items-end"><span className="text-slate-500 uppercase text-[10px]">Weight</span><span className="font-bold">{wrestler.weight}</span></div>
            <div className="flex flex-col items-end"><span className="text-slate-500 uppercase text-[10px]">Rating</span><span className="font-bold">{wrestler.rating}</span></div>
            <div className="flex flex-col items-end"><span className="text-slate-500 uppercase text-[10px]">Gender</span><span className="font-bold">{wrestler.gender}</span></div>
        </div>
    </div>
);

const WrestlerInfoPopup = ({ wrestler, onClose, onRemove }) => (
    <div className="fixed inset-0 bg-black/50 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200" onClick={onClose}>
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-2xl min-w-[350px]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white text-lg">{wrestler.firstName} {wrestler.lastName}</h3>
                <button onClick={onClose}><X size={16} className="text-slate-500 hover:text-white"/></button>
            </div>
            <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-slate-400 text-sm">Team</span>
                    <span className="text-white font-medium">{wrestler.teamName}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                        <div className="text-[10px] uppercase text-slate-500 font-bold">Weight</div>
                        <div className="text-lg font-mono text-white">{wrestler.weight}</div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                        <div className="text-[10px] uppercase text-slate-500 font-bold">Rating</div>
                        <div className="text-lg font-mono text-white">{wrestler.rating}</div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                        <div className="text-[10px] uppercase text-slate-500 font-bold">Age</div>
                        <div className="text-lg font-mono text-white">{wrestler.age}</div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                        <div className="text-[10px] uppercase text-slate-500 font-bold">Gender</div>
                        <div className="text-lg font-mono text-white">{wrestler.gender}</div>
                    </div>
                </div>
                
                <div className="pt-2 border-t border-slate-800">
                    <Button 
                        onClick={() => onRemove(wrestler.id)} 
                        className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 justify-center"
                    >
                        <UserX size={16} className="mr-2"/> Remove from Event
                    </Button>
                    <p className="text-[10px] text-slate-500 mt-2 text-center">
                        Removes wrestler from roster and deletes all their matches.
                    </p>
                </div>
            </div>
        </div>
    </div>
);

const AddWrestlerModal = ({ teams, onClose, onAdd }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        teamId: teams[0]?.id || '',
        division: '',
        weight: '',
        rating: '',
        dob: '',
        gender: 'M'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if(!formData.firstName || !formData.lastName || !formData.teamId) return;
        
        onAdd({
            ...formData,
            weight: parseFloat(formData.weight),
            rating: parseFloat(formData.rating)
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[150] p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <UserPlus size={20} className="text-green-400"/> Add Wrestler to Event
                    </h3>
                    <button onClick={onClose}><X size={20} className="text-slate-500 hover:text-white"/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">First Name</label>
                            <input required className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500"
                                value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Last Name</label>
                            <input required className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500"
                                value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">Team</label>
                        <select className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500"
                            value={formData.teamId} onChange={e => setFormData({...formData, teamId: e.target.value})}
                        >
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Division</label>
                            <input required className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500"
                                value={formData.division} onChange={e => setFormData({...formData, division: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">DOB</label>
                            <input type="date" required className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500"
                                value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Weight</label>
                            <input type="number" step="0.1" required className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500"
                                value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Rating (0-5)</label>
                            <input type="number" min="0" max="5" step="0.1" required className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500"
                                value={formData.rating} onChange={e => setFormData({...formData, rating: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Gender</label>
                            <select className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500"
                                value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}
                            >
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Add Wrestler</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ViewMatchesModal = ({ wrestler, matches, onClose, onRemoveMatch }) => {
    const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });

    const sortedMatches = useMemo(() => {
        const myMatches = matches.filter(m => m.w1.id === wrestler.id || m.w2.id === wrestler.id);
        
        // Add match count to opponent for sorting
        const myMatchesWithStats = myMatches.map(m => {
            const opp = m.w1.id === wrestler.id ? m.w2 : m.w1;
            // Count opponent's total matches
            const oppMatchCount = matches.filter(x => x.w1.id === opp.id || x.w2.id === opp.id).length;
            return { ...m, opp, oppMatchCount };
        });

        return myMatchesWithStats.sort((a, b) => {
            const oppA = a.opp;
            const oppB = b.opp;
            
            let valA, valB;

            switch(sortConfig.key) {
                case 'name':
                    valA = oppA.lastName.toLowerCase();
                    valB = oppB.lastName.toLowerCase();
                    break;
                case 'team':
                    valA = oppA.teamAbbr;
                    valB = oppB.teamAbbr;
                    break;
                case 'age':
                    valA = oppA.age;
                    valB = oppB.age;
                    break;
                case 'weight':
                    valA = oppA.weight;
                    valB = oppB.weight;
                    break;
                case 'rating':
                    valA = oppA.rating;
                    valB = oppB.rating;
                    break;
                case 'matchCount':
                    valA = a.oppMatchCount;
                    valB = b.oppMatchCount;
                    break;
                case 'score':
                default:
                    valA = a.score;
                    valB = b.score;
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [matches, wrestler, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({ 
            key, 
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' 
        }));
    };

    const SortIcon = ({ colKey }) => (
        <ArrowUpDown size={10} className={`ml-1 inline ${sortConfig.key === colKey ? 'text-blue-400 opacity-100' : 'opacity-30'}`} />
    );

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center p-4 border-b border-slate-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><Eye size={20} className="text-blue-400"/> Matches</h3>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white" /></button>
                </div>
                <WrestlerHeader wrestler={wrestler} />
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-800 text-slate-400 uppercase font-bold text-xs sticky top-0 cursor-pointer select-none">
                            <tr>
                                <th className="px-4 py-3 hover:bg-slate-700" onClick={() => handleSort('name')}>Opponent <SortIcon colKey="name"/></th>
                                <th className="px-4 py-3 hover:bg-slate-700" onClick={() => handleSort('team')}>Team <SortIcon colKey="team"/></th>
                                <th className="px-4 py-3 hover:bg-slate-700" onClick={() => handleSort('age')}>Age <SortIcon colKey="age"/></th>
                                <th className="px-4 py-3 hover:bg-slate-700" onClick={() => handleSort('weight')}>Weight <SortIcon colKey="weight"/></th>
                                <th className="px-4 py-3 hover:bg-slate-700" onClick={() => handleSort('rating')}>Rating <SortIcon colKey="rating"/></th>
                                <th className="px-4 py-3 hover:bg-slate-700" onClick={() => handleSort('matchCount')}>Matches <SortIcon colKey="matchCount"/></th>
                                <th className="px-4 py-3 hover:bg-slate-700" onClick={() => handleSort('score')}>Score <SortIcon colKey="score"/></th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {sortedMatches.length === 0 ? (
                                <tr><td colSpan="8" className="p-8 text-center text-slate-500">No matches scheduled.</td></tr>
                            ) : sortedMatches.map(m => {
                                const opp = m.opp;
                                return (
                                    <tr key={m.id}>
                                        <td className="px-4 py-3 font-medium text-white">{opp.firstName} {opp.lastName}</td>
                                        <td className="px-4 py-3 text-xs text-slate-400">{opp.teamAbbr}</td>
                                        <td className="px-4 py-3 font-mono">{opp.age}</td>
                                        <td className="px-4 py-3 font-mono">{opp.weight}</td>
                                        <td className="px-4 py-3 font-mono">{opp.rating}</td>
                                        <td className="px-4 py-3 font-mono">{m.oppMatchCount}</td>
                                        <td className="px-4 py-3"><MatchQualityBadge score={m.score} /></td>
                                        <td className="px-4 py-3 text-right"><Button variant="ghost" onClick={() => onRemoveMatch(m.id)} className="text-red-400 h-8 px-2"><Trash2 size={16}/></Button></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const AddMatchModal = ({ wrestler, allWrestlers, currentMatches, matchRules, onClose, onAddMatch }) => {
    const [filter, setFilter] = useState('');
    const [lastAddedId, setLastAddedId] = useState(null);
    // Default Sort: Status (Qualified) Desc, then Score Desc
    const [sortConfig, setSortConfig] = useState({ key: 'status', direction: 'desc' });

    const existingOpponents = useMemo(() => {
        const ids = new Set();
        currentMatches.forEach(m => {
            if (m.w1.id === wrestler.id) ids.add(m.w2.id);
            if (m.w2.id === wrestler.id) ids.add(m.w1.id);
        });
        return ids;
    }, [currentMatches, wrestler]);

    const candidates = useMemo(() => {
        let baseList = allWrestlers
            .filter(w => w.id !== wrestler.id && !existingOpponents.has(w.id))
            .map(opp => {
                // Calculate match count for this potential opponent from current matches list
                const matchCount = currentMatches.filter(m => m.w1.id === opp.id || m.w2.id === opp.id).length;
                
                const metrics = calculateMatchMetrics(wrestler, opp, matchRules);
                return { ...opp, ...metrics, matchCount };
            });

        // Filter
        if (filter) {
            const lowerFilter = filter.toLowerCase();
            baseList = baseList.filter(c => 
                c.lastName.toLowerCase().includes(lowerFilter) || 
                c.firstName.toLowerCase().includes(lowerFilter) ||
                c.teamAbbr.toLowerCase().includes(lowerFilter)
            );
        }

        // Sort
        baseList.sort((a, b) => {
            // Special Case: Status (Qualified boolean)
            if (sortConfig.key === 'status') {
                const aVal = a.qualified ? 1 : 0;
                const bVal = b.qualified ? 1 : 0;
                
                if (aVal !== bVal) {
                    return sortConfig.direction === 'desc' ? bVal - aVal : aVal - bVal;
                }
                
                // Secondary sort by score (Highest first) if status is same
                return b.score - a.score;
            }

            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            // Normalize strings
            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            
            // Secondary Sort: Always Score Descending if primary matches
            return b.score - a.score;
        });

        return baseList;
    }, [allWrestlers, wrestler, matchRules, existingOpponents, filter, sortConfig, currentMatches]);

    const handleLocalAdd = (opp) => {
        onAddMatch(wrestler, opp, opp.score);
        setLastAddedId(opp.id);
        setTimeout(() => setLastAddedId(null), 1500); 
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({ 
            key, 
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' 
        }));
    };

    const SortIcon = ({ colKey }) => (
        <ArrowUpDown size={10} className={`ml-1 inline ${sortConfig.key === colKey ? 'text-blue-400 opacity-100' : 'opacity-30'}`} />
    );

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-slate-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><Plus size={20} className="text-green-400"/> Add Match</h3>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white" /></button>
                </div>
                <WrestlerHeader wrestler={wrestler} />
                <div className="p-3 border-b border-slate-700 bg-slate-900/50">
                    <div className="relative">
                        <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                        <input 
                            className="w-full bg-slate-950 border border-slate-700 rounded py-2 pl-10 pr-8 text-sm text-white outline-none focus:border-blue-500"
                            placeholder="Search opponents..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />
                        {filter && (
                            <button onClick={() => setFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-800 text-slate-400 uppercase font-bold text-xs sticky top-0 z-10 cursor-pointer select-none">
                            <tr>
                                <th className="px-4 py-3 text-center hover:bg-slate-700" onClick={() => handleSort('status')}>Status <SortIcon colKey="status"/></th>
                                <th className="px-4 py-3 hover:bg-slate-700" onClick={() => handleSort('lastName')}>Opponent <SortIcon colKey="lastName"/></th>
                                <th className="px-4 py-3 hover:bg-slate-700" onClick={() => handleSort('teamAbbr')}>Team <SortIcon colKey="teamAbbr"/></th>
                                <th className="px-4 py-3 hover:bg-slate-700" onClick={() => handleSort('age')}>Age <SortIcon colKey="age"/></th>
                                <th className="px-4 py-3 hover:bg-slate-700" onClick={() => handleSort('weight')}>Weight <SortIcon colKey="weight"/></th>
                                <th className="px-4 py-3 hover:bg-slate-700" onClick={() => handleSort('rating')}>Rating <SortIcon colKey="rating"/></th>
                                <th className="px-4 py-3 hover:bg-slate-700" onClick={() => handleSort('matchCount')}>Matches <SortIcon colKey="matchCount"/></th>
                                <th className="px-4 py-3 hover:bg-slate-700" onClick={() => handleSort('score')}>Match Quality <SortIcon colKey="score"/></th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {candidates.map(opp => (
                                <tr key={opp.id} className={`hover:bg-slate-800/50 ${!opp.qualified ? 'opacity-50' : ''}`}>
                                    <td className="px-4 py-3 text-center overflow-visible relative">
                                        {opp.qualified ? 
                                            <CheckCircle size={16} className="text-green-500 inline"/> : 
                                            <div className="group relative inline-block">
                                                {/* Fallback title for safety */}
                                                <XCircle size={16} className="text-red-500 inline cursor-help" title={opp.reasons.join(', ')}/>
                                                {/* Custom Tooltip popping to the RIGHT (left-full) */}
                                                <div className="absolute top-1/2 left-full -translate-y-1/2 ml-2 w-48 p-2 bg-slate-950 border border-slate-700 shadow-xl rounded text-xs text-white text-left opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                    <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-red-400">Issues:</div>
                                                    <ul className="list-disc list-inside space-y-0.5">
                                                        {opp.reasons.map((r, i) => <li key={i}>{r}</li>)}
                                                    </ul>
                                                    {/* Triangle pointer on left side of tooltip pointing to icon */}
                                                    <div className="absolute top-1/2 right-full -translate-y-1/2 -mr-1 border-4 border-transparent border-r-slate-700"></div>
                                                </div>
                                            </div>
                                        }
                                    </td>
                                    <td className="px-4 py-3 font-bold text-white">{opp.firstName} {opp.lastName}</td>
                                    <td className="px-4 py-3 text-xs">{opp.teamAbbr}</td>
                                    <td className="px-4 py-3 font-mono">{opp.age}</td>
                                    <td className="px-4 py-3 font-mono">{opp.weight}</td>
                                    <td className="px-4 py-3 font-mono">{opp.rating}</td>
                                    <td className="px-4 py-3 font-mono">{opp.matchCount}</td>
                                    <td className="px-4 py-3"><MatchQualityBadge score={opp.score} /></td>
                                    <td className="px-4 py-3 text-right">
                                        {lastAddedId === opp.id ? (
                                            <span className="text-green-400 text-xs font-bold flex items-center justify-end gap-1"><Check size={14}/> Added</span>
                                        ) : (
                                            <Button variant="ghost" onClick={() => handleLocalAdd(opp)} className="text-green-400 hover:bg-green-900/30 h-8 px-3 border border-green-900/50"><Plus size={16} className="mr-1"/> Add</Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
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

// --- COMPONENT ---
const Step4_Matchmaking = ({ event, onUpdate }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(event.matchups ? { matches: event.matchups, wrestlerStats: [] } : null); 
  const [sortConfig, setSortConfig] = useState({ key: 'matchCount', direction: 'asc' }); 
  const [teamFilter, setTeamFilter] = useState('All'); 
  const [searchFilter, setSearchFilter] = useState(''); // NEW: Search Filter State

  // Modal State
  const [selectedWrestler, setSelectedWrestler] = useState(null);
  const [viewingInfoWrestler, setViewingInfoWrestler] = useState(null); // For Info Modal
  const [showViewModal, setShowViewModal] = useState(false); // For View Matches
  const [showAddModal, setShowAddModal] = useState(false); // For Add Match
  const [showAddWrestlerModal, setShowAddWrestlerModal] = useState(false); // NEW: Add Wrestler Modal

  const capacityMetrics = useMemo(() => {
      const { targetCapacity, hardCap } = calculateCapacity(event);
      const generated = results?.matches?.length || 0;
      return { targetCapacity, hardCap, generated };
  }, [event, results?.matches]);

  useEffect(() => {
      if (event.matchups && (!results || !results.wrestlerStats || results.wrestlerStats.length === 0)) {
          const output = runMatchmaking(event);
          setResults({
              matches: event.matchups,
              wrestlerStats: output.wrestlerStats,
              totalWrestlers: output.totalWrestlers
          });
      } else if (!event.matchups && results) {
          setResults(null);
      }
  }, [event.matchups]); 
  
  const handleRun = () => {
      // Re-run warning
      if (results && results.matches.length > 0) {
          if (!confirm("Re-running matchmaking will clear existing matches and reset the process. Are you sure you want to continue?")) {
              return;
          }
      }

      setIsRunning(true);
      setTimeout(() => {
          const output = runMatchmaking(event);
          setResults(output);
          onUpdate(event.id, { matchups: output.matches });
          setIsRunning(false);
      }, 800);
  };

  const handleClear = () => {
      if(!confirm("Clear all generated matches?")) return;
      setResults(null); 
      onUpdate(event.id, { matchups: null });
  };

  const handleRemoveWrestler = (wrestlerId) => {
      if (!confirm("Are you sure? This will remove the wrestler and delete all their matches.")) return;
      
      const updatedTeams = event.participatingTeams.map(t => ({
          ...t,
          roster: t.roster.filter(w => w.id !== wrestlerId)
      }));
      
      // Filter out matches involving the wrestler
      const updatedMatches = (results.matches || []).filter(m => m.w1.id !== wrestlerId && m.w2.id !== wrestlerId);
      
      // Update Local Results state to reflect immediate removal
      const updatedWrestlerStats = results.wrestlerStats.filter(w => w.id !== wrestlerId);
      
      // Recalculate match counts for remaining wrestlers
      const newCounts = {};
      updatedWrestlerStats.forEach(w => newCounts[w.id] = 0);
      updatedMatches.forEach(m => {
          if(newCounts[m.w1.id] !== undefined) newCounts[m.w1.id]++;
          if(newCounts[m.w2.id] !== undefined) newCounts[m.w2.id]++;
      });
      const newStats = updatedWrestlerStats.map(w => ({ ...w, matchCount: newCounts[w.id] || 0 }));

      setResults({
          ...results,
          matches: updatedMatches,
          wrestlerStats: newStats,
          totalWrestlers: results.totalWrestlers - 1
      });

      // Persist to parent
      onUpdate(event.id, { participatingTeams: updatedTeams, matchups: updatedMatches });
      setViewingInfoWrestler(null);
  };

  const handleRemoveMatch = (matchId) => {
      if(!confirm("Delete this match?")) return;
      
      // Filter out the match locally
      const newMatches = results.matches.filter(m => m.id !== matchId);
      
      // Recalculate match counts
      const newCounts = {};
      results.wrestlerStats.forEach(w => newCounts[w.id] = 0);
      newMatches.forEach(m => {
          if(newCounts[m.w1.id] !== undefined) newCounts[m.w1.id]++;
          if(newCounts[m.w2.id] !== undefined) newCounts[m.w2.id]++;
      });
      const newStats = results.wrestlerStats.map(w => ({ ...w, matchCount: newCounts[w.id] || 0 }));

      // Update Local State
      setResults({ ...results, matches: newMatches, wrestlerStats: newStats });
      
      // Update Parent
      onUpdate(event.id, { matchups: newMatches });
  };

  const handleAddMatch = (w1, w2, score) => {
      const newMatch = { id: `${w1.id}-${w2.id}-${Date.now()}`, w1, w2, score, qualityScore: score };
      const newMatches = [...results.matches, newMatch];
      
      const newCounts = {};
      results.wrestlerStats.forEach(w => newCounts[w.id] = 0);
      newMatches.forEach(m => {
          if(newCounts[m.w1.id] !== undefined) newCounts[m.w1.id]++;
          if(newCounts[m.w2.id] !== undefined) newCounts[m.w2.id]++;
      });
      const newStats = results.wrestlerStats.map(w => ({ ...w, matchCount: newCounts[w.id] || 0 }));

      setResults({ ...results, matches: newMatches, wrestlerStats: newStats });
      onUpdate(event.id, { matchups: newMatches });
  };

  const handleAddNewWrestler = (data) => {
      // 1. Create the wrestler object using the factory
      const newWrestler = createPlayer(data.firstName, data.lastName);
      Object.assign(newWrestler, {
          division: data.division,
          weight: data.weight,
          rating: data.rating,
          dob: data.dob,
          gender: data.gender
      });

      // 2. Add to Event's participatingTeams (Persistence)
      const targetTeamId = data.teamId;
      const targetTeam = event.participatingTeams.find(t => t.id === targetTeamId);
      
      if (!targetTeam) {
          alert("Team not found");
          return;
      }

      const updatedTeams = event.participatingTeams.map(t => {
          if (t.id === targetTeamId) {
              return { ...t, roster: [...(t.roster || []), newWrestler] };
          }
          return t;
      });

      onUpdate(event.id, { participatingTeams: updatedTeams });

      // 3. Add to Local Results (Visual Update without reset)
      // We need to shape it like a 'stat' object (flattened with team info)
      const newWrestlerStat = {
          ...newWrestler,
          teamId: targetTeam.id,
          teamName: targetTeam.name,
          teamAbbr: targetTeam.abbr || targetTeam.name.substring(0,3).toUpperCase(),
          age: calculateAge(newWrestler.dob),
          matchCount: 0,
          potentialMatches: 0 // Will be calculated dynamically in AddMatchModal
      };

      setResults(prev => ({
          ...prev,
          wrestlerStats: [...prev.wrestlerStats, newWrestlerStat],
          totalWrestlers: prev.totalWrestlers + 1
      }));

      setShowAddWrestlerModal(false);
  };

  const summaryStats = useMemo(() => {
      if (!results || !results.wrestlerStats) return [];
      const maxMatches = event.eventParameters?.maxMatches || 3;
      const range = Array.from({ length: maxMatches + 1 }, (_, i) => i);
      const teamMap = {}; 
      results.wrestlerStats.forEach(w => {
          if (!teamMap[w.teamName]) {
              teamMap[w.teamName] = { id: w.teamId, name: w.teamName, abbr: w.teamAbbr, counts: {}, range };
              range.forEach(r => teamMap[w.teamName].counts[r] = 0);
              teamMap[w.teamName].counts['over'] = 0; 
          }
          if (w.matchCount > maxMatches) teamMap[w.teamName].counts['over']++;
          else teamMap[w.teamName].counts[w.matchCount]++;
      });
      return Object.values(teamMap);
  }, [results, event.eventParameters]);

  const filteredWrestlers = useMemo(() => {
      if (!results || !results.wrestlerStats) return [];
      let data = [...results.wrestlerStats];
      
      // Filter by Team
      if (teamFilter !== 'All') data = data.filter(w => w.teamId === teamFilter);
      
      // NEW: Filter by Search (First/Last Name)
      if (searchFilter) {
          const lowerSearch = searchFilter.toLowerCase();
          data = data.filter(w => 
              w.firstName.toLowerCase().includes(lowerSearch) || 
              w.lastName.toLowerCase().includes(lowerSearch)
          );
      }
      
      data.sort((a, b) => {
          let aVal = a[sortConfig.key];
          let bVal = b[sortConfig.key];
          if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
      return data;
  }, [results, teamFilter, searchFilter, sortConfig]);

  const handleSort = (key) => {
      setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const hasMatches = results && results.matches && results.matches.length > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in slide-in-from-right-8 duration-500 flex flex-col h-full">
      
      {/* MODALS */}
      {viewingInfoWrestler && (
          <WrestlerInfoPopup wrestler={viewingInfoWrestler} onClose={() => setViewingInfoWrestler(null)} onRemove={handleRemoveWrestler} />
      )}
      {showViewModal && selectedWrestler && (
          <ViewMatchesModal wrestler={selectedWrestler} matches={results.matches} onClose={() => setShowViewModal(false)} onRemoveMatch={handleRemoveMatch} />
      )}
      {showAddModal && selectedWrestler && (
          <AddMatchModal wrestler={selectedWrestler} allWrestlers={results.wrestlerStats} currentMatches={results.matches} matchRules={event.matchRules} onClose={() => setShowAddModal(false)} onAddMatch={handleAddMatch} />
      )}
      {showAddWrestlerModal && (
          <AddWrestlerModal teams={event.participatingTeams || []} onClose={() => setShowAddWrestlerModal(false)} onAdd={handleAddNewWrestler} />
      )}

      {/* HEADER */}
      <div className="shrink-0">
        <PageHeader 
            title="Matchmaking Engine" 
            description="Optimize brackets and pairing logic." 
            actions={
                <div className="flex items-center gap-3">
                    {results && (
                        <Button variant="ghost" onClick={handleClear} className="text-red-400 hover:bg-red-950/30">
                            Clear Results
                        </Button>
                    )}
                    {/* ADDED: Add Wrestler Button */}
                    <Button onClick={() => setShowAddWrestlerModal(true)} variant="secondary" className="border-slate-600">
                        <UserPlus size={16} className="mr-2"/> Add Wrestler
                    </Button>

                    <Button onClick={handleRun} disabled={isRunning} className="w-48 justify-center shadow-lg shadow-blue-900/20 whitespace-nowrap">
                        {isRunning ? (
                            <RefreshCw className="animate-spin mr-2" size={16}/>
                        ) : hasMatches ? (
                            <RotateCcw size={16} className="mr-2"/>
                        ) : (
                            <Play size={16} className="mr-2 fill-current"/>
                        )}
                        {isRunning ? 'Processing...' : hasMatches ? 'Re-Run' : 'Run Matchmaker'}
                    </Button>
                </div>
            }
        />
      </div>

      {/* CONTENT */}
      {!results ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 border border-slate-700 border-dashed rounded-xl">
              <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <Swords size={48} className="opacity-20" />
              </div>
              <h3 className="text-xl font-bold text-slate-300 mb-2">Ready to Pair</h3>
              <p className="max-w-md text-center text-sm">
                  The engine will analyze rosters from <strong>{event.participatingTeams?.length || 0} teams</strong> 
                  and generate optimal matchups.
              </p>
          </div>
      ) : (
          <div className="flex-1 min-h-0 flex gap-6 overflow-hidden">
              
              {/* LEFT COLUMN (25%): METRICS & STATS */}
              <div className="w-1/4 flex flex-col gap-4 overflow-y-auto pr-1">
                  {/* Capacity Card */}
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shrink-0">
                      <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                          <Gauge size={16}/> Capacity
                      </h3>
                      <div className="flex items-end justify-between mb-2">
                          <span className="text-3xl font-bold text-white">{capacityMetrics.generated}</span>
                          <span className="text-sm text-slate-500 mb-1">/ {capacityMetrics.hardCap} Matches</span>
                      </div>
                      <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${
                                capacityMetrics.generated > capacityMetrics.targetCapacity ? 'bg-yellow-500' : 'bg-blue-500'
                            }`} 
                            style={{ width: `${Math.min(100, (capacityMetrics.generated / capacityMetrics.hardCap) * 100)}%` }} 
                          />
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                          Target: {capacityMetrics.targetCapacity} matches based on {event.eventParameters?.mats} mats.
                      </p>
                  </div>

                  {/* Stats Cards */}
                  <div className="flex-1 flex flex-col gap-3">
                      {summaryStats.map((stat) => (
                          <div key={stat.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                              <div className="flex justify-between items-center mb-3">
                                  <span className="font-bold text-white truncate max-w-[150px]">{stat.name}</span>
                                  <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">{stat.abbr}</span>
                              </div>
                              <div className="grid grid-cols-5 gap-1 text-center">
                                  {stat.range.map(n => (
                                      <div key={n} className="bg-slate-900/50 rounded py-1">
                                          <div className={`text-sm font-bold ${stat.counts[n] > 0 ? (n===0?'text-red-400':'text-blue-400') : 'text-slate-600'}`}>
                                              {stat.counts[n]}
                                          </div>
                                          <div className="text-[9px] text-slate-600 font-mono">{n}</div>
                                      </div>
                                  ))}
                                  {stat.counts['over'] > 0 && (
                                      <div className="bg-red-900/10 rounded py-1 border border-red-900/20">
                                          <div className="text-sm font-bold text-red-400">{stat.counts['over']}</div>
                                          <div className="text-[9px] text-red-400/50 font-mono">&gt;{stat.range.length-1}</div>
                                      </div>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* RIGHT COLUMN (75%): WRESTLER TABLE */}
              <div className="w-3/4 bg-slate-900 border border-slate-700 rounded-xl flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-slate-800 bg-slate-900 flex justify-between items-center gap-4 shrink-0">
                      <div className="flex items-center gap-2">
                          <Filter size={16} className="text-slate-500"/>
                          <select 
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500" 
                            value={teamFilter} 
                            onChange={e => setTeamFilter(e.target.value)}
                          >
                              <option value="All">All Teams</option>
                              {event.participatingTeams?.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                          </select>
                          {/* NEW: Search Input */}
                          <div className="relative">
                              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                              <input 
                                  className="bg-slate-950 border border-slate-700 rounded pl-8 pr-8 py-1 text-xs text-white outline-none focus:border-blue-500 w-40"
                                  placeholder="Search Name..."
                                  value={searchFilter}
                                  onChange={e => setSearchFilter(e.target.value)}
                              />
                              {searchFilter && (
                                  <button onClick={() => setSearchFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1">
                                      <X size={14} />
                                  </button>
                              )}
                          </div>
                      </div>
                      <div className="text-xs text-slate-500">{filteredWrestlers.length} Wrestlers</div>
                  </div>

                  <div className="flex-1 overflow-auto">
                      <table className="w-full text-left text-sm text-slate-300">
                          <thead className="bg-slate-800 text-slate-400 uppercase font-bold text-xs sticky top-0 z-10 shadow-sm">
                              <tr>
                                  <th className="px-4 py-3 cursor-pointer hover:bg-slate-700" onClick={() => handleSort('teamAbbr')}><div className="flex items-center gap-1">Team <ArrowUpDown size={10} className="opacity-30"/></div></th>
                                  <th className="px-4 py-3 cursor-pointer hover:bg-slate-700" onClick={() => handleSort('firstName')}><div className="flex items-center gap-1">Wrestler <ArrowUpDown size={10} className="opacity-30"/></div></th>
                                  <th className="px-4 py-3 cursor-pointer hover:bg-slate-700" onClick={() => handleSort('age')}><div className="flex items-center gap-1">Age <ArrowUpDown size={10} className="opacity-30"/></div></th>
                                  <th className="px-4 py-3 text-center cursor-pointer hover:bg-slate-700" onClick={() => handleSort('matchCount')}><div className="flex justify-center items-center gap-1">Matches <ArrowUpDown size={10} className="opacity-30"/></div></th>
                                  <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                              {filteredWrestlers.map(w => (
                                  <tr key={w.id} className="hover:bg-slate-800/50 transition-colors group">
                                      <td className="px-4 py-2 font-mono text-xs text-slate-400">{w.teamAbbr}</td>
                                      <td className="px-4 py-2">
                                          <span className="font-bold text-white">{w.firstName} {w.lastName}</span>
                                      </td>
                                      <td className="px-4 py-2 font-mono">{w.age}</td>
                                      <td className="px-4 py-2 text-center">
                                          <div className={`inline-flex items-center justify-center w-6 h-6 rounded font-bold text-xs ${
                                              w.matchCount === 0 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                                          }`}>
                                              {w.matchCount}
                                          </div>
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                          <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                              <button onClick={() => setViewingInfoWrestler(w)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Info"><Info size={16}/></button>
                                              <button onClick={() => { setSelectedWrestler(w); setShowViewModal(true); }} className="p-1.5 hover:bg-slate-700 rounded text-blue-400" title="View Matches"><Eye size={16}/></button>
                                              <button onClick={() => { setSelectedWrestler(w); setShowAddModal(true); }} className="p-1.5 hover:bg-slate-700 rounded text-green-400" title="Add Match"><Plus size={16}/></button>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Step4_Matchmaking;