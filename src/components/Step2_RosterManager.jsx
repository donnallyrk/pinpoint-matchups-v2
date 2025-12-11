import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Trash2, 
  Plus, 
  Info,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  ShieldAlert,
  Search,
  CheckCircle,
  XCircle,
  Save,
  X,
  ArrowUpDown,
  Upload,
  Database,
  AlertCircle,
  Edit2,
  Lock // Added Lock icon
} from 'lucide-react';
import { Button, Card } from '../utils';
import RosterEditor from './RosterEditor'; 
import PageHeader from './PageHeader'; 
import { getPlayerValidationIssues, createPlayer } from '../models'; 

// --- HELPERS (Keep existing helpers) ---
const normalizeDate = (dateStr) => {
  if (!dateStr) return '';
  const cleanStr = dateStr.trim();
  const mdY = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdY) {
    const m = parseInt(mdY[1]);
    const d = parseInt(mdY[2]);
    const y = parseInt(mdY[3]);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
       return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }
  const yMd = cleanStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (yMd) {
    const y = parseInt(yMd[1]);
    const m = parseInt(yMd[2]);
    const d = parseInt(yMd[3]);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
       return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }
  return null;
};

const generateUniqueAbbr = (name, existingTeams) => {
    let base = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    if (base.length < 2) base = name.substring(0, 2).toUpperCase().padEnd(3, 'X');
    
    let candidate = base;
    let counter = 1;
    const existingAbbrs = new Set(existingTeams.map(t => t.abbr));
    
    while (existingAbbrs.has(candidate)) {
        candidate = base.substring(0, 2) + counter;
        counter++;
    }
    return candidate;
};

// --- MODALS (Keep existing modals) ---
const EditTeamModal = ({ team, allTeams, onClose, onSave }) => {
    const [name, setName] = useState(team.name);
    const [abbr, setAbbr] = useState(team.abbr);
    const [error, setError] = useState('');

    const handleSave = () => {
        if (!name.trim() || !abbr.trim()) {
            setError('Name and Abbreviation are required.');
            return;
        }
        const cleanAbbr = abbr.toUpperCase().substring(0, 4);
        const isUnique = !allTeams.some(t => t.id !== team.id && t.abbr === cleanAbbr);
        if (!isUnique) {
            setError(`Abbreviation "${cleanAbbr}" is already taken by another team.`);
            return;
        }
        onSave(name, cleanAbbr);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm shadow-2xl">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Edit2 size={16} className="text-blue-400"/> Edit Team Details
                    </h3>
                    <button onClick={onClose}><X size={16} className="text-slate-500 hover:text-white" /></button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Team Name</label>
                        <input 
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 transition-colors"
                            value={name}
                            onChange={e => { setName(e.target.value); setError(''); }}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Abbreviation</label>
                        <input 
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 transition-colors uppercase font-mono"
                            maxLength={4}
                            value={abbr}
                            onChange={e => { setAbbr(e.target.value.toUpperCase()); setError(''); }}
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Unique 2-4 character code (e.g. RHS) used in schedule tables.</p>
                    </div>
                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/10 p-3 rounded border border-red-900/20">
                            <AlertCircle size={14} className="shrink-0" /> {error}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-800 bg-slate-950/30 flex justify-end gap-2 rounded-b-xl">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </div>
            </div>
        </div>
    );
};

const HostCheckInView = ({ masterRoster, currentEventRoster, onCancel, onSave }) => {
    // ... [Content unchanged from previous version] ...
    // Re-inserting logic to save space, assuming it's present or handled by you if I use ...
    // Since I need to produce full file, I will include the full logic of HostCheckInView.
    
    const [selectedIds, setSelectedIds] = useState(() => {
        if (currentEventRoster && currentEventRoster.length > 0) {
            return new Set(currentEventRoster.map(p => p.id));
        }
        return new Set(masterRoster.map(p => p.id));
    });

    const [filter, setFilter] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'lastName', direction: 'asc' });

    const toggleId = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === masterRoster.length) {
            setSelectedIds(new Set()); 
        } else {
            setSelectedIds(new Set(masterRoster.map(p => p.id))); 
        }
    };

    const handleConfirm = () => {
        const selectedPlayers = masterRoster
            .filter(p => selectedIds.has(p.id))
            .map(p => ({ ...p }));
        onSave(selectedPlayers);
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredRoster = masterRoster.filter(p => 
        p.lastName.toLowerCase().includes(filter.toLowerCase()) || 
        p.firstName.toLowerCase().includes(filter.toLowerCase())
    );
    
    filteredRoster.sort((a, b) => {
        let aVal = a[sortConfig.key] || '';
        let bVal = b[sortConfig.key] || '';

        if (['weight', 'rating'].includes(sortConfig.key)) {
            aVal = Number(aVal) || 0;
            bVal = Number(bVal) || 0;
        } else if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const columns = [
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
        { key: 'dob', label: 'DOB' },
        { key: 'weight', label: 'Weight' },
        { key: 'rating', label: 'Rating' },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-900 animate-in fade-in duration-300">
            <div className="p-4 border-b border-slate-800 bg-blue-900/10 flex flex-col gap-4 shrink-0">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <UserPlus size={20} className="text-blue-400"/> Select Attendees
                        </h3>
                        <p className="text-sm text-slate-400">
                            Confirm which wrestlers from the Master Roster are attending.
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold text-white block">{selectedIds.size}</span>
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Attending</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                        <input 
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Search Master Roster..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />
                    </div>
                    <Button 
                        onClick={handleSelectAll}
                        variant="ghost"
                        className="text-slate-300 border border-slate-700 whitespace-nowrap"
                    >
                        {selectedIds.size === masterRoster.length ? 'Clear All' : 'Select All'}
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-800 text-slate-400 uppercase font-bold text-xs sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-3 w-20 text-center">Status</th>
                            {columns.map(col => (
                                <th 
                                    key={col.key}
                                    onClick={() => handleSort(col.key)}
                                    className="px-6 py-3 cursor-pointer hover:text-white hover:bg-slate-700 transition-colors select-none"
                                >
                                    <div className="flex items-center gap-1">
                                        {col.label}
                                        <ArrowUpDown size={12} className={`opacity-50 ${sortConfig.key === col.key ? 'text-blue-400 opacity-100' : ''}`} />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {filteredRoster.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-slate-500">No wrestlers found in Master Roster.</td></tr>
                        ) : filteredRoster.map(p => {
                            const isSelected = selectedIds.has(p.id);
                            return (
                                <tr 
                                    key={p.id} 
                                    onClick={() => toggleId(p.id)}
                                    className={`cursor-pointer transition-colors border-l-4 ${
                                        isSelected 
                                        ? 'bg-blue-900/10 border-l-green-500 hover:bg-blue-900/20' 
                                        : 'bg-slate-900/50 border-l-transparent hover:bg-slate-800'
                                    }`}
                                >
                                    <td className="px-6 py-3 text-center">
                                        <div className="flex justify-center">
                                            {isSelected ? (
                                                <CheckCircle className="text-green-500 fill-green-500/20" size={20} />
                                            ) : (
                                                <XCircle className="text-red-500 fill-red-500/10" size={20} />
                                            )}
                                        </div>
                                    </td>
                                    <td className={`px-6 py-3 ${isSelected ? 'text-white font-medium' : 'text-slate-500'}`}>{p.firstName}</td>
                                    <td className={`px-6 py-3 ${isSelected ? 'text-white font-medium' : 'text-slate-500'}`}>{p.lastName}</td>
                                    <td className={`px-6 py-3 ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>{p.dob || '-'}</td>
                                    <td className={`px-6 py-3 font-mono ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>{p.weight}</td>
                                    <td className={`px-6 py-3 ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>{p.rating}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3 shrink-0">
                <Button variant="ghost" onClick={onCancel} className="text-slate-400 hover:text-white">
                    Cancel
                </Button>
                <Button onClick={handleConfirm} icon={Save}>
                    Save Roster
                </Button>
            </div>
        </div>
    );
};


// --- MAIN STEP COMPONENT ---
const Step2_RosterManager = ({ event, masterRoster, hostName, onUpdateEvent }) => {
  
  // Data State
  const [teams, setTeams] = useState(() => {
      if (event.participatingTeams && event.participatingTeams.length > 0) {
          return event.participatingTeams;
      }
      return [{ 
          id: 'host', 
          name: hostName || 'Host Team', 
          abbr: (hostName || 'HST').substring(0,3).toUpperCase(),
          isHost: true, 
          roster: [] 
      }];
  });

  const [activeTeamId, setActiveTeamId] = useState('host');
  const [viewMode, setViewMode] = useState('view');
  
  // Modal State
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);

  // --- LOCKED STATE LOGIC ---
  const isLocked = useMemo(() => {
      return event.matchups && event.matchups.length > 0;
  }, [event.matchups]);

  const activeTeam = teams.find(t => t.id === activeTeamId) || teams[0];
  const updateTeams = (newTeams) => {
      setTeams(newTeams);
      onUpdateEvent(event.id, { participatingTeams: newTeams });
  };

  // --- ACTIONS ---

  const handleUpdateRoster = (newRoster) => {
      const updated = teams.map(t => t.id === activeTeamId ? { ...t, roster: newRoster } : t);
      updateTeams(updated);
  };

  const handleSaveCheckIn = (selectedRoster) => {
      const updated = teams.map(t => t.isHost ? { ...t, roster: selectedRoster } : t);
      updateTeams(updated);
      setViewMode('view');
  };

  const handleAddTeam = () => {
      if (isLocked) return; // Prevent action if locked
      const name = prompt("Enter Guest Team Name:");
      if (!name) return;
      const abbr = generateUniqueAbbr(name, teams);
      const newTeam = { id: crypto.randomUUID(), name, abbr, isHost: false, roster: [] };
      updateTeams([...teams, newTeam]);
      setActiveTeamId(newTeam.id);
      setViewMode('view');
  };

  const handleSaveTeamDetails = (newName, newAbbr) => {
      if (isLocked) return;
      const updated = teams.map(t => 
          t.id === activeTeam.id 
          ? { ...t, name: newName, abbr: newAbbr } 
          : t
      );
      updateTeams(updated);
      setShowEditTeamModal(false);
  };

  const handleDeleteTeam = (id) => {
      if (isLocked) return;
      if (!confirm("Remove this team?")) return;
      const updated = teams.filter(t => t.id !== id);
      updateTeams(updated);
      if (activeTeamId === id) setActiveTeamId(updated[0]?.id || null);
  };

  const handleCSVImport = (e) => {
    if (isLocked) return;
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) return; 

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));
      const map = {
        firstName: headers.findIndex(h => h.includes('first') || h === 'fname'),
        lastName: headers.findIndex(h => h.includes('last') || h === 'lname'),
        division: headers.findIndex(h => h.includes('division') || h.includes('div')),
        dob: headers.findIndex(h => h.includes('birth') || h.includes('dob')),
        weight: headers.findIndex(h => h.includes('weight') || h === 'wt'),
        gender: headers.findIndex(h => h.includes('gender') || h === 'sex' || h === 'm/f'),
        rating: headers.findIndex(h => h.includes('rating') || h.includes('elo'))
      };
      
      const parsedPlayers = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/['"]+/g, ''));
        const p = createPlayer(
            map.firstName > -1 ? cols[map.firstName] : 'Unknown',
            map.lastName > -1 ? cols[map.lastName] : 'Unknown'
        );
        if (map.division > -1) p.division = cols[map.division];
        if (map.dob > -1) {
            const rawDob = cols[map.dob];
            const normalized = normalizeDate(rawDob);
            p.dob = normalized || rawDob; 
        }
        if (map.weight > -1) {
            const rawWt = cols[map.weight];
            const parsedWt = parseFloat(rawWt);
            p.weight = isNaN(parsedWt) ? rawWt : parsedWt;
        }
        if (map.gender > -1) {
            let g = cols[map.gender].toUpperCase();
            if (g.startsWith('M')) p.gender = 'M';
            else if (g.startsWith('F')) p.gender = 'F';
            else p.gender = cols[map.gender]; 
        }
        if (map.rating > -1) {
            const val = cols[map.rating];
            const num = parseFloat(val);
            p.rating = !isNaN(num) ? num : (val === '' ? 0 : val); 
        } else {
            p.rating = 0;
        }
        return p;
      });
      handleUpdateRoster(parsedPlayers);
    };
    reader.readAsText(file);
    e.target.value = null; 
  };

  const getTeamIssueCount = (roster) => {
      if (!roster) return 0;
      return roster.reduce((acc, p) => acc + (getPlayerValidationIssues(p).length > 0 ? 1 : 0), 0);
  };

  const getTeamStatus = (team) => {
      if (!team.roster || team.roster.length === 0) return 'empty';
      const issues = getTeamIssueCount(team.roster);
      if (issues > 0) return 'error';
      return 'ready';
  };

  if (!activeTeam) return <div className="p-10 text-center">No teams found.</div>;

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-8 duration-500 relative">
        
        {/* LOCK BANNER */}
        {isLocked && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
                <div className="bg-slate-900 border border-yellow-500/50 rounded-xl p-8 max-w-md text-center shadow-2xl">
                    <div className="mx-auto w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
                        <Lock size={24} className="text-yellow-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Rosters Locked</h3>
                    <p className="text-slate-400 text-sm mb-6">
                        Matchmaking has already been run. To modify teams or add wrestlers, please go to Step 4 and remove them, or reset the matches entirely.
                    </p>
                    <div className="text-xs text-yellow-500/70 border-t border-slate-800 pt-4">
                        Modifications are disabled to prevent data corruption.
                    </div>
                </div>
            </div>
        )}

        {/* Standard Page Header - Reduced padding to save space */}
        <div className="mb-2 shrink-0">
            <PageHeader 
                title="Event Participants" 
                description="Manage the host roster and guest teams for this specific event." 
            />
        </div>

        {/* --- MODAL --- */}
        {showEditTeamModal && (
            <EditTeamModal 
                team={activeTeam}
                allTeams={teams}
                onClose={() => setShowEditTeamModal(false)}
                onSave={handleSaveTeamDetails}
            />
        )}

        {/* --- SPLIT VIEW --- */}
        <div className="flex gap-4 h-full min-h-0">
            
            {/* LEFT: Team List Sidebar */}
            <div className="w-72 shrink-0 flex flex-col bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-sm h-full">
                <div className="p-3 border-b border-slate-800 bg-slate-900 shrink-0">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Users size={14} /> Participating Teams
                    </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-900/50">
                    {teams.map(team => {
                        const status = getTeamStatus(team);
                        const isActive = activeTeamId === team.id;
                        
                        return (
                            <button
                                key={team.id}
                                onClick={() => { setActiveTeamId(team.id); setViewMode('view'); }}
                                className={`w-full text-left p-3 rounded-lg text-sm transition-all flex justify-between items-center group relative border ${
                                    isActive 
                                    ? 'bg-slate-800 border-blue-500/50 shadow-md' 
                                    : 'bg-transparent border-transparent hover:bg-slate-800 hover:border-slate-700'
                                }`}
                            >
                                <div className="min-w-0 flex-1 mr-2">
                                    <div className={`font-bold truncate ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                        {team.name}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] mt-1">
                                        <span className="font-mono bg-slate-700 text-slate-300 px-1 rounded">{team.abbr}</span>
                                        {team.isHost && <span className="bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/50">HOST</span>}
                                        <span className="text-slate-500">{team.roster?.length || 0} Athletes</span>
                                    </div>
                                </div>
                                {status === 'error' && (
                                    <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                                        <AlertTriangle size={12} />
                                    </div>
                                )}
                                {status === 'ready' && (
                                    <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
                                        <CheckCircle2 size={12} />
                                    </div>
                                )}
                                {status === 'empty' && (
                                    <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                                        <AlertCircle size={12} />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                    
                    <button 
                        onClick={handleAddTeam}
                        disabled={isLocked}
                        className="w-full flex items-center justify-center p-3 rounded-lg border border-dashed border-slate-700 text-slate-500 hover:text-white hover:border-slate-500 hover:bg-slate-800 transition-all mt-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={16} className="mr-2" /> Add Guest Team
                    </button>
                </div>
            </div>

            {/* RIGHT: Active Team Editor (Swappable View) */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl h-full">
                
                {/* MODE 1: CHECK-IN VIEW */}
                {activeTeam.isHost && viewMode === 'checkin' ? (
                    <HostCheckInView 
                        masterRoster={masterRoster}
                        currentEventRoster={activeTeam.roster}
                        onCancel={() => setViewMode('view')}
                        onSave={handleSaveCheckIn}
                    />
                ) : (
                    /* MODE 2: STANDARD EDITOR VIEW */
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-start bg-slate-900 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-3">
                                    {activeTeam.name}
                                    <span className="text-xs font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">{activeTeam.abbr}</span>
                                    <button 
                                        onClick={() => setShowEditTeamModal(true)}
                                        className="text-slate-600 hover:text-blue-400 transition-colors p-1 hover:bg-slate-800 rounded"
                                        title="Edit Team Details"
                                        disabled={isLocked}
                                    >
                                        <Edit2 size={14}/>
                                    </button>
                                </h2>
                                <div className="flex items-center gap-4 text-xs mt-1">
                                    <span className="flex items-center gap-1.5 text-slate-400">
                                        <Users size={12}/> 
                                        <strong className="text-slate-200">{activeTeam.roster?.length || 0}</strong> Total
                                    </span>
                                    
                                    {/* Status Badge in Header */}
                                    {getTeamStatus(activeTeam) === 'error' && (
                                        <span className="flex items-center gap-1.5 text-red-400 bg-red-950/30 px-2 py-0.5 rounded border border-red-900/50">
                                            <ShieldAlert size={12}/> 
                                            <strong>{getTeamIssueCount(activeTeam.roster)}</strong> Issues
                                        </span>
                                    )}
                                    {getTeamStatus(activeTeam) === 'ready' && (
                                        <span className="flex items-center gap-1.5 text-green-400 bg-green-950/30 px-2 py-0.5 rounded border border-green-900/50">
                                            <CheckCircle2 size={12}/> Roster Ready
                                        </span>
                                    )}
                                    {getTeamStatus(activeTeam) === 'empty' && (
                                        <span className="flex items-center gap-1.5 text-yellow-400 bg-yellow-950/30 px-2 py-0.5 rounded border border-yellow-900/50">
                                            <AlertCircle size={12}/> Roster Empty
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                {!activeTeam.isHost && (
                                    <Button onClick={() => handleDeleteTeam(activeTeam.id)} disabled={isLocked} variant="ghost" className="text-red-400 hover:bg-red-950/50 border border-transparent hover:border-red-900/50 h-8 text-xs disabled:opacity-50">
                                        <Trash2 size={14} className="mr-1"/> Remove
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 bg-slate-950/30 flex flex-col overflow-hidden relative">
                            {activeTeam.roster.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl m-4 bg-slate-900/50">
                                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                        <Users size={32} className="text-slate-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1">Roster Empty</h3>
                                    <p className="mb-6 text-sm max-w-xs text-center">Add wrestlers to begin matchmaking.</p>
                                    
                                    <div className="flex flex-row gap-3 w-full max-w-md justify-center">
                                        {/* HOST ONLY: Import from Master */}
                                        {activeTeam.isHost && (
                                            <Button onClick={() => setViewMode('checkin')} disabled={isLocked} icon={Database} className="flex-1 justify-center">
                                                Import from Master
                                            </Button>
                                        )}
                                        
                                        {/* ALL TEAMS: Import CSV */}
                                        <label className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${isLocked ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500' : (activeTeam.isHost ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-blue-600 text-white hover:bg-blue-500')}`}>
                                            <Upload size={18} className="mr-2" />
                                            Import from CSV
                                            <input 
                                                type="file" 
                                                accept=".csv" 
                                                className="hidden" 
                                                disabled={isLocked}
                                                onChange={handleCSVImport}
                                            />
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 min-h-0 h-full flex flex-col">
                                    {/* We pass a disabled state to RosterEditor implicitly by blocking edits at this level, 
                                        but RosterEditor itself handles its own internal state. 
                                        Since `handleUpdateRoster` is defined here, we can block updates in that function if needed,
                                        but the overlay handles UI blocking. */}
                                    <RosterEditor 
                                        roster={activeTeam.roster} 
                                        teamName={activeTeam.name}
                                        onChange={handleUpdateRoster} 
                                        onImportFromMaster={activeTeam.isHost ? () => setViewMode('checkin') : null}
                                    />
                                </div>
                            )}
                            
                            {/* Force render RosterEditor even when empty to allow manual adds if needed, via conditional override if logic changes */}
                            {activeTeam.roster.length === 0 && (
                                 <div className="flex-1 min-h-0 h-full flex flex-col hidden">
                                    <RosterEditor 
                                        roster={[]} 
                                        teamName={activeTeam.name}
                                        onChange={handleUpdateRoster} 
                                        onImportFromMaster={activeTeam.isHost ? () => setViewMode('checkin') : null}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default Step2_RosterManager;