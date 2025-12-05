import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Settings, 
  Swords, 
  ListOrdered, 
  Share2, 
  Upload, 
  Trash2,
  RefreshCw,
  Search,
  ArrowUpDown,
  UserCheck,
  X,
  Plus,
  AlertTriangle,
  UserX,
  FileDown,
  Info,
  Check,
  Edit2,
  Calendar
} from 'lucide-react';
import { Button, Card } from '../utils';
import { createPlayer } from '../models';

// --- HELPERS ---

const normalizeDate = (dateStr) => {
  if (!dateStr) return '';
  const cleanStr = dateStr.trim();

  // Format: MM/DD/YYYY or MM-DD-YYYY
  const mdY = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdY) {
    const m = parseInt(mdY[1], 10);
    const d = parseInt(mdY[2], 10);
    const y = parseInt(mdY[3], 10);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
       return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }

  // Format: YYYY-MM-DD or YYYY/MM/DD
  const yMd = cleanStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (yMd) {
    const y = parseInt(yMd[1], 10);
    const m = parseInt(yMd[2], 10);
    const d = parseInt(yMd[3], 10);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
       return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }

  return null;
};

const parseCSVWithHeaders = (file, callback) => {
  const reader = new FileReader();
  reader.onload = (evt) => {
    const text = evt.target.result;
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return; 

    const headers = lines[0]
      .split(',')
      .map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));

    const map = {
      firstName: headers.findIndex(h => h.includes('first') || h === 'fname'),
      lastName: headers.findIndex(h => h.includes('last') || h === 'lname'),
      division: headers.findIndex(h => h.includes('division') || h.includes('div')),
      dob: headers.findIndex(h => h.includes('birth') || h.includes('dob')),
      weight: headers.findIndex(h => h.includes('weight') || h === 'wt'),
      gender: headers.findIndex(h => h.includes('gender') || h === 'sex' || h === 'm/f'),
      rating: headers.findIndex(h => h.includes('rating') || h.includes('elo'))
    };

    const newPlayers = lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/['"]+/g, ''));

      const p = createPlayer(
        map.firstName > -1 ? cols[map.firstName] : 'Unknown',
        map.lastName > -1 ? cols[map.lastName] : 'Unknown'
      );

      if (map.division > -1) p.division = cols[map.division];

      if (map.dob > -1) {
        p.dob = normalizeDate(cols[map.dob]) || '';
      }

      if (map.weight > -1) {
        p.weight = parseFloat(cols[map.weight]) || 0;
      }

      let g = map.gender > -1 ? cols[map.gender].toUpperCase() : 'M';
      if (g.startsWith('M')) g = 'M';
      else if (g.startsWith('F')) g = 'F';
      else if (map.gender > -1) g = cols[map.gender]; // retain invalid if present
      p.gender = g;

      if (map.rating > -1) {
        const val = cols[map.rating];
        if (val === '' || val === undefined) {
          p.rating = 0;
        } else {
          const num = parseFloat(val);
          p.rating = !isNaN(num) ? num : null;
        }
      } else {
        p.rating = 0;
      }

      return p;
    });

    callback(newPlayers);
  };
  reader.readAsText(file);
};

const getValidationIssues = (p) => {
  const issues = [];
  if (!p.firstName || !p.lastName) issues.push('Missing Name');
  if (!p.weight || isNaN(p.weight) || p.weight <= 0) issues.push('Invalid Weight');
  if (!['M', 'F'].includes(p.gender)) issues.push('Invalid Gender');
  if (p.rating === null || isNaN(p.rating) || p.rating < 0 || p.rating > 5) issues.push('Invalid Rating');
  if (!p.dob) issues.push('Missing/Invalid DOB');
  return issues;
};

// --- SUB-COMPONENTS ---

const EventSetupStep = ({ event, onUpdate }) => (
  <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
    <Card className="p-6 space-y-6">
      <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-4">
        Event Basics
      </h3>

      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Event Name
        </label>
        <input
          className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          value={event.name}
          onChange={e => onUpdate(event.id, { name: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Date
          </label>
          <input
            type="date"
            className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={event.date}
            onChange={e => onUpdate(event.id, { date: e.target.value })}
          />
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Time
            </label>
            <label className="flex items-center text-xs text-slate-400 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                className="mr-2"
                checked={event.isTimeTbd}
                onChange={e => onUpdate(event.id, { isTimeTbd: e.target.checked })}
              />
              Set as TBD
            </label>
          </div>
          <input
            type="time"
            disabled={event.isTimeTbd}
            className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 outline-none"
            value={event.time || ''}
            onChange={e => onUpdate(event.id, { time: e.target.value })}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between mb-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Location
          </label>
          <label className="flex items-center text-xs text-slate-400 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              className="mr-2"
              checked={event.isLocationTbd}
              onChange={e => onUpdate(event.id, { isLocationTbd: e.target.checked })}
            />
            Set as TBD
          </label>
        </div>
        <input
          type="text"
          disabled={event.isLocationTbd}
          placeholder="Enter venue name or address..."
          className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 outline-none"
          value={event.location || ''}
          onChange={e => onUpdate(event.id, { location: e.target.value })}
        />
      </div>
    </Card>
  </div>
);

// --- EDIT WRESTLER MODAL ---

const EditWrestlerModal = ({ player, onClose, onSave }) => {
  const [formData, setFormData] = useState({ ...player });

  const handleSave = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      weight: formData.weight === '' ? 0 : parseFloat(formData.weight),
      rating: formData.rating === '' ? 0 : parseFloat(formData.rating),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Edit Wrestler</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                First Name
              </label>
              <input
                required
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Last Name
              </label>
              <input
                required
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Division
              </label>
              <input
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                placeholder="e.g. Varsity"
                value={formData.division || ''}
                onChange={e => setFormData({ ...formData, division: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                value={formData.dob || ''}
                onChange={e => setFormData({ ...formData, dob: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Weight
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                value={formData.weight ?? ''}
                onChange={e => setFormData({ ...formData, weight: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Gender
              </label>
              <select
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                value={['M', 'F'].includes(formData.gender) ? formData.gender : ''}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="" disabled>
                  Select...
                </option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Rating (0–5)
              </label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                value={formData.rating ?? ''}
                onChange={e => setFormData({ ...formData, rating: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              className="flex-1"
              variant="ghost"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button className="flex-1" type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- STEP: PARTICIPANTS ---

const StepParticipants = ({ 
  hostName, 
  masterRoster, 
  hostRosterSnapshot, 
  teams, 
  onUpdateTeams, 
  onUpdateHostSnapshot 
}) => {
  const [guestTeamName, setGuestTeamName] = useState('');
  const [guestTeamAbbr, setGuestTeamAbbr] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [teamFilter, setTeamFilter] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'weight', direction: 'asc' });
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editTeamData, setEditTeamData] = useState({ name: '', abbr: '' });

  // New state for wrestler edit modal
  const [editingPlayer, setEditingPlayer] = useState(null); // { ...player, teamId }

  // --- TEAM EDITING ---

  const startEditTeam = (team) => {
    setEditingTeamId(team.id);
    setEditTeamData({
      name: team.name,
      abbr: team.abbr || team.name.substring(0, 3).toUpperCase(),
    });
  };

  const saveEditTeam = () => {
    if (editingTeamId === 'host') {
      setEditingTeamId(null);
    } else {
      onUpdateTeams(
        teams.map(t =>
          t.id === editingTeamId
            ? { ...t, name: editTeamData.name, abbr: editTeamData.abbr }
            : t
        )
      );
      setEditingTeamId(null);
    }
  };

  // --- CSV IMPORT ---

  const handleCSVUpload = (e, teamId) => {
    const file = e.target.files[0];
    if (!file) return;

    const isHost = teamId === 'host';
    const msg = isHost
      ? 'This will replace the current Host Event Roster with the CSV data. Continue?'
      : 'This will replace the entire roster for this team. Continue?';

    if (confirm(msg)) {
      parseCSVWithHeaders(file, (players) => {
        if (isHost) {
          onUpdateHostSnapshot(players);
        } else {
          onUpdateTeams(
            teams.map(t => (t.id === teamId ? { ...t, roster: players } : t))
          );
        }
        e.target.value = null;
      });
    }
  };

  // --- ADD GUEST TEAM ---

  const handleAddGuestTeam = (e) => {
    const file = e.target.files[0];
    if (!file || !guestTeamName || !guestTeamAbbr) {
      alert('Please enter both a Team Name and Abbreviation.');
      e.target.value = null;
      return;
    }
    parseCSVWithHeaders(file, (players) => {
      const newTeam = {
        id: crypto.randomUUID(),
        name: guestTeamName,
        abbr: guestTeamAbbr.toUpperCase(),
        isHost: false,
        roster: players,
      };
      onUpdateTeams([...teams, newTeam]);
      setGuestTeamName('');
      setGuestTeamAbbr('');
      e.target.value = null;
    });
  };

  // --- SAVE PLAYER CHANGES FROM MODAL ---

  const savePlayerChanges = (updatedPlayer) => {
    if (!editingPlayer) return;

    if (editingPlayer.teamId === 'host') {
      const updated = hostRosterSnapshot.map(p =>
        p.id === updatedPlayer.id ? updatedPlayer : p
      );
      onUpdateHostSnapshot(updated);
    } else {
      const newTeams = teams.map(t => {
        if (t.id === editingPlayer.teamId) {
          return {
            ...t,
            roster: t.roster.map(p =>
              p.id === updatedPlayer.id ? updatedPlayer : p
            ),
          };
        }
        return t;
      });
      onUpdateTeams(newTeams);
    }

    setEditingPlayer(null);
  };

  // --- DOWNLOAD TEMPLATE ---

  const handleDownloadTemplate = () => {
    const headers = [
      'First Name',
      'Last Name',
      'Division',
      'DOB (MM/DD/YYYY)',
      'Weight',
      'Gender (M/F)',
      'Rating (0-5)',
    ];
    const blob = new Blob([headers.join(',')], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'roster_template.csv';
    link.click();
  };

  // --- DATA PREP ---

  const allWrestlers = useMemo(() => {
    let list = [];

    const hostAbbr = hostName ? hostName.substring(0, 3).toUpperCase() : 'HST';
    hostRosterSnapshot.forEach(p =>
      list.push({
        ...p,
        teamId: 'host',
        teamName: hostName,
        teamAbbr: hostAbbr,
      })
    );

    teams
      .filter(t => !t.isHost)
      .forEach(t => {
        t.roster.forEach(p =>
          list.push({
            ...p,
            teamId: t.id,
            teamName: t.name,
            teamAbbr: t.abbr || t.name.substring(0, 3).toUpperCase(),
          })
        );
      });

    if (teamFilter) {
      list = list.filter(p => p.teamId === teamFilter);
    }

    list.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'status') {
        aVal = getValidationIssues(a).length;
        bVal = getValidationIssues(b).length;
        if (sortConfig.direction === 'asc') return bVal - aVal;
        return aVal - bVal;
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [hostRosterSnapshot, teams, teamFilter, sortConfig, hostName]);

  const handleSort = (key) => {
    if (key === 'actions') return;
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // --- RENDER TEAM CARD ---

  const renderTeamCard = (team, roster) => {
    const isEditing = editingTeamId === team.id;
    const validCount = roster.filter(p => getValidationIssues(p).length === 0).length;
    const invalidCount = roster.length - validCount;
    const isHost = team.id === 'host' || team.isHost;

    return (
      <div
        key={team.id}
        onClick={() =>
          setTeamFilter(teamFilter === team.id ? null : team.id)
        }
        className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${
          teamFilter === team.id
            ? 'bg-blue-900/20 border-blue-500 ring-1 ring-blue-500'
            : 'bg-slate-800 border-slate-700 hover:border-slate-500'
        }`}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            {isEditing ? (
              <div
                className="space-y-2 mb-2"
                onClick={e => e.stopPropagation()}
              >
                <input
                  className="bg-slate-950 border border-slate-600 rounded px-2 py-1 text-xs text-white w-full"
                  value={editTeamData.name}
                  onChange={e =>
                    setEditTeamData({ ...editTeamData, name: e.target.value })
                  }
                  placeholder="Name"
                />
                <input
                  className="bg-slate-950 border border-slate-600 rounded px-2 py-1 text-xs text-white w-20 text-center"
                  value={editTeamData.abbr}
                  onChange={e =>
                    setEditTeamData({ ...editTeamData, abbr: e.target.value })
                  }
                  placeholder="ABBR"
                  maxLength={4}
                />
                <div className="flex gap-2">
                  <Button
                    className="text-xs h-6 px-2"
                    type="button"
                    onClick={saveEditTeam}
                  >
                    Save
                  </Button>
                  <Button
                    className="text-xs h-6 px-2"
                    type="button"
                    variant="ghost"
                    onClick={() => setEditingTeamId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="font-bold text-white flex items-center gap-2">
                  {team.name}
                  <span className="text-[10px] bg-slate-700 px-1 rounded text-slate-300 font-mono">
                    {team.abbr || team.name?.substring(0, 3).toUpperCase()}
                  </span>
                  {!isHost && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditTeam(team);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded text-slate-400"
                    >
                      <Edit2 size={12} />
                    </button>
                  )}
                </div>
                <div className="text-[10px] flex gap-2 mt-1">
                  <span className="text-green-400">{validCount} Valid</span>
                  <span className="text-slate-600">|</span>
                  <span
                    className={
                      invalidCount > 0
                        ? 'text-red-400 font-bold'
                        : 'text-slate-500'
                    }
                  >
                    {invalidCount} Invalid
                  </span>
                </div>
              </div>
            )}
          </div>
          <div
            className="flex gap-1"
            onClick={e => e.stopPropagation()}
          >
            <label
              className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-blue-400 cursor-pointer"
              title="Upload/Replace CSV"
            >
              <Upload size={14} />
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleCSVUpload(e, team.id)}
                className="hidden"
              />
            </label>
            {isHost && (
              <button
                type="button"
                className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-green-400"
                title="Pull from Master Roster"
                onClick={() => {
                  if (confirm('Reload from Master Roster? Current event edits will be lost.')) {
                    onUpdateHostSnapshot(masterRoster);
                  }
                }}
              >
                <RefreshCw size={14} />
              </button>
            )}
            {!isHost && (
              <button
                type="button"
                onClick={() =>
                  onUpdateTeams(teams.filter(t => t.id !== team.id))
                }
                className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Instructions Panel */}
      {showHelp && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 shrink-0">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-blue-400 flex items-center gap-2">
              <Info size={16} /> Import Instructions
            </h4>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          <div className="text-sm text-slate-300 space-y-1">
            <p>1. Download the <strong>CSV Template</strong>.</p>
            <p>2. Fill in the wrestler data.</p>
            <p>3. Save the updated CSV file.</p>
            <p>4. Import the CSV file.</p>
            <div className="mt-3 pt-2 border-t border-slate-700/50">
              <p className="font-semibold text-slate-400 mb-1">
                Required Roster Attributes:
              </p>
              <ul className="list-disc list-inside text-xs space-y-0.5 ml-1 text-slate-400">
                <li>First Name (Text)</li>
                <li>Last Name (Text)</li>
                <li>Division (Text)</li>
                <li>Date of Birth (MM/DD/YYYY or YYYY-MM-DD)</li>
                <li>Weight (##.#)</li>
                <li>Rating (0-5)</li>
                <li>Gender (M / F)</li>
              </ul>
              <p className="text-xs text-yellow-500 mt-2 flex items-center gap-1">
                <AlertTriangle size={12} />
                Incomplete records and invalid values will be loaded and flagged for correction.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Team Management Grid */}
      <div className="shrink-0 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Users size={18} /> Participating Teams
          </h3>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowHelp(!showHelp)}
              className="px-3 border border-slate-700 text-slate-400"
              title="Help"
            >
              <Info size={18} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleDownloadTemplate}
              className="border border-slate-700 text-slate-300 text-xs px-3 h-8"
            >
              <FileDown size={16} className="mr-2" /> Roster Template
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Host Card */}
          {renderTeamCard(
            { id: 'host', name: hostName, isHost: true },
            hostRosterSnapshot
          )}

          {/* Guest Cards */}
          {teams
            .filter(t => !t.isHost)
            .map(team => renderTeamCard(team, team.roster))}

          {/* Add Team Card */}
          <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 flex flex-col justify-center space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Add Guest Team
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                placeholder="Name"
                value={guestTeamName}
                onChange={e => setGuestTeamName(e.target.value)}
              />
              <input
                className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white text-center uppercase"
                placeholder="ABBR"
                maxLength={4}
                value={guestTeamAbbr}
                onChange={e => setGuestTeamAbbr(e.target.value)}
              />
            </div>
            <label
              className={`flex items-center justify-center w-full py-1.5 border border-slate-600 rounded cursor-pointer hover:bg-slate-800 transition-colors ${
                !guestTeamName || !guestTeamAbbr
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              <Upload size={12} className="mr-2 text-slate-400" />
              <span className="text-[10px] text-slate-300 font-bold uppercase">
                Upload CSV
              </span>
              <input
                type="file"
                accept=".csv"
                disabled={!guestTeamName || !guestTeamAbbr}
                onChange={handleAddGuestTeam}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="flex-1 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden flex flex-col min-h-0 relative">
        <div className="p-2 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center text-xs px-4">
          <span className="font-bold text-slate-300">
            Event Roster Preview ({allWrestlers.length})
          </span>
          {teamFilter && (
            <button
              type="button"
              onClick={() => setTeamFilter(null)}
              className="text-blue-400 hover:underline"
            >
              Clear Filter
            </button>
          )}
        </div>
        <div className="absolute inset-0 top-8 overflow-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800 text-slate-400 uppercase font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th
                  className="p-3 w-10 text-center cursor-pointer hover:bg-slate-700"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex justify-center">
                    <AlertTriangle
                      size={12}
                      className={
                        sortConfig.key === 'status'
                          ? 'text-white'
                          : 'opacity-30'
                      }
                    />
                  </div>
                </th>
                {[
                  { k: 'teamAbbr', l: 'Team' },
                  { k: 'firstName', l: 'First' },
                  { k: 'lastName', l: 'Last' },
                  { k: 'division', l: 'Div' },
                  { k: 'dob', l: 'DOB' },
                  { k: 'weight', l: 'Weight' },
                  { k: 'gender', l: 'Sex' },
                  { k: 'rating', l: 'Rating' },
                  { k: 'actions', l: '' },
                ].map(col => (
                  <th
                    key={col.k}
                    className="p-3 cursor-pointer hover:bg-slate-700 hover:text-white"
                    onClick={() => handleSort(col.k)}
                  >
                    <div className="flex items-center gap-1">
                      {col.l}
                      {col.k !== 'actions' && (
                        <ArrowUpDown
                          size={10}
                          className={
                            sortConfig.key === col.k
                              ? 'text-blue-400'
                              : 'opacity-30'
                          }
                        />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {allWrestlers.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="p-8 text-center text-slate-500"
                  >
                    No wrestlers added yet.
                  </td>
                </tr>
              ) : (
                allWrestlers.map((p, idx) => {
                  const errors = getValidationIssues(p);
                  const hasError = errors.length > 0;

                  return (
                    <tr
                      key={`${p.id}-${idx}`}
                      className={`hover:bg-slate-800/50 transition-colors ${
                        hasError ? 'bg-red-900/10' : ''
                      }`}
                    >
                      <td className="p-2 text-center">
                        {hasError ? (
                          <div
                            className="flex justify-center"
                            title={errors.join(', ')}
                          >
                            <AlertTriangle
                              size={14}
                              className="text-red-500"
                            />
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <Check size={14} className="text-green-500" />
                          </div>
                        )}
                      </td>
                      <td
                        className={`p-2 font-mono font-bold ${
                          p.teamId === 'host'
                            ? 'text-blue-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {p.teamAbbr}
                      </td>
                      <td className="p-2 text-slate-200">{p.firstName}</td>
                      <td className="p-2 text-white font-medium">
                        {p.lastName}
                      </td>
                      <td className="p-2 text-slate-400">
                        {p.division || '-'}
                      </td>
                      <td
                        className={`p-2 ${
                          !p.dob ? 'text-red-400 font-bold' : 'text-slate-400'
                        }`}
                      >
                        {p.dob || '!'}
                      </td>
                      <td
                        className={`p-2 font-mono ${
                          !p.weight || p.weight <= 0
                            ? 'text-red-400 font-bold'
                            : ''
                        }`}
                      >
                        {p.weight}
                      </td>
                      <td
                        className={`p-2 ${
                          !['M', 'F'].includes(p.gender)
                            ? 'text-red-400 font-bold'
                            : ''
                        }`}
                      >
                        {p.gender}
                      </td>
                      <td
                        className={`p-2 ${
                          p.rating === null ? 'text-red-400' : ''
                        }`}
                      >
                        {p.rating !== null ? p.rating : '!'}
                      </td>
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingPlayer(p)}
                          className="p-1.5 hover:bg-slate-700 rounded text-blue-400 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingPlayer && (
        <EditWrestlerModal
          player={editingPlayer}
          onClose={() => setEditingPlayer(null)}
          onSave={savePlayerChanges}
        />
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---

const MatchmakingWorkflow = ({ event, roster, hostName, onUpdateEvent }) => {
  const [step, setStep] = useState('setup'); // 'setup' | 'participants' | 'params' | 'process' | 'sequence' | 'publish'

  const [teams, setTeams] = useState(
    event.participatingTeams || [
      { id: 'host', name: hostName, isHost: true, roster: [] },
    ]
  );

  const handleUpdateTeams = (newTeams) => {
    setTeams(newTeams);
    onUpdateEvent(event.id, { participatingTeams: newTeams });
  };

  const handleUpdateHostSnapshot = (newSnapshot) => {
    onUpdateEvent(event.id, { rosterSnapshot: newSnapshot });
  };

  const steps = [
    { id: 'setup', label: '1. Event Setup', icon: Calendar },
    { id: 'participants', label: '2. Participants', icon: Users },
    { id: 'params', label: '3. Parameters', icon: Settings },
    { id: 'process', label: '4. Matchmaking', icon: Swords },
    { id: 'sequence', label: '5. Sequence', icon: ListOrdered },
    { id: 'publish', label: '6. Publish', icon: Share2 },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Stepper Header */}
      <div className="flex border-b border-slate-700 bg-slate-900/50 p-1 mb-6 rounded-lg overflow-x-auto shrink-0">
        {steps.map(s => {
          const Icon = s.icon;
          const isActive = step === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={`flex-1 flex items-center justify-center py-3 px-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={16} className="mr-2" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {step === 'setup' && (
          <EventSetupStep event={event} onUpdate={onUpdateEvent} />
        )}

        {step === 'participants' && (
          <StepParticipants
            hostName={hostName}
            masterRoster={roster}
            hostRosterSnapshot={event.rosterSnapshot || []}
            teams={teams}
            onUpdateTeams={handleUpdateTeams}
            onUpdateHostSnapshot={handleUpdateHostSnapshot}
          />
        )}

        {step === 'params' && (
          <div className="text-center py-20 text-slate-500">
            <Settings className="mx-auto mb-4 opacity-50" size={48} />
            <h3 className="text-xl font-bold text-white">Event Parameters</h3>
            <p>Weight class allowances, experience grouping, and algorithm settings will go here.</p>
          </div>
        )}

        {step === 'process' && (
          <div className="text-center py-20 text-slate-500">
            <Swords className="mx-auto mb-4 opacity-50" size={48} />
            <h3 className="text-xl font-bold text-white">Matchmaking Engine</h3>
            <p>Your Python pairing logic will be integrated here.</p>
            <Button className="mt-6" variant="primary">
              Run Auto-Pairing
            </Button>
          </div>
        )}

        {(step === 'sequence' || step === 'publish') && (
          <div className="text-center py-20 text-slate-500">
            <p>Matches must be generated first.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchmakingWorkflow;
