import React, { useState, useMemo, useEffect } from 'react';
import { 
  Swords, 
  RefreshCw, 
  Trophy, 
  Scale, 
  Users,
  AlertTriangle,
  ArrowUpDown,
  Search,
  Eye,
  Plus,
  Filter,
  X,
  Zap,
  Trash2,
  CheckCircle,
  XCircle,
  Star,
  CalendarClock,
  UserPlus
} from 'lucide-react';
import { Button, Card } from '../utils';
import { getPlayerValidationIssues, createPlayer } from '../models';

// --- HELPERS ---

const calculateAge = (dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    if (isNaN(birthDate)) return '';
    const today = new Date();
    // Calculate precise age with decimal
    const diffTime = Math.abs(today - birthDate);
    const age = diffTime / (1000 * 60 * 60 * 24 * 365.25); 
    return age.toFixed(1);
};

// --- SCORING & QUALITY VISUALIZATION ---

// Returns { quality: 0-100, label: string, color: string }
const getMatchQuality = (penaltyScore) => {
    // Adjusted Mapping to account for higher potential scores with Age added
    // Formula: 100 - (score * 3.5) clamped at 0. Slightly more forgiving than *4.
    const percentage = Math.max(0, Math.min(100, 100 - (penaltyScore * 3.5))); 
    
    let label = 'Poor';
    let color = 'text-red-500';
    let bg = 'bg-red-500';

    if (percentage >= 90) {
        label = 'Perfect';
        color = 'text-emerald-400';
        bg = 'bg-emerald-500';
    } else if (percentage >= 75) {
        label = 'Good';
        color = 'text-blue-400';
        bg = 'bg-blue-500';
    } else if (percentage >= 50) {
        label = 'Fair';
        color = 'text-yellow-400';
        bg = 'bg-yellow-500';
    }

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
                <div 
                    className={`h-full ${bg} transition-all duration-500`} 
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

// Reusable logic for scoring a single match pair
const calculateMatchMetrics = (w1, w2, matchRules) => {
    const { 
        intraTeam, 
        mixedGender, 
        ageMode, 
        ageTolerance, 
        weightTolerance, 
        ratingTolerance, 
        lowRatingPairing 
    } = matchRules || {};

    let qualified = true;
    const reasons = [];

    // Gender
    if (mixedGender !== 'yes' && w1.gender !== w2.gender) {
        qualified = false;
        reasons.push('Gender');
    }

    // Team
    if (intraTeam !== 'yes' && w1.teamId === w2.teamId) {
        qualified = false;
        reasons.push('Same Team');
    }

    // Rating
    if (lowRatingPairing && (w1.rating === 0 || w2.rating === 0)) {
        if (w1.rating !== 0 || w2.rating !== 0) {
            qualified = false;
            reasons.push('Beginner Shield');
        }
    }
    const ratingDiff = Math.abs(w1.rating - w2.rating);
    if (ratingDiff > (ratingTolerance || 1.0)) {
        qualified = false;
        reasons.push(`Rating Diff (${ratingDiff})`);
    }

    // Weight
    const heavier = Math.max(w1.weight, w2.weight);
    const lighter = Math.min(w1.weight, w2.weight);
    const weightDiffPct = ((heavier - lighter) / lighter) * 100;
    if (weightDiffPct > (weightTolerance || 10)) {
        qualified = false;
        reasons.push(`Weight Diff (${weightDiffPct.toFixed(1)}%)`);
    }

    // Age Calculation
    let ageDiff = 0;
    if (w1.age !== '' && w2.age !== '') {
        ageDiff = Math.abs(parseFloat(w1.age) - parseFloat(w2.age));
    }

    // Age Constraints
    if (ageMode === 'division') {
        if (w1.division !== w2.division) {
            qualified = false;
            reasons.push('Division');
        }
    } else {
        if (ageDiff > (ageTolerance || 1.0)) {
            qualified = false;
            reasons.push(`Age Gap (${ageDiff.toFixed(1)})`);
        }
    }

    // --- SCORING FORMULA ---
    // Weight Diff % + (Rating Diff * 5) + (Age Diff * 3)
    const score = weightDiffPct + (ratingDiff * 5) + (ageDiff * 3);

    return { score, qualified, weightDiffPct, ratingDiff, ageDiff, reasons };
};

// --- MATCHMAKING ENGINE ---
const runMatchmaking = (event) => {
    const { participatingTeams, matchRules, eventParameters } = event;
    const { maxMatches } = eventParameters || { maxMatches: 3 };

    let allWrestlers = [];
    participatingTeams.forEach(t => {
        if(t.roster) {
            t.roster.forEach(w => {
                if (getPlayerValidationIssues(w).length > 0) return;
                allWrestlers.push({ 
                    ...w, 
                    teamId: t.id, 
                    teamName: t.name, 
                    teamAbbr: t.abbr,
                    age: calculateAge(w.dob)
                });
            });
        }
    });

    const candidates = [];
    const potentialMatchCounts = {}; 
    allWrestlers.forEach(w => potentialMatchCounts[w.id] = 0);

    for (let i = 0; i < allWrestlers.length; i++) {
        for (let j = i + 1; j < allWrestlers.length; j++) {
            const w1 = allWrestlers[i];
            const w2 = allWrestlers[j];
            
            const metrics = calculateMatchMetrics(w1, w2, matchRules);

            if (metrics.qualified) {
                candidates.push({
                    id: `${w1.id}-${w2.id}`,
                    w1,
                    w2,
                    qualityScore: metrics.score,
                    weightDiffPct: metrics.weightDiffPct,
                    ratingDiff: metrics.ratingDiff,
                    ageDiff: metrics.ageDiff // Store for stats
                });
                potentialMatchCounts[w1.id]++;
                potentialMatchCounts[w2.id]++;
            }
        }
    }

    candidates.forEach(c => {
        const w1Opts = potentialMatchCounts[c.w1.id];
        const w2Opts = potentialMatchCounts[c.w2.id];
        c.scarcityScore = Math.min(w1Opts, w2Opts);

        let priorityBonus = 0;
        if (c.scarcityScore <= 1) priorityBonus = -2000;
        else if (c.scarcityScore <= 2) priorityBonus = -1000;
        else if (c.scarcityScore <= 3) priorityBonus = -500;
        
        c.finalSortScore = c.qualityScore + priorityBonus;
    });

    candidates.sort((a, b) => a.finalSortScore - b.finalSortScore);

    const matches = [];
    const matchCounts = {}; 
    allWrestlers.forEach(w => matchCounts[w.id] = 0);

    for (const match of candidates) {
        const c1 = matchCounts[match.w1.id];
        const c2 = matchCounts[match.w2.id];

        if (c1 < maxMatches && c2 < maxMatches) {
            matches.push(match);
            matchCounts[match.w1.id]++;
            matchCounts[match.w2.id]++;
        }
    }

    const wrestlerStats = allWrestlers.map(w => ({
        ...w,
        matchCount: matchCounts[w.id] || 0,
        potentialMatches: potentialMatchCounts[w.id] || 0
    }));

    return { matches, wrestlerStats, totalWrestlers: allWrestlers.length };
};

// --- SUB-COMPONENTS ---

const WrestlerHeader = ({ wrestler }) => (
    <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
        <div>
            <h3 className="text-xl font-bold text-white">{wrestler.lastName}, {wrestler.firstName}</h3>
            <p className="text-sm text-slate-400">{wrestler.teamName}</p>
        </div>
        <div className="flex gap-4 text-xs font-mono text-slate-300">
            <div className="flex flex-col items-end">
                <span className="text-slate-500 uppercase text-[10px]">Age</span>
                <span className="font-bold">{wrestler.age}</span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-slate-500 uppercase text-[10px]">Weight</span>
                <span className="font-bold">{wrestler.weight}</span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-slate-500 uppercase text-[10px]">Rating</span>
                <span className="font-bold">{wrestler.rating}</span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-slate-500 uppercase text-[10px]">Gender</span>
                <span className="font-bold">{wrestler.gender}</span>
            </div>
        </div>
    </div>
);

const ViewMatchesModal = ({ wrestler, matches, onClose, onRemoveMatch }) => {
    const [sortConfig, setSortConfig] = useState({ key: 'lastName', direction: 'asc' });

    const sortedMatches = useMemo(() => {
        const list = matches.filter(m => m.w1.id === wrestler.id || m.w2.id === wrestler.id);
        
        list.sort((a, b) => {
            const wA = a.w1.id === wrestler.id ? a.w2 : a.w1;
            const wB = b.w1.id === wrestler.id ? b.w2 : b.w1;
            
            let valA, valB;
            if (sortConfig.key === 'score') {
                valA = a.qualityScore;
                valB = b.qualityScore;
            } else {
                valA = wA[sortConfig.key];
                valB = wB[sortConfig.key];
            }

            if (valA === undefined || valA === null) valA = '';
            if (valB === undefined || valB === null) valB = '';

            const isNumeric = typeof valA === 'number' && typeof valB === 'number';
            if (isNumeric) {
                return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }
            return sortConfig.direction === 'asc' 
                ? String(valA).localeCompare(String(valB)) 
                : String(valB).localeCompare(String(valA));
        });
        return list;
    }, [matches, wrestler, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center p-4 border-b border-slate-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Eye size={20} className="text-blue-400"/> Scheduled Matches
                    </h3>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white" /></button>
                </div>
                
                <WrestlerHeader wrestler={wrestler} />

                <div className="flex-1 overflow-y-auto p-0">
                    {sortedMatches.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">No matches scheduled for this wrestler.</div>
                    ) : (
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-800 text-slate-400 uppercase font-bold text-xs sticky top-0">
                                <tr>
                                    {[
                                        { k: 'lastName', l: 'Opponent' },
                                        { k: 'teamAbbr', l: 'Team' },
                                        { k: 'age', l: 'Age' },
                                        { k: 'weight', l: 'Weight' },
                                        { k: 'rating', l: 'Rating' },
                                        { k: 'gender', l: 'Gender' },
                                        { k: 'score', l: 'Match Quality' }, // Renamed Header
                                        { k: 'actions', l: 'Action' }
                                    ].map(col => (
                                        <th 
                                            key={col.k} 
                                            className={`px-4 py-3 cursor-pointer hover:text-white hover:bg-slate-700 ${col.k === 'actions' ? 'text-right' : ''}`}
                                            onClick={() => col.k !== 'actions' && handleSort(col.k)}
                                        >
                                            <div className={`flex items-center gap-1 ${col.k === 'actions' ? 'justify-end' : ''}`}>
                                                {col.l}
                                                {col.k !== 'actions' && <ArrowUpDown size={10} className={`opacity-50 ${sortConfig.key === col.k ? 'text-blue-400 opacity-100' : ''}`}/>}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {sortedMatches.map(m => {
                                    const opp = m.w1.id === wrestler.id ? m.w2 : m.w1;
                                    return (
                                        <tr key={m.id} className="hover:bg-slate-800/50">
                                            <td className="px-4 py-3 font-bold text-white">{opp.lastName}, {opp.firstName}</td>
                                            <td className="px-4 py-3 text-xs">{opp.teamAbbr}</td>
                                            <td className="px-4 py-3 font-mono">{opp.age}</td>
                                            <td className="px-4 py-3 font-mono">{opp.weight}</td>
                                            <td className="px-4 py-3 font-mono">{opp.rating}</td>
                                            <td className="px-4 py-3">{opp.gender}</td>
                                            <td className="px-4 py-3">
                                                <MatchQualityBadge score={m.qualityScore} />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    onClick={() => onRemoveMatch(m.id)}
                                                    className="text-red-400 hover:bg-red-950/30 h-8 px-2"
                                                >
                                                    <Trash2 size={16} /> Remove
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

const AddMatchModal = ({ wrestler, allWrestlers, currentMatches, matchRules, onClose, onAddMatch }) => {
    const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'asc' });
    const [filter, setFilter] = useState('');

    const matchCounts = useMemo(() => {
        const counts = {};
        allWrestlers.forEach(w => counts[w.id] = 0);
        currentMatches.forEach(m => {
            if (counts[m.w1.id] !== undefined) counts[m.w1.id]++;
            if (counts[m.w2.id] !== undefined) counts[m.w2.id]++;
        });
        return counts;
    }, [allWrestlers, currentMatches]);

    const candidates = useMemo(() => {
        return allWrestlers
            .filter(w => w.id !== wrestler.id)
            .map(opp => {
                const metrics = calculateMatchMetrics(wrestler, opp, matchRules);
                return {
                    ...opp,
                    ...metrics,
                    currentMatchCount: matchCounts[opp.id] || 0
                };
            });
    }, [allWrestlers, wrestler, matchRules, matchCounts]);

    const filteredAndSortedCandidates = useMemo(() => {
        let list = candidates.filter(c => 
            c.lastName.toLowerCase().includes(filter.toLowerCase()) || 
            c.teamAbbr.toLowerCase().includes(filter.toLowerCase())
        );

        list.sort((a, b) => {
            if (a.qualified && !b.qualified) return -1;
            if (!a.qualified && b.qualified) return 1;

            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            if (valA === undefined || valA === null) valA = '';
            if (valB === undefined || valB === null) valB = '';

            const isNumeric = typeof valA === 'number' && typeof valB === 'number';
            if (isNumeric) {
                return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }
            return sortConfig.direction === 'asc' 
                ? String(valA).localeCompare(String(valB)) 
                : String(valB).localeCompare(String(valA));
        });

        return list;
    }, [candidates, filter, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-slate-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Plus size={20} className="text-green-400"/> Add Match
                    </h3>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white" /></button>
                </div>

                <WrestlerHeader wrestler={wrestler} />

                <div className="p-3 border-b border-slate-700 bg-slate-900/50">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                        <input 
                            className="w-full bg-slate-950 border border-slate-700 rounded py-2 pl-10 pr-4 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="Search opponents by name or team..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-0">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-800 text-slate-400 uppercase font-bold text-xs sticky top-0 z-10">
                            <tr>
                                {[
                                    { k: 'qualified', l: 'OK', w: 'w-10 text-center' },
                                    { k: 'lastName', l: 'Opponent' },
                                    { k: 'teamAbbr', l: 'Team' },
                                    { k: 'age', l: 'Age' },
                                    { k: 'weight', l: 'Weight' },
                                    { k: 'rating', l: 'Rating' },
                                    { k: 'gender', l: 'Gender' },
                                    { k: 'currentMatchCount', l: 'Matches' },
                                    { k: 'score', l: 'Match Quality' }, 
                                    { k: 'actions', l: 'Action', w: 'text-right' }
                                ].map(col => (
                                    <th 
                                        key={col.k} 
                                        className={`px-4 py-3 cursor-pointer hover:text-white hover:bg-slate-700 ${col.w || ''}`}
                                        onClick={() => col.k !== 'actions' && handleSort(col.k)}
                                    >
                                        <div className={`flex items-center gap-1 ${col.k === 'actions' ? 'justify-end' : col.k === 'qualified' ? 'justify-center' : ''}`}>
                                            {col.l}
                                            {col.k !== 'actions' && <ArrowUpDown size={10} className={`opacity-50 ${sortConfig.key === col.k ? 'text-blue-400 opacity-100' : ''}`}/>}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredAndSortedCandidates.map(opp => (
                                <tr key={opp.id} className={`hover:bg-slate-800/50 ${!opp.qualified ? 'opacity-50' : ''}`}>
                                    <td className="px-4 py-3 text-center">
                                        {opp.qualified ? (
                                            <CheckCircle size={16} className="text-green-500 inline" />
                                        ) : (
                                            <div className="group relative inline-block">
                                                <XCircle size={16} className="text-red-500 inline cursor-help" />
                                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-32 p-2 bg-black border border-red-500 rounded text-[10px] text-red-200 hidden group-hover:block z-50">
                                                    {opp.reasons?.join(', ')}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-white">{opp.lastName}, {opp.firstName}</td>
                                    <td className="px-4 py-3 text-xs">{opp.teamAbbr}</td>
                                    <td className="px-4 py-3 font-mono">{opp.age}</td>
                                    <td className="px-4 py-3 font-mono">{opp.weight}</td>
                                    <td className="px-4 py-3 font-mono">{opp.rating}</td>
                                    <td className="px-4 py-3">{opp.gender}</td>
                                    <td className="px-4 py-3 font-mono text-white">{opp.currentMatchCount}</td>
                                    <td className="px-4 py-3">
                                        <MatchQualityBadge score={opp.score} />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => onAddMatch(wrestler, opp, opp.score)}
                                            className="text-green-400 hover:bg-green-900/30 h-8 px-3 border border-green-900/50"
                                        >
                                            <Plus size={16} className="mr-1" /> Add
                                        </Button>
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

// --- ADD WRESTLER MODAL ---
const AddWrestlerModal = ({ teams, onClose, onSave }) => {
    const [form, setForm] = useState({
        teamId: teams.length > 0 ? teams[0].id : '',
        firstName: '',
        lastName: '',
        dob: '',
        weight: '',
        rating: '0',
        gender: 'M',
        division: 'Varsity'
    });

    const handleSave = () => {
        if (!form.firstName || !form.lastName || !form.dob || !form.weight) {
            alert("Please fill in all required fields.");
            return;
        }
        onSave(form);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl">
                <div className="p-4 border-b border-slate-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <UserPlus size={20} className="text-blue-400"/> Add Late Entry
                    </h3>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">Team</label>
                        <select 
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500"
                            value={form.teamId}
                            onChange={e => setForm({...form, teamId: e.target.value})}
                        >
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">First Name</label>
                            <input className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Last Name</label>
                            <input className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Date of Birth</label>
                            <input type="date" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Weight</label>
                            <input type="number" step="0.1" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Rating (0-5)</label>
                            <input type="number" min="0" max="5" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500" value={form.rating} onChange={e => setForm({...form, rating: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Gender</label>
                            <select className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Division</label>
                            <input className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500" value={form.division} onChange={e => setForm({...form, division: e.target.value})} />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Add Wrestler</Button>
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

  // MODAL STATE
  const [selectedWrestler, setSelectedWrestler] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddWrestlerModal, setShowAddWrestlerModal] = useState(false);

  useEffect(() => {
      if (event.matchups && (!results || !results.matches)) {
          const output = runMatchmaking(event);
          setResults(output);
      } else if (!event.matchups && results) {
          setResults(null);
      } else if (event.matchups && results && (!results.wrestlerStats || results.wrestlerStats.length === 0)) {
           const output = runMatchmaking(event);
           setResults(output);
      }
  }, [event.matchups]); 
  
  const handleRun = () => {
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

  // --- ACTIONS ---
  const handleRemoveMatch = (matchId) => {
      if(!confirm("Are you sure you want to remove this match?")) return;
      const newMatches = results.matches.filter(m => m.id !== matchId);
      
      const newCounts = {};
      results.wrestlerStats.forEach(w => newCounts[w.id] = 0);
      newMatches.forEach(m => {
          if(newCounts[m.w1.id] !== undefined) newCounts[m.w1.id]++;
          if(newCounts[m.w2.id] !== undefined) newCounts[m.w2.id]++;
      });

      const newStats = results.wrestlerStats.map(w => ({
          ...w,
          matchCount: newCounts[w.id] || 0
      }));

      const newResults = { matches: newMatches, wrestlerStats: newStats, totalWrestlers: results.totalWrestlers };
      setResults(newResults);
      onUpdate(event.id, { matchups: newMatches });
  };

  const handleAddMatch = (w1, w2, score) => {
      const newMatch = {
          id: `${w1.id}-${w2.id}-${Date.now()}`,
          w1: w1,
          w2: w2,
          qualityScore: score,
          weightDiffPct: 0, 
          ratingDiff: Math.abs(w1.rating - w2.rating)
      };

      const newMatches = [...results.matches, newMatch];
      
      const newCounts = {};
      results.wrestlerStats.forEach(w => newCounts[w.id] = 0);
      newMatches.forEach(m => {
          if(newCounts[m.w1.id] !== undefined) newCounts[m.w1.id]++;
          if(newCounts[m.w2.id] !== undefined) newCounts[m.w2.id]++;
      });

      const newStats = results.wrestlerStats.map(w => ({
          ...w,
          matchCount: newCounts[w.id] || 0
      }));

      const newResults = { matches: newMatches, wrestlerStats: newStats, totalWrestlers: results.totalWrestlers };
      setResults(newResults);
      onUpdate(event.id, { matchups: newMatches });
      
      setShowAddModal(false);
  };

  const handleAddWrestler = (data) => {
      // 1. Create New Wrestler Object
      const newPlayer = createPlayer(data.firstName, data.lastName);
      newPlayer.dob = data.dob;
      newPlayer.weight = parseFloat(data.weight);
      newPlayer.rating = parseInt(data.rating);
      newPlayer.gender = data.gender;
      newPlayer.division = data.division;

      // 2. Update Event Data (Persistence)
      const updatedTeams = event.participatingTeams.map(t => {
          if (t.id === data.teamId) {
              return { ...t, roster: [...t.roster, newPlayer] };
          }
          return t;
      });
      onUpdate(event.id, { participatingTeams: updatedTeams });

      // 3. Update Local Results (Optimistic UI Update)
      // We do NOT want to re-run matchmaking, just add the wrestler to stats with 0 matches
      if (results) {
          const targetTeam = event.participatingTeams.find(t => t.id === data.teamId);
          const newStat = {
              ...newPlayer,
              teamId: targetTeam.id,
              teamName: targetTeam.name,
              teamAbbr: targetTeam.abbr,
              age: calculateAge(newPlayer.dob),
              matchCount: 0,
              potentialMatches: 0 // Placeholder, strictly doesn't matter for display
          };

          setResults(prev => ({
              ...prev,
              wrestlerStats: [...prev.wrestlerStats, newStat],
              totalWrestlers: prev.totalWrestlers + 1
          }));
      }

      setShowAddWrestlerModal(false);
  };

  const summaryStats = useMemo(() => {
      if (!results || !results.wrestlerStats) return [];
      const teamMap = {}; 
      results.wrestlerStats.forEach(w => {
          if (!teamMap[w.teamName]) {
              teamMap[w.teamName] = { 
                  id: w.teamId,
                  name: w.teamName, 
                  abbr: w.teamAbbr, 
                  counts: { 0:0, 1:0, 2:0, 3:0 } 
              };
          }
          const count = Math.min(w.matchCount, 3); 
          teamMap[w.teamName].counts[count]++;
      });
      return Object.values(teamMap);
  }, [results]);

  const filteredWrestlers = useMemo(() => {
      if (!results || !results.wrestlerStats) return [];
      let data = [...results.wrestlerStats];
      if (teamFilter !== 'All') {
          data = data.filter(w => w.teamId === teamFilter);
      }
      data.sort((a, b) => {
          let aVal = a[sortConfig.key];
          let bVal = b[sortConfig.key];
          if (aVal === undefined || aVal === null) aVal = '';
          if (bVal === undefined || bVal === null) bVal = '';
          const isNumeric = typeof aVal === 'number' && typeof bVal === 'number';
          if (isNumeric) {
              if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
              if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          }
          const aStr = String(aVal).toLowerCase();
          const bStr = String(bVal).toLowerCase();
          if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
      return data;
  }, [results, teamFilter, sortConfig]);

  const handleSort = (key) => {
      let direction = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 flex flex-col">
      
      {/* MODALS */}
      {showViewModal && selectedWrestler && (
          <ViewMatchesModal 
              wrestler={selectedWrestler} 
              matches={results.matches} 
              onClose={() => setShowViewModal(false)}
              onRemoveMatch={handleRemoveMatch}
          />
      )}
      {showAddModal && selectedWrestler && (
          <AddMatchModal 
              wrestler={selectedWrestler}
              allWrestlers={results.wrestlerStats}
              currentMatches={results.matches}
              matchRules={event.matchRules}
              onClose={() => setShowAddModal(false)}
              onAddMatch={handleAddMatch}
          />
      )}
      {showAddWrestlerModal && (
          <AddWrestlerModal 
              teams={event.participatingTeams}
              onClose={() => setShowAddWrestlerModal(false)}
              onSave={handleAddWrestler}
          />
      )}

      {/* Header Area */}
      <div className="flex justify-between items-end shrink-0 mb-2">
        <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Swords className="text-blue-500" /> Matchmaking Engine
            </h2>
            <p className="text-slate-400 mt-1 text-sm flex items-center gap-2">
                <Zap size={14} className="text-yellow-400"/>
                Algorithm optimizes for maximum participation first, then match quality.
            </p>
        </div>
        <div className="flex gap-3">
            {results && (
                <>
                    <Button 
                        variant="secondary"
                        onClick={() => setShowAddWrestlerModal(true)} 
                        className="bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700"
                    >
                        <UserPlus size={16} className="mr-2"/> Add Late Entry
                    </Button>
                    <Button variant="ghost" onClick={handleClear} className="text-red-400 hover:bg-red-950/30">
                        Clear Results
                    </Button>
                </>
            )}
            <Button onClick={handleRun} disabled={isRunning} className="w-40 justify-center shadow-lg shadow-blue-900/20">
                {isRunning ? (
                    <span className="flex items-center gap-2"><RefreshCw className="animate-spin" size={16}/> Processing...</span>
                ) : (
                    <span className="flex items-center gap-2"><Swords size={16}/> Run Optimizer</span>
                )}
            </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl flex flex-col relative min-h-[500px]">
          
          {!results ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 py-20">
                  <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
                      <Swords size={48} className="opacity-20" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-300 mb-2">Ready to Pair</h3>
                  <p className="max-w-md text-center text-sm">
                      The engine will analyze rosters from <strong>{event.participatingTeams?.length || 0} teams</strong> 
                      and generate optimal matchups based on your defined rules.
                  </p>
              </div>
          ) : (
              <div className="flex flex-col h-full">
                  {/* Summary */}
                  <div className="p-4 bg-slate-950/50 border-b border-slate-800 shrink-0 overflow-x-auto rounded-t-xl">
                      <div className="flex justify-between items-center mb-3">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Match Distribution by Team</h3>
                          {teamFilter !== 'All' && (
                              <button onClick={() => setTeamFilter('All')} className="text-xs text-blue-400 flex items-center gap-1 hover:text-white">
                                  <X size={12}/> Clear Filter
                              </button>
                          )}
                      </div>
                      <div className="flex gap-4 min-w-max pb-2">
                          {summaryStats.map((stat, idx) => {
                              const total = Object.values(stat.counts).reduce((a,b) => a+b, 0);
                              const isSelected = teamFilter === stat.id;
                              return (
                                  <div key={idx} onClick={() => setTeamFilter(isSelected ? 'All' : stat.id)} className={`rounded-lg p-3 w-48 border transition-all cursor-pointer ${isSelected ? 'bg-blue-900/20 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-800/80'}`}>
                                      <div className="flex justify-between items-center mb-3">
                                          <span className="font-bold text-white text-sm truncate" title={stat.name}>{stat.abbr}</span>
                                          <span className="text-xs text-slate-500">{total} Wrestlers</span>
                                      </div>
                                      <div className="grid grid-cols-4 gap-1 text-center">
                                          {[0,1,2,3].map(n => (
                                              <div key={n} className="flex flex-col">
                                                  <span className={`text-lg font-bold leading-none ${stat.counts[n] > 0 ? (n===0?'text-red-400':n===1?'text-yellow-400':n===2?'text-blue-400':'text-green-400') : 'text-slate-600'}`}>{stat.counts[n]}</span>
                                                  <span className="text-[9px] text-slate-500 uppercase">{n}{n===3?'+':''}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>

                  {/* Table */}
                  <div className="flex-1 flex flex-col">
                      <div className="p-3 border-b border-slate-700 bg-slate-900 flex justify-between items-center gap-4 sticky top-0 z-20 shrink-0">
                          <div className="flex items-center gap-2">
                              <Filter size={16} className="text-slate-500"/>
                              <select className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
                                  <option value="All">All Teams</option>
                                  {event.participatingTeams?.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                              </select>
                          </div>
                          <div className="text-xs text-slate-500">Showing {filteredWrestlers.length} Wrestlers</div>
                      </div>
                      <div className="w-full">
                          <table className="w-full text-left text-sm text-slate-300">
                              <thead className="bg-slate-800 text-slate-400 uppercase font-bold text-xs sticky top-0 z-10 shadow-sm">
                                  <tr>
                                      {[{ k: 'teamAbbr', l: 'Team', w: 'w-16' }, { k: 'lastName', l: 'Wrestler Name' }, { k: 'age', l: 'Age' }, { k: 'weight', l: 'Weight' }, { k: 'rating', l: 'Rating' }, { k: 'gender', l: 'Gender' }, { k: 'matchCount', l: 'Matches', w: 'w-24 text-center' }, { k: 'actions', l: 'Actions', w: 'w-32 text-right' }].map(col => (
                                          <th key={col.k} className={`px-4 py-3 cursor-pointer hover:text-white hover:bg-slate-700 ${col.w || ''}`} onClick={() => col.k !== 'actions' && handleSort(col.k)}>
                                              <div className={`flex items-center gap-1 ${col.k === 'matchCount' ? 'justify-center' : col.k === 'actions' ? 'justify-end' : ''}`}>
                                                  {col.l}
                                                  {col.k !== 'actions' && <ArrowUpDown size={10} className={`opacity-50 ${sortConfig.key === col.k ? 'text-blue-400 opacity-100' : ''}`}/>}
                                              </div>
                                          </th>
                                      ))}
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800">
                                  {filteredWrestlers.map(w => (
                                      <tr key={w.id} className="hover:bg-slate-800/50 transition-colors group">
                                          <td className="px-4 py-2 font-mono text-xs text-slate-400">{w.teamAbbr}</td>
                                          <td className="px-4 py-2"><div className="font-bold text-white truncate max-w-[250px]">{w.lastName}, {w.firstName}</div></td>
                                          <td className="px-4 py-2 font-mono text-slate-400">{w.age}</td>
                                          <td className="px-4 py-2 font-mono text-slate-400">{w.weight}</td>
                                          <td className="px-4 py-2 font-mono text-slate-400">{w.rating}</td>
                                          <td className="px-4 py-2">{w.gender}</td>
                                          <td className="px-4 py-2 text-center">
                                              <div className={`inline-flex items-center justify-center w-8 h-6 rounded font-bold text-xs ${w.matchCount === 0 ? 'bg-red-900/30 text-red-400 border border-red-900/50' : w.matchCount === 1 ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-900/50' : w.matchCount === 2 ? 'bg-blue-900/30 text-blue-400 border border-blue-900/50' : 'bg-green-900/30 text-green-400 border border-green-900/50'}`}>
                                                  {w.matchCount}
                                              </div>
                                          </td>
                                          <td className="px-4 py-2 text-right">
                                              <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                  <button onClick={() => { setSelectedWrestler(w); setShowViewModal(true); }} className="p-1.5 hover:bg-slate-700 rounded text-blue-400" title="View Matches"><Eye size={16} /></button>
                                                  <button onClick={() => { setSelectedWrestler(w); setShowAddModal(true); }} className="p-1.5 hover:bg-slate-700 rounded text-green-400" title="Add Match"><Plus size={16} /></button>
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
    </div>
  );
};

export default Step4_Matchmaking;