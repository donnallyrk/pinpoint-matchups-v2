import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Search, 
  Download, 
  Upload, 
  Edit2, 
  ArrowUpDown,
  Info,
  FileDown,
  AlertTriangle,
  Check,
  X
} from 'lucide-react';
import { Button } from '../utils';
import { createPlayer } from '../models';

// --- STRICT VALIDATION HELPERS ---

const normalizeDate = (dateStr) => {
  if (!dateStr) return '';
  const cleanStr = dateStr.trim();
  
  // Format: MM/DD/YYYY
  const mdY = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdY) {
    const m = parseInt(mdY[1]);
    const d = parseInt(mdY[2]);
    const y = parseInt(mdY[3]);
    
    // Strict Date Check
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
       return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null; // Invalid
  }

  // Format: YYYY-MM-DD
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
  
  return null; // Format not recognized
};

const RosterEditor = ({ roster = [], onChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'lastName', direction: 'asc' });
  
  // Staging for Import
  const [pendingImport, setPendingImport] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    division: '',
    dob: '',
    weight: '',
    gender: 'M',
    rating: '' // Default empty per request
  });

  // --- VALIDATION CHECK ---
  const getValidationIssues = (p) => {
    const issues = [];
    if (!p.firstName || !p.lastName) issues.push("Missing Name");
    if (!p.weight || isNaN(p.weight) || p.weight <= 0) issues.push("Invalid Weight");
    if (!['M', 'F'].includes(p.gender)) issues.push("Invalid Gender (Must be M or F)");
    if (p.rating === null || isNaN(p.rating) || p.rating < 0 || p.rating > 5) issues.push("Invalid Rating (0-5)");
    if (!p.dob) issues.push("Missing/Invalid DOB");
    return issues;
  };

  const isPlayerComplete = (p) => getValidationIssues(p).length === 0;

  // --- CSV HANDLERS ---
  const handleDownloadTemplate = () => {
    const headers = ['First Name', 'Last Name', 'Division', 'DOB (MM/DD/YYYY)', 'Weight', 'Gender (M/F)', 'Rating (0-5)'];
    const csvContent = headers.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'roster_template.csv';
    link.click();
  };

  const handleExport = () => {
    const headers = ['firstName', 'lastName', 'division', 'dob', 'weight', 'gender', 'rating'];
    const csvContent = [
      headers.join(','),
      ...roster.map(p => headers.map(h => p[h]).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'team_roster.csv';
    link.click();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) return; 

      // Robust Header Detection
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
      
      const newPlayers = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/['"]+/g, ''));
        
        const p = createPlayer(
            map.firstName > -1 ? cols[map.firstName] : 'Unknown',
            map.lastName > -1 ? cols[map.lastName] : 'Unknown'
        );
        if (map.division > -1) p.division = cols[map.division];
        
        // Strict Date Parsing
        if (map.dob > -1) {
            p.dob = normalizeDate(cols[map.dob]) || ''; // Empty string triggers invalid flag
        }

        if (map.weight > -1) p.weight = parseFloat(cols[map.weight]) || 0;
        
        // Retain Raw Gender if Invalid
        if (map.gender > -1) {
            let g = cols[map.gender].toUpperCase();
            if (g.startsWith('M')) p.gender = 'M';
            else if (g.startsWith('F')) p.gender = 'F';
            else p.gender = cols[map.gender]; 
        }

        // Rating: Allow 0, reject invalid
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

      setPendingImport(newPlayers);
      setShowImportModal(true);
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const confirmImport = (action) => {
    if (action === 'append') {
      onChange([...roster, ...pendingImport]);
    } else if (action === 'replace') {
      onChange(pendingImport);
    }
    setShowImportModal(false);
    setPendingImport([]);
  };

  // --- CRUD HANDLERS ---
  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) return;

    if (editingId) {
      const updated = roster.map(p => p.id === editingId ? { 
          ...p, 
          ...formData, 
          weight: parseFloat(formData.weight), 
          rating: formData.rating === '' ? 0 : parseFloat(formData.rating) 
      } : p);
      onChange(updated);
    } else {
      const newPlayer = createPlayer(formData.firstName, formData.lastName);
      Object.assign(newPlayer, { 
          ...formData, 
          weight: parseFloat(formData.weight), 
          rating: formData.rating === '' ? 0 : parseFloat(formData.rating) 
      });
      onChange([...roster, newPlayer]);
    }
    closeModal();
  };

  const handleDelete = (id) => {
    if (confirm('Remove this wrestler from the roster?')) {
      onChange(roster.filter(p => p.id !== id));
    }
  };

  const openModal = (player = null) => {
    if (player) {
      setEditingId(player.id);
      setFormData({ ...player });
    } else {
      setEditingId(null);
      setFormData({
        firstName: '', lastName: '', division: '', dob: '', weight: '', gender: 'M', rating: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  // --- TABLE LOGIC ---
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedRoster = useMemo(() => {
    let data = [...roster];
    if (filter) {
      const lower = filter.toLowerCase();
      data = data.filter(p => 
        p.firstName.toLowerCase().includes(lower) || 
        p.lastName.toLowerCase().includes(lower) ||
        p.division?.toLowerCase().includes(lower)
      );
    }
    
    data.sort((a, b) => {
      let aVal = a[sortConfig.key] || '';
      let bVal = b[sortConfig.key] || '';
      
      // Special sort for Status (Errors first)
      if (sortConfig.key === 'status') {
          aVal = getValidationIssues(a).length;
          bVal = getValidationIssues(b).length;
          // Reverse logic so high errors come first in DESC
          if (sortConfig.direction === 'asc') return aVal - bVal;
          return bVal - aVal;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [roster, filter, sortConfig]);

  return (
    <div className="space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* --- INSTRUCTIONS PANEL --- */}
      {showHelp && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 shrink-0">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-blue-400 flex items-center gap-2">
              <Info size={16} /> Import Instructions
            </h4>
            <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white"><X size={16}/></button>
          </div>
          <div className="text-sm text-slate-300 space-y-1">
            <p>1. Download the <strong>CSV Template</strong>.</p>
            <p>2. Fill in the wrestler data.</p>
            <p>3. Save the updated CSV file.</p>
            <p>4. Import the CSV file.</p>
            <div className="mt-3 pt-2 border-t border-slate-700/50">
                <p className="font-semibold text-slate-400 mb-1">Required Roster Attributes:</p>
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

      {/* --- TOOLBAR (2 Rows) --- */}
      <div className="space-y-3 pb-2 border-b border-slate-800 shrink-0">
        {/* Row 1: Search & Add */}
        <div className="flex gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                    type="text" 
                    placeholder="Search wrestlers..." 
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
            <Button onClick={() => openModal()} icon={Plus}>Add Wrestler</Button>
        </div>

        {/* Row 2: Tools */}
        <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" onClick={() => setShowHelp(!showHelp)} className="px-3 border border-slate-700 text-slate-400" title="Help">
                <Info size={18} />
            </Button>
            <Button variant="ghost" onClick={handleDownloadTemplate} className="border border-slate-700 text-slate-300">
                <FileDown size={16} className="mr-2" /> Roster Template
            </Button>
            <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 flex items-center transition-colors font-medium text-sm">
                <Upload size={16} className="mr-2" />
                Import CSV
                <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
            </label>
            <Button variant="ghost" onClick={handleExport} className="border border-slate-700 text-slate-300">
                <Download size={16} className="mr-2" /> Export CSV
            </Button>
        </div>
      </div>

      {/* --- TABLE (Sticky & Scrollable) --- */}
      <div className="flex-1 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden flex flex-col min-h-0 relative">
        <div className="absolute inset-0 overflow-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800 text-slate-400 uppercase font-medium sticky top-0 z-10 shadow-sm">
              <tr>
                {[
                  { k: 'status', l: 'Status', w: 'w-10 text-center' },
                  { k: 'firstName', l: 'First Name' },
                  { k: 'lastName', l: 'Last Name' },
                  { k: 'division', l: 'Division' },
                  { k: 'dob', l: 'DOB' },
                  { k: 'weight', l: 'Weight' },
                  { k: 'rating', l: 'Rating' },
                  { k: 'gender', l: 'Gender' },
                  { k: 'actions', l: '' }
                ].map(col => (
                  <th 
                    key={col.k} 
                    className={`px-6 py-3 cursor-pointer hover:text-white bg-slate-800 ${col.w || ''}`}
                    onClick={() => col.k !== 'actions' && handleSort(col.k)}
                  >
                    <div className={`flex items-center gap-1 ${col.k === 'status' ? 'justify-center' : ''}`}>
                      {col.l}
                      {col.k !== 'actions' && <ArrowUpDown size={12} className={sortConfig.key === col.k ? 'text-blue-400' : 'opacity-30'} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {processedRoster.length === 0 ? (
                <tr><td colSpan="9" className="px-6 py-12 text-center text-slate-500">No wrestlers found.</td></tr>
              ) : processedRoster.map(player => {
                const issues = getValidationIssues(player);
                const complete = issues.length === 0;
                const isGenderInvalid = !['M', 'F'].includes(player.gender);
                
                return (
                  <tr key={player.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-3 text-center">
                      {complete ? (
                        <div className="flex justify-center"><Check size={16} className="text-green-500" /></div>
                      ) : (
                        <div className="flex justify-center cursor-help" title={issues.join(', ')}>
                           <AlertTriangle size={16} className="text-yellow-500" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3">{player.firstName}</td>
                    <td className="px-6 py-3 font-medium text-white">{player.lastName}</td>
                    <td className="px-6 py-3">{player.division || '-'}</td>
                    <td className={`px-6 py-3 ${!player.dob ? 'text-red-400 font-bold' : ''}`}>{player.dob || '!'}</td>
                    <td className="px-6 py-3">{player.weight?.toFixed(1)}</td>
                    <td className={`px-6 py-3 ${player.rating === null ? 'text-red-400 font-bold' : ''}`}>
                        {player.rating !== null ? player.rating : '!'}
                    </td>
                    <td className={`px-6 py-3 ${isGenderInvalid ? 'text-red-500 font-bold' : ''}`}>
                        {player.gender}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openModal(player)} className="p-1 hover:text-blue-400"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(player.id)} className="p-1 hover:text-red-400"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white">{editingId ? 'Edit Wrestler' : 'Add New Wrestler'}</h3>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">First Name</label>
                  <input required className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Last Name</label>
                  <input required className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Division</label>
                  <input className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" placeholder="e.g. Varsity" value={formData.division || ''} onChange={e => setFormData({...formData, division: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Date of Birth</label>
                  <input type="date" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" value={formData.dob || ''} onChange={e => setFormData({...formData, dob: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Weight</label>
                  <input type="number" step="0.1" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" value={formData.weight || ''} onChange={e => setFormData({...formData, weight: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Gender</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" 
                    value={['M','F'].includes(formData.gender) ? formData.gender : ''} 
                    onChange={e => setFormData({...formData, gender: e.target.value})}
                  >
                    <option value="" disabled>Select...</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                  {!['M','F'].includes(formData.gender) && formData.gender && (
                      <p className="text-[10px] text-red-400 mt-1">Current invalid value: {formData.gender}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Rating (0-5)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="5" 
                    step="0.1"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" 
                    value={formData.rating !== null ? formData.rating : ''} 
                    onChange={e => setFormData({...formData, rating: e.target.value})} 
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button className="flex-1" variant="ghost" onClick={closeModal}>Cancel</Button>
                <Button className="flex-1" type="submit">Save Wrestler</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- IMPORT REVIEW MODAL --- */}
      {showImportModal && (
         <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
               <div className="p-6 border-b border-slate-800">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                     <Upload size={20} className="text-blue-400"/> Import Review
                  </h3>
               </div>
               <div className="p-6 space-y-4">
                  <div className="bg-slate-800 rounded-lg p-4 space-y-2">
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Total Records:</span>
                        <span className="text-white font-bold">{pendingImport.length}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Issues Found:</span>
                        <span className={`font-bold ${pendingImport.some(p => !isPlayerComplete(p)) ? 'text-yellow-500' : 'text-green-500'}`}>
                            {pendingImport.filter(p => !isPlayerComplete(p)).length}
                        </span>
                     </div>
                  </div>
                  
                  {pendingImport.some(p => !isPlayerComplete(p)) && (
                      <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-sm">
                         <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                         <p>Some records have invalid dates, missing weights, or non-standard gender. They will be flagged in red for you to fix.</p>
                      </div>
                  )}

                  <div className="space-y-3 pt-2">
                     <button 
                        onClick={() => confirmImport('append')}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-blue-500 transition-all group"
                     >
                        <span className="font-medium text-white">Append to List</span>
                        <span className="text-xs text-slate-500 group-hover:text-blue-400">Add to existing</span>
                     </button>
                     <button 
                        onClick={() => confirmImport('replace')}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-red-500 transition-all group"
                     >
                        <span className="font-medium text-white">Replace List</span>
                        <span className="text-xs text-slate-500 group-hover:text-red-400">Overwrite all</span>
                     </button>
                  </div>
               </div>
               <div className="p-4 border-t border-slate-800 flex justify-end">
                  <Button variant="ghost" onClick={() => { setShowImportModal(false); setPendingImport([]); }}>Cancel</Button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default RosterEditor;