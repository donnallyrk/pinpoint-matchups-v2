import React, { useState, useMemo } from 'react';
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
  X
} from 'lucide-react';
import { Button, Card } from '../utils';
import { getPlayerValidationIssues } from '../models';

// --- HELPERS ---

const calculateAge = (dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    if (isNaN(birthDate)) return '';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

// --- MATCHMAKING ENGINE (Heuristic) ---
const runMatchmaking = (event) => {
    const { participatingTeams, matchRules, eventParameters } = event;
    const { maxMatches } = eventParameters || { maxMatches: 3 };
    const { 
        intraTeam, 
        mixedGender, 
        ageMode, 
        ageTolerance, 
        weightTolerance, 
        ratingTolerance, 
        lowRatingPairing 
    } = matchRules || {};

    // 1. Flatten Roster & Calculate Age (AND FILTER INVALID)
    let allWrestlers = [];
    participatingTeams.forEach(t => {
        if(t.roster) {
            t.roster.forEach(w => {
                // Safety Check: Double check validity to prevent crashes
                // If a wrestler has ANY validation issues (like invalid DOB), skip them entirely.
                if (getPlayerValidationIssues(w).length > 0) return;

                allWrestlers.push({ 
                    ...w, 
                    teamId: t.id, 
                    teamName: t.name, 
                    teamAbbr: t.abbr,
                    age: calculateAge(w.dob) // Pre-calculate Age
                });
            });
        }
    });

    // 2. Generate Candidate Pairs
    const candidates = [];

    for (let i = 0; i < allWrestlers.length; i++) {
        for (let j = i + 1; j < allWrestlers.length; j++) {
            const w1 = allWrestlers[i];
            const w2 = allWrestlers[j];
            
            // --- HARD CONSTRAINTS (Filter) ---

            // Gender
            if (mixedGender !== 'yes' && w1.gender !== w2.gender) continue;

            // Team
            if (intraTeam !== 'yes' && w1.teamId === w2.teamId) continue;

            // Rating
            if (lowRatingPairing && (w1.rating === 0 || w2.rating === 0)) {
                if (w1.rating !== 0 || w2.rating !== 0) continue;
            }
            const ratingDiff = Math.abs(w1.rating - w2.rating);
            if (ratingDiff > (ratingTolerance || 1.0)) continue;

            // Weight Tolerance %
            const heavier = Math.max(w1.weight, w2.weight);
            const lighter = Math.min(w1.weight, w2.weight);
            const weightDiffPct = ((heavier - lighter) / lighter) * 100;
            if (weightDiffPct > (weightTolerance || 10)) continue;

            // Age/Division
            if (ageMode === 'division') {
                if (w1.division !== w2.division) continue;
            } else {
                // Use calculated age
                if (w1.age !== '' && w2.age !== '') {
                    const ageGap = Math.abs(w1.age - w2.age); 
                    if (ageGap > (ageTolerance || 1.0)) continue;
                }
            }

            // --- SCORING ---
            const score = weightDiffPct + (ratingDiff * 5); 

            candidates.push({
                id: `${w1.id}-${w2.id}`,
                w1,
                w2,
                score,
                weightDiffPct,
                ratingDiff
            });
        }
    }

    // 3. Selection (Greedy Algorithm)
    candidates.sort((a, b) => a.score - b.score);

    const matches = [];
    const matchCounts = {}; // { wrestlerId: count }

    // Init counts
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

    // Return detailed wrestler stats for the table
    const wrestlerStats = allWrestlers.map(w => ({
        ...w,
        matchCount: matchCounts[w.id] || 0
    }));

    return { matches, wrestlerStats, totalWrestlers: allWrestlers.length };
};


// --- COMPONENT ---
const Step4_Matchmaking = ({ event, onUpdate }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(event.matchups ? { matches: event.matchups, wrestlerStats: [] } : null); 
  
  // Local Table State
  const [sortConfig, setSortConfig] = useState({ key: 'matchCount', direction: 'asc' }); 
  const [teamFilter, setTeamFilter] = useState('All'); // 'All' or teamId

  // --- RE-HYDRATION LOGIC (Temporary Fix) ---
  if (event.matchups && (!results || !results.wrestlerStats || results.wrestlerStats.length === 0)) {
      const output = runMatchmaking(event);
      if(results?.matches?.length !== output.matches.length) {
          setResults(output);
      } else if (!results) {
          setResults(output);
      }
  }
  
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

  // --- DERIVED DATA FOR UI ---

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

      // FILTER
      if (teamFilter !== 'All') {
          data = data.filter(w => w.teamId === teamFilter);
      }

      // SORT (Fixed Error)
      data.sort((a, b) => {
          let aVal = a[sortConfig.key];
          let bVal = b[sortConfig.key];

          // Handle undefined/null safety
          if (aVal === undefined || aVal === null) aVal = '';
          if (bVal === undefined || bVal === null) bVal = '';

          // Check if numeric sort is needed
          const isNumeric = typeof aVal === 'number' && typeof bVal === 'number';
          
          if (isNumeric) {
              if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
              if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          }

          // String sort
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
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 h-full flex flex-col">
      
      {/* Header Area */}
      <div className="flex justify-between items-end shrink-0 mb-2">
        <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Swords className="text-blue-500" /> Matchmaking Engine
            </h2>
            <p className="text-slate-400 mt-1 text-sm">
                Algorithmically pair wrestlers based on your parameters.
            </p>
        </div>
        <div className="flex gap-3">
            {results && (
                <Button variant="ghost" onClick={handleClear} className="text-red-400 hover:bg-red-950/30">
                    Clear Results
                </Button>
            )}
            <Button onClick={handleRun} disabled={isRunning} className="w-40 justify-center shadow-lg shadow-blue-900/20">
                {isRunning ? (
                    <span className="flex items-center gap-2"><RefreshCw className="animate-spin" size={16}/> Processing...</span>
                ) : (
                    <span className="flex items-center gap-2"><Swords size={16}/> Run Auto-Pairing</span>
                )}
            </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex flex-col relative">
          
          {!results ? (
              // Empty State
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50">
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
              // Results View
              <div className="flex flex-col h-full overflow-hidden">
                  
                  {/* --- SUMMARY DASHBOARD (Interactive) --- */}
                  <div className="p-4 bg-slate-950/50 border-b border-slate-800 shrink-0 overflow-x-auto">
                      <div className="flex justify-between items-center mb-3">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Match Distribution by Team</h3>
                          {teamFilter !== 'All' && (
                              <button 
                                onClick={() => setTeamFilter('All')} 
                                className="text-xs text-blue-400 flex items-center gap-1 hover:text-white"
                              >
                                  <X size={12}/> Clear Filter
                              </button>
                          )}
                      </div>
                      <div className="flex gap-4 min-w-max pb-2">
                          {summaryStats.map((stat, idx) => {
                              const total = Object.values(stat.counts).reduce((a,b) => a+b, 0);
                              const isSelected = teamFilter === stat.id;
                              
                              return (
                                  <div 
                                    key={idx} 
                                    onClick={() => setTeamFilter(isSelected ? 'All' : stat.id)}
                                    className={`rounded-lg p-3 w-48 border transition-all cursor-pointer ${
                                        isSelected 
                                        ? 'bg-blue-900/20 border-blue-500 ring-1 ring-blue-500' 
                                        : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-800/80'
                                    }`}
                                  >
                                      <div className="flex justify-between items-center mb-3">
                                          <span className="font-bold text-white text-sm truncate" title={stat.name}>{stat.abbr}</span>
                                          <span className="text-xs text-slate-500">{total} Wrestlers</span>
                                      </div>
                                      
                                      {/* Broken Out Stats (Grid Layout) */}
                                      <div className="grid grid-cols-4 gap-1 text-center">
                                          <div className="flex flex-col">
                                              <span className={`text-lg font-bold leading-none ${stat.counts[0] > 0 ? 'text-red-400' : 'text-slate-600'}`}>{stat.counts[0]}</span>
                                              <span className="text-[9px] text-slate-500 uppercase">0</span>
                                          </div>
                                          <div className="flex flex-col">
                                              <span className={`text-lg font-bold leading-none ${stat.counts[1] > 0 ? 'text-yellow-400' : 'text-slate-600'}`}>{stat.counts[1]}</span>
                                              <span className="text-[9px] text-slate-500 uppercase">1</span>
                                          </div>
                                          <div className="flex flex-col">
                                              <span className={`text-lg font-bold leading-none ${stat.counts[2] > 0 ? 'text-blue-400' : 'text-slate-600'}`}>{stat.counts[2]}</span>
                                              <span className="text-[9px] text-slate-500 uppercase">2</span>
                                          </div>
                                          <div className="flex flex-col">
                                              <span className={`text-lg font-bold leading-none ${stat.counts[3] > 0 ? 'text-green-400' : 'text-slate-600'}`}>{stat.counts[3]}</span>
                                              <span className="text-[9px] text-slate-500 uppercase">3+</span>
                                          </div>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>

                  {/* --- WRESTLER TABLE --- */}
                  <div className="flex-1 flex flex-col min-h-0">
                      {/* Table Toolbar */}
                      <div className="p-3 border-b border-slate-700 bg-slate-900 flex justify-between items-center gap-4">
                          <div className="flex items-center gap-2">
                              <Filter size={16} className="text-slate-500"/>
                              <select 
                                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
                                  value={teamFilter}
                                  onChange={e => setTeamFilter(e.target.value)}
                              >
                                  <option value="All">All Teams</option>
                                  {event.participatingTeams?.map(t => (
                                      <option key={t.id} value={t.id}>{t.name}</option>
                                  ))}
                              </select>
                          </div>
                          <div className="text-xs text-slate-500">
                              Showing {filteredWrestlers.length} Wrestlers
                          </div>
                      </div>

                      {/* Scrollable Table */}
                      <div className="flex-1 overflow-y-auto">
                          <table className="w-full text-left text-sm text-slate-300">
                              <thead className="bg-slate-800 text-slate-400 uppercase font-bold text-xs sticky top-0 z-10 shadow-sm">
                                  <tr>
                                      {[
                                          { k: 'teamAbbr', l: 'Team', w: 'w-16' }, // Added Team Column
                                          { k: 'lastName', l: 'Wrestler Name' },
                                          { k: 'age', l: 'Age', w: 'w-16' },
                                          { k: 'weight', l: 'Weight', w: 'w-20' },
                                          { k: 'rating', l: 'Rating', w: 'w-16' },
                                          { k: 'gender', l: 'Gender', w: 'w-16' },
                                          { k: 'matchCount', l: 'Matches', w: 'w-24 text-center' },
                                          { k: 'actions', l: 'Actions', w: 'w-32 text-right' }
                                      ].map(col => (
                                          <th 
                                              key={col.k} 
                                              className={`px-4 py-3 cursor-pointer hover:text-white hover:bg-slate-700 ${col.w || ''}`}
                                              onClick={() => col.k !== 'actions' && handleSort(col.k)}
                                          >
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
                                          <td className="px-4 py-2">
                                              <div className="font-bold text-white">{w.lastName}, {w.firstName}</div>
                                          </td>
                                          <td className="px-4 py-2 font-mono text-slate-400">{w.age}</td>
                                          <td className="px-4 py-2 font-mono text-slate-400">{w.weight}</td>
                                          <td className="px-4 py-2 font-mono text-slate-400">{w.rating}</td>
                                          <td className="px-4 py-2">{w.gender}</td>
                                          
                                          {/* Match Count Badge */}
                                          <td className="px-4 py-2 text-center">
                                              <div className={`inline-flex items-center justify-center w-8 h-6 rounded font-bold text-xs ${
                                                  w.matchCount === 0 ? 'bg-red-900/30 text-red-400 border border-red-900/50' :
                                                  w.matchCount === 1 ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-900/50' :
                                                  w.matchCount === 2 ? 'bg-blue-900/30 text-blue-400 border border-blue-900/50' :
                                                  'bg-green-900/30 text-green-400 border border-green-900/50'
                                              }`}>
                                                  {w.matchCount}
                                              </div>
                                          </td>

                                          <td className="px-4 py-2 text-right">
                                              <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                  <button className="p-1.5 hover:bg-slate-700 rounded text-blue-400" title="View Matches">
                                                      <Eye size={16} />
                                                  </button>
                                                  <button className="p-1.5 hover:bg-slate-700 rounded text-green-400" title="Add Match">
                                                      <Plus size={16} />
                                                  </button>
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