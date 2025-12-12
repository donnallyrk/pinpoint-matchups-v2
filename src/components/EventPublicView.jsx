import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Search, 
  Filter, 
  LayoutGrid, 
  Users, 
  X,
  Trophy,
  ArrowRight,
  LogOut,
  Check,
  List, // For Table View Toggle
  Grid, // For Card View Toggle
  Star  // For Highlight Indicator
} from 'lucide-react';
import { formatDate } from '../utils';

// Helper for consistent team colors
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

const getTeamColorClass = (teamName) => {
    const colors = [
        'bg-blue-500', 'bg-red-500', 'bg-green-500', 
        'bg-yellow-500', 'bg-purple-500', 'bg-pink-500',
        'bg-indigo-500', 'bg-orange-500'
    ];
    let hash = 0;
    for (let i = 0; i < teamName.length; i++) {
        hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const CompactMatchCard = ({ match, isHighlighted, onClick }) => (
    <div 
        onClick={onClick}
        className={`bg-slate-900 border rounded p-2 mb-2 relative overflow-hidden transition-all cursor-pointer ${
            isHighlighted 
            ? 'border-yellow-400 ring-2 ring-yellow-400/50 shadow-lg shadow-yellow-900/20 scale-[1.02] z-10' 
            : match.isCompleted 
                ? 'border-slate-800 opacity-60' 
                : 'border-slate-800 hover:border-blue-500/50'
        }`}
    >
        <div className="flex justify-between items-center mb-1 text-[10px] font-mono text-slate-500 border-b border-slate-800/50 pb-1">
            <span className={`font-bold ${isHighlighted ? 'text-yellow-400' : ''}`}>
                {isHighlighted && <Star size={10} className="inline mr-1 fill-yellow-400 text-yellow-400"/>}
                Match #{match.boutNumber}
            </span>
            {match.isCompleted && <Trophy size={10} className="text-green-500"/>}
        </div>
        
        {/* Side-by-Side Layout */}
        <div className="flex items-center gap-2">
            {/* Wrestler 1 */}
            <div className={`flex-1 min-w-0 border-l-2 pl-1.5 ${getTeamColor(match.w1.teamName)}`}>
                <div className={`text-[11px] font-bold truncate leading-tight ${isHighlighted ? 'text-white' : 'text-white'}`}>
                    {match.w1.firstName} {match.w1.lastName}
                </div>
                <div className="text-[9px] text-slate-400 truncate">{match.w1.teamName}</div>
            </div>

            <div className="text-[9px] font-bold text-slate-600">VS</div>

            {/* Wrestler 2 */}
            <div className={`flex-1 min-w-0 border-r-2 pr-1.5 text-right ${getTeamColor(match.w2.teamName)}`}>
                <div className={`text-[11px] font-bold truncate leading-tight ${isHighlighted ? 'text-white' : 'text-white'}`}>
                    {match.w2.firstName} {match.w2.lastName}
                </div>
                <div className="text-[9px] text-slate-400 truncate">{match.w2.teamName}</div>
            </div>
        </div>
    </div>
);

const EventPublicView = ({ event, hostName, onBack, user }) => { // Added 'user' prop
  const [viewMode, setViewMode] = useState('by_mat'); // 'by_mat' | 'by_team'
  const [matDisplayMode, setMatDisplayMode] = useState('cards'); // 'cards' | 'table'
  const [filterTeam, setFilterTeam] = useState('All');
  const [search, setSearch] = useState('');
  const [highlightedMatches, setHighlightedMatches] = useState(new Set()); // UPDATED: Set for multiple highlights
  
  // Multi-select for Mats
  const matsAvailable = parseInt(event.eventParameters?.mats || 3);
  const [selectedMats, setSelectedMats] = useState(() => {
      const initial = {};
      for(let i=1; i<=matsAvailable; i++) initial[i] = true;
      return initial;
  });

  const schedule = event.sequencing || event.matchups || [];
  const teams = useMemo(() => event.participatingTeams ? event.participatingTeams.map(t => t.name).sort() : [], [event.participatingTeams]);

  // Toggle Mat Selection
  const toggleMat = (matId) => {
      setSelectedMats(prev => ({
          ...prev,
          [matId]: !prev[matId]
      }));
  };

  const selectAllMats = () => {
      const all = {};
      for(let i=1; i<=matsAvailable; i++) all[i] = true;
      setSelectedMats(all);
  };

  const deselectAllMats = () => {
      const none = {};
      for(let i=1; i<=matsAvailable; i++) none[i] = false;
      setSelectedMats(none);
  };

  const handleMatchClick = (matchId) => {
      setHighlightedMatches(prev => {
          const newSet = new Set(prev);
          if (newSet.has(matchId)) {
              newSet.delete(matchId);
          } else {
              newSet.add(matchId);
          }
          return newSet;
      });
  };

  // --- DATA PROCESSING ---
  const processedData = useMemo(() => {
    let data = [...schedule];

    // Filter
    if (filterTeam !== 'All') data = data.filter(m => m.w1.teamName === filterTeam || m.w2.teamName === filterTeam);
    if (search) {
        const lower = search.toLowerCase();
        data = data.filter(m => 
            m.w1.firstName.toLowerCase().includes(lower) || m.w1.lastName.toLowerCase().includes(lower) ||
            m.w2.firstName.toLowerCase().includes(lower) || m.w2.lastName.toLowerCase().includes(lower)
        );
    }

    // Sort based on view
    if (viewMode === 'by_mat') {
        // Just sort by bout number since we group by mat in the UI
        return data.sort((a,b) => a.boutNumber - b.boutNumber);
    } else {
        // Flatten for table view: We need rows for each wrestler
        const rows = [];
        data.forEach(m => {
            rows.push({ uniqueId: `${m.id}-w1`, team: m.w1.teamName, wrestlerName: `${m.w1.firstName} ${m.w1.lastName}`, matId: m.matId, boutNumber: m.boutNumber, oppTeam: m.w2.teamName, oppName: `${m.w2.firstName} ${m.w2.lastName}`, matchId: m.id });
            rows.push({ uniqueId: `${m.id}-w2`, team: m.w2.teamName, wrestlerName: `${m.w2.firstName} ${m.w2.lastName}`, matId: m.matId, boutNumber: m.boutNumber, oppTeam: m.w1.teamName, oppName: `${m.w1.firstName} ${m.w1.lastName}`, matchId: m.id });
        });
        
        // Filter flattened rows
        let filteredRows = rows;
        if (filterTeam !== 'All') filteredRows = filteredRows.filter(r => r.team === filterTeam);
        if (search) filteredRows = filteredRows.filter(r => r.wrestlerName.toLowerCase().includes(search.toLowerCase()));

        return filteredRows.sort((a,b) => {
            // Sort by: Wrestler Name (Alpha) -> Match # -> Mat #
            const nameCompare = a.wrestlerName.localeCompare(b.wrestlerName);
            if (nameCompare !== 0) return nameCompare;
            
            const boutCompare = a.boutNumber - b.boutNumber;
            if (boutCompare !== 0) return boutCompare;
            
            return a.matId - b.matId;
        });
    }
  }, [schedule, filterTeam, search, viewMode]);

  // Grouping for Mat View
  const matchesByMat = useMemo(() => {
      const groups = {};
      // Initialize groups only for SELECTED mats
      for(let i=1; i<=matsAvailable; i++) {
          if (selectedMats[i]) groups[i] = [];
      }
      
      if (viewMode === 'by_mat') {
          processedData.forEach(m => {
              if (selectedMats[m.matId]) {
                  groups[m.matId].push(m);
              }
          });
      }
      return groups;
  }, [processedData, matsAvailable, viewMode, selectedMats]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col selection:bg-blue-500/30">
      
      {/* --- UNIFIED HEADER (ONLY IF NOT LOGGED IN) --- */}
      {!user && (
        <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
                
                {/* Logo/Home Link */}
                <a href="/" className="flex items-center gap-3">
                <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-lg">
                    <Users className="text-white" size={20} />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden sm:block">
                    Pinpoint Matchups
                </span>
                </a>

                <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
                    <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">How it Works</a>
                    <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Pricing</a>
                </div>

                <button 
                    onClick={() => window.location.href = '/'} // Simple reset/login redirection
                    className="text-sm font-bold text-slate-300 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg border border-slate-700"
                >
                    Log In
                </button>
            </div>
            </div>
        </nav>
      )}

      {/* --- EVENT SUB-HEADER --- */}
      <div className="bg-slate-950 border-b border-slate-800 p-4">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Live Event
                        </span>
                        {hostName && <span className="text-xs text-slate-500">Hosted by {hostName}</span>}
                    </div>
                    <h1 className="text-2xl font-bold text-white leading-tight">{event.name}</h1>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-2">
                        <div className="flex items-center gap-1.5"><Calendar size={14} className="text-blue-500"/> {formatDate(event.date)}</div>
                        {(event.location && !event.isLocationTbd) && <div className="flex items-center gap-1.5"><MapPin size={14} className="text-blue-500"/> {event.location}</div>}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-2 w-full md:w-auto">
                    <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                        <button onClick={() => setViewMode('by_mat')} className={`flex-1 px-4 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${viewMode === 'by_mat' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                            <LayoutGrid size={14}/> By Mat
                        </button>
                        <button onClick={() => setViewMode('by_team')} className={`flex-1 px-4 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${viewMode === 'by_team' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                            <Users size={14}/> By Team
                        </button>
                    </div>
                    
                    <div className="flex gap-2">
                        {/* Only show Team Filter in 'By Team' mode or as a general filter if desired. Keeping it for both for flexibility. */}
                        <select 
                            value={filterTeam} 
                            onChange={(e) => setFilterTeam(e.target.value)}
                            className="bg-slate-900 border border-slate-800 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 flex-1 md:w-40"
                        >
                            <option value="All">All Teams</option>
                            {teams.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                            <input 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search wrestler..."
                                className="w-full bg-slate-900 border border-slate-800 text-white text-xs rounded-lg pl-9 pr-7 py-2 outline-none focus:border-blue-500"
                            />
                            {search && (
                                <button 
                                    onClick={() => setSearch('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* --- FILTER BAR (Mat View Only) --- */}
      {viewMode === 'by_mat' && (
          <div className="bg-slate-900/50 border-b border-slate-800 py-2 px-4">
              <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-bold text-slate-500 uppercase">Visible Mats:</span>
                      <div className="flex flex-wrap gap-1.5">
                          <button onClick={selectAllMats} className="px-2 py-1 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-colors">All</button>
                          <button onClick={deselectAllMats} className="px-2 py-1 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-colors">None</button>
                          <div className="w-px h-4 bg-slate-700 mx-1"></div>
                          {Array.from({length: matsAvailable}, (_, i) => i + 1).map(matId => (
                              <button
                                  key={matId}
                                  onClick={() => toggleMat(matId)}
                                  className={`px-3 py-1 rounded text-[10px] font-bold border transition-all ${
                                      selectedMats[matId] 
                                      ? 'bg-blue-600 border-blue-500 text-white shadow-sm' 
                                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                                  }`}
                              >
                                  Mat {matId}
                              </button>
                          ))}
                      </div>
                  </div>
                  {/* Mat View Toggle (Table/Card) */}
                  <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                      <button onClick={() => setMatDisplayMode('cards')} className={`p-1.5 rounded text-xs transition-colors ${matDisplayMode === 'cards' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`} title="Card View">
                          <Grid size={14}/>
                      </button>
                      <button onClick={() => setMatDisplayMode('table')} className={`p-1.5 rounded text-xs transition-colors ${matDisplayMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`} title="Table View">
                          <List size={14}/>
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- LEGEND (Mat View Only) --- */}
      {viewMode === 'by_mat' && (
          <div className="bg-slate-950 border-b border-slate-800 py-2 px-4 overflow-x-auto">
              <div className="max-w-7xl mx-auto flex items-center gap-4 min-w-max">
                  <span className="text-xs font-bold text-slate-500 uppercase">Teams:</span>
                  <div className="flex items-center gap-3">
                      {teams.map(teamName => (
                          <div key={teamName} className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${getTeamColorClass(teamName)}`}></div>
                              <span className="text-[10px] text-slate-400 font-medium">{teamName}</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 bg-slate-950 p-4 overflow-y-auto">
        <div className="max-w-7xl mx-auto h-full">
            
            {viewMode === 'by_mat' ? (
                /* --- MAT VIEW (COLUMNS) --- */
                <div className={`h-full ${matDisplayMode === 'table' ? 'overflow-y-auto' : 'flex gap-4 overflow-x-auto pb-4 snap-x'}`}>
                    {matDisplayMode === 'table' ? (
                        /* Mat Table View */
                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-300">
                                    <thead className="bg-slate-800 text-slate-400 uppercase font-bold text-xs sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3 w-20 text-center border-r border-slate-700">Mat</th>
                                            <th className="px-4 py-3 w-20 text-center border-r border-slate-700">Match</th>
                                            <th className="px-4 py-3 text-right w-1/3">Wrestler 1</th>
                                            <th className="px-4 py-3 text-center w-10 text-slate-600 font-bold">VS</th>
                                            <th className="px-4 py-3 text-left w-1/3">Wrestler 2</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {Object.keys(matchesByMat).sort((a,b) => a-b).flatMap(matId => 
                                            matchesByMat[matId].map(match => (
                                                <tr 
                                                    key={match.id} 
                                                    onClick={() => handleMatchClick(match.id)}
                                                    className={`transition-colors cursor-pointer ${
                                                        highlightedMatches.has(match.id)
                                                        ? 'bg-yellow-500/10 hover:bg-yellow-500/20 border-l-4 border-l-yellow-400' 
                                                        : 'hover:bg-slate-800/50'
                                                    }`}
                                                >
                                                    <td className="px-4 py-2 font-mono text-center text-blue-400 font-bold border-r border-slate-800">{match.matId}</td>
                                                    <td className="px-4 py-2 font-mono text-center border-r border-slate-800">
                                                        {highlightedMatches.has(match.id) && <Star size={10} className="inline mr-1 fill-yellow-400 text-yellow-400"/>}
                                                        {match.boutNumber}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        <div className="font-bold text-white">{match.w1.firstName} {match.w1.lastName}</div>
                                                        <div className="text-xs text-slate-500">{match.w1.teamName}</div>
                                                    </td>
                                                    <td className="px-4 py-2 text-center text-slate-600 font-bold text-xs">VS</td>
                                                    <td className="px-4 py-2 text-left">
                                                        <div className="font-bold text-white">{match.w2.firstName} {match.w2.lastName}</div>
                                                        <div className="text-xs text-slate-500">{match.w2.teamName}</div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                        {Object.keys(matchesByMat).every(key => matchesByMat[key].length === 0) && (
                                            <tr><td colSpan="5" className="p-8 text-center text-slate-500">No matches found matching filters.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        /* Mat Card View */
                        <>
                            {Object.keys(matchesByMat).map(matId => (
                                <div key={matId} className="min-w-[240px] flex-1 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col snap-start shrink-0">
                                    <div className="p-2 border-b border-slate-800 bg-slate-900 rounded-t-xl sticky top-0 z-10 flex justify-between items-center">
                                        <span className="font-bold text-white text-xs">Mat {matId}</span>
                                        <span className="text-[10px] text-slate-500 font-mono">{matchesByMat[matId].length} Matches</span>
                                    </div>
                                    <div className="p-2 overflow-y-auto flex-1 custom-scrollbar">
                                        {matchesByMat[matId].length === 0 ? (
                                            <div className="text-center py-8 text-slate-600 text-xs italic">No matches scheduled</div>
                                        ) : (
                                            matchesByMat[matId].map(match => (
                                                <CompactMatchCard 
                                                    key={match.id} 
                                                    match={match} 
                                                    isHighlighted={highlightedMatches.has(match.id)}
                                                    onClick={() => handleMatchClick(match.id)}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                            {Object.keys(matchesByMat).length === 0 && (
                                <div className="w-full flex items-center justify-center text-slate-500 italic text-sm">
                                    Select a mat to view matches.
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : (
                /* --- TEAM VIEW (TABLE) --- */
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
                    <div className="flex-1 overflow-auto relative">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-800 text-slate-400 uppercase font-bold text-xs sticky top-0 z-20 shadow-md">
                                <tr>
                                    <th className="px-4 py-3">Team</th>
                                    <th className="px-4 py-3">Wrestler</th>
                                    <th className="px-4 py-3 text-center">Mat</th>
                                    <th className="px-4 py-3 text-center">Match #</th>
                                    <th className="px-4 py-3">Opponent</th>
                                    <th className="px-4 py-3">Opponent Team</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {processedData.length === 0 ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-slate-500">No matches found.</td></tr>
                                ) : processedData.map(row => (
                                    <tr 
                                        key={row.uniqueId} 
                                        onClick={() => handleMatchClick(row.matchId)}
                                        className={`transition-colors cursor-pointer ${
                                            highlightedMatches.has(row.matchId) 
                                            ? 'bg-yellow-500/10 hover:bg-yellow-500/20 border-l-4 border-l-yellow-400' 
                                            : 'hover:bg-slate-800/50'
                                        }`}
                                    >
                                        <td className="px-4 py-2 font-medium text-slate-400">{row.team}</td>
                                        <td className="px-4 py-2 font-bold text-white">
                                            {highlightedMatches.has(row.matchId) && <Star size={10} className="inline mr-1 fill-yellow-400 text-yellow-400"/>}
                                            {row.wrestlerName}
                                        </td>
                                        <td className="px-4 py-2 font-mono text-center text-blue-400 font-bold">{row.matId}</td>
                                        <td className="px-4 py-2 font-mono text-center">{row.boutNumber}</td>
                                        <td className="px-4 py-2 text-slate-300">{row.oppName}</td>
                                        <td className="px-4 py-2 text-slate-500 text-xs">{row.oppTeam}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* --- UNIFIED FOOTER (Only for unauthenticated view to avoid double footer) --- */}
      {!user && (
        <footer className="border-t border-slate-800 bg-slate-900/50 py-8 mt-auto shrink-0">
            <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm gap-4">
                <p>&copy; {new Date().getFullYear()} Pinpoint Matchups. All rights reserved.</p>
                <div className="flex gap-6">
                    <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
                    <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
                    <a href="#" className="hover:text-slate-300 transition-colors">Contact Support</a>
                </div>
            </div>
        </footer>
      )}
    </div>
  );
};

export default EventPublicView;