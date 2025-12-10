import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  X,
  Copy,
  Wand2,
  Database,
  MoreVertical 
} from 'lucide-react';
import { Button } from '../utils';
import { createPlayer, getPlayerValidationIssues, isPlayerValid } from '../models';

// --- HELPERS ---
const normalizeDate = (dateStr) => {
  if (!dateStr) return '';
  const cleanStr = dateStr.trim();
  
  // Format: MM/DD/YYYY
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
  
  return null;
};

// ADDED: Missing helper function to fix crash
const isValidIsoDate = (str) => /^\d{4}-\d{2}-\d{2}$/.test(str);

const RosterEditor = ({ roster = [], teamName = "Team", onChange, onImportFromMaster }) => {
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'lastName', direction: 'asc' });
  
  // Inline Editing State
  const [editingCell, setEditingCell] = useState(null); // { id: string, field: string }
  
  // Staging for Import
  const [pendingImport, setPendingImport] = useState([]); // Contains ONLY unique records (for Append)
  const [fullImportData, setFullImportData] = useState([]); // Contains ALL records (for Replace)
  const [duplicateCount, setDuplicateCount] = useState(0);

  // Form State (Modal)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    division: '',
    dob: '',
    weight: '',
    gender: 'M',
    rating: '' 
  });

  // --- ACTIONS ---
  
  const handleBulkSetDivision = () => {
      const val = prompt("Enter a default Division for wrestlers with missing values (e.g. 'Varsity'):");
      if (!val) return;
      
      const updated = roster.map(p => {
          if (!p.division) {
              return { ...p, division: val };
          }
          return p;
      });
      onChange(updated);
  };

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
    
    // Generate dynamic filename: team_name_yyyymmdd_hhmmss.csv
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    
    const safeName = teamName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${safeName}_roster_${yyyy}${mm}${dd}_${hh}${min}${ss}.csv`;
    
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

      // Header Detection
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
        
        // Date: If invalid, keep the RAW string so user can fix it
        if (map.dob > -1) {
            const rawDob = cols[map.dob];
            const normalized = normalizeDate(rawDob);
            p.dob = normalized || rawDob; // Store raw if normalization fails
        }

        // Weight: Keep raw string if NaN
        if (map.weight > -1) {
            const rawWt = cols[map.weight];
            const parsedWt = parseFloat(rawWt);
            p.weight = isNaN(parsedWt) ? rawWt : parsedWt;
        }
        
        // Gender: Keep raw string if invalid
        if (map.gender > -1) {
            let g = cols[map.gender].toUpperCase();
            if (g.startsWith('M')) p.gender = 'M';
            else if (g.startsWith('F')) p.gender = 'F';
            else p.gender = cols[map.gender]; 
        }

        // Rating: Keep raw string if invalid
        if (map.rating > -1) {
            const val = cols[map.rating];
            if (val === '' || val === undefined) {
                p.rating = 0; 
            } else {
                const num = parseFloat(val);
                p.rating = !isNaN(num) ? num : val; 
            }
        } else {
            p.rating = 0;
        }
        
        return p;
      });

      // --- DUPLICATE DETECTION LOGIC ---
      const existingSignatures = new Set(
          roster.map(p => `${p.firstName.toLowerCase()}|${p.lastName.toLowerCase()}|${p.dob}`)
      );

      const uniqueNewPlayers = parsedPlayers.filter(p => {
          const sig = `${p.firstName.toLowerCase()}|${p.lastName.toLowerCase()}|${p.dob}`;
          return !existingSignatures.has(sig);
      });

      const dupes = parsedPlayers.length - uniqueNewPlayers.length;
      setDuplicateCount(dupes);
      
      setPendingImport(uniqueNewPlayers); // For "Append"
      setFullImportData(parsedPlayers);   // For "Replace" (Contains everything)
      
      setShowImportModal(true);
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const confirmImport = (action) => {
    if (action === 'append') {
      onChange([...roster, ...pendingImport]);
    } else if (action === 'replace') {
      onChange(fullImportData); // Correctly uses the full list, ignoring the 'unique' filter
    }
    setShowImportModal(false);
    setPendingImport([]);
    setFullImportData([]);
    setDuplicateCount(0);
  };

  // --- CRUD HANDLERS ---
  
  // INLINE SAVE
  const handleInlineSave = (id, field, value) => {
      let finalValue = value;
      
      // Auto-convert number fields
      if (field === 'weight') {
          const num = parseFloat(value);
          finalValue = isNaN(num) ? value : num; // Keep string if invalid to show error
      } else if (field === 'rating') {
          const num = parseFloat(value);
          finalValue = value === '' ? 0 : (isNaN(num) ? value : num);
      } else if (field === 'dob') {
          // Normalize date input inline (e.g. user types 7/11/2011 -> 2011-07-11)
          const normalized = normalizeDate(value);
          if (normalized) {
              finalValue = normalized;
          }
      }

      const updated = roster.map(p => p.id === id ? { ...p, [field]: finalValue } : p);
      onChange(updated);
      setEditingCell(null);
  };

  // MODAL SAVE
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
      
      // Handle numeric sorting safely
      if (typeof aVal === 'string' && !isNaN(parseFloat(aVal))) aVal = parseFloat(aVal);
      if (typeof bVal === 'string' && !isNaN(parseFloat(bVal))) bVal = parseFloat(bVal);

      if (sortConfig.key === 'status') {
          aVal = getPlayerValidationIssues(a).length;
          bVal = getPlayerValidationIssues(b).length;
          if (sortConfig.direction === 'asc') return aVal - bVal;
          return bVal - aVal;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [roster, filter, sortConfig]);

  // Check validity using ONLY the shared model logic
  const isRowInvalid = (player, key) => {
      const issues = getPlayerValidationIssues(player);
      // Map field keys to error messages loosely to highlight cells
      // Note: This relies on the error string containing the field name logic
      if (key === 'firstName') return issues.some(i => i.includes('First Name'));
      if (key === 'lastName') return issues.some(i => i.includes('Last Name'));
      if (key === 'division') return issues.some(i => i.includes('Division'));
      if (key === 'dob') return issues.some(i => i.includes('DOB') || i.includes('Date'));
      if (key === 'weight') return issues.some(i => i.includes('Weight'));
      if (key === 'gender') return issues.some(i => i.includes('Gender'));
      if (key === 'rating') return issues.some(i => i.includes('Rating'));
      return false;
  };

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
                    All fields are required. Incomplete records will be flagged red.
                </p>
            </div>
          </div>
        </div>
      )}

      {/* --- TOOLBAR ROW 1: INTERACT --- */}
      <div className="flex items-center gap-3 shrink-0">
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
      </div>

      {/* --- TOOLBAR ROW 2: POPULATE --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800 shrink-0">
        
        {/* Primary Action */}
        <div className="flex items-center gap-3">
            <Button onClick={() => openModal()} icon={Plus} title="Manually create a single wrestler profile">Add Wrestler</Button>
            
            {onImportFromMaster && (
                <Button 
                    variant="secondary" 
                    onClick={onImportFromMaster} 
                    className="border border-slate-700 text-slate-300"
                    title="Import wrestlers from your team's master roster"
                >
                    <Database size={16} className="mr-2" /> From Master
                </Button>
            )}
        </div>

        {/* Secondary Actions / Utilities */}
        <div className="flex items-center gap-2">
            <Button 
                onClick={handleBulkSetDivision} 
                variant="ghost" 
                className="border border-slate-800 bg-slate-900/50 text-yellow-500 hover:text-yellow-400 hover:bg-slate-800"
                title="Automatically populate the 'Division' field for any wrestler missing this information. Useful after bulk imports."
            >
                <Wand2 size={16} className="mr-2" /> Fill Missing Divs
            </Button>

            <div className="h-6 w-px bg-slate-800 mx-1"></div>

            <div className="flex items-center gap-1">
                <Button variant="ghost" onClick={() => setShowHelp(!showHelp)} className="px-3 text-slate-500 hover:text-white" title="View instructions for importing data">
                    <Info size={18} />
                </Button>
                <Button variant="ghost" onClick={handleDownloadTemplate} className="px-3 text-slate-500 hover:text-white" title="Download a blank CSV template for data entry">
                    <FileDown size={18} />
                </Button>
                <label className="cursor-pointer text-slate-500 hover:text-blue-400 p-2 rounded-lg transition-colors" title="Upload a populated CSV file to add multiple wrestlers at once">
                    <Upload size={18} />
                    <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
                </label>
                <Button variant="ghost" onClick={handleExport} className="px-3 text-slate-500 hover:text-white" title="Export current roster data to a CSV file">
                    <Download size={18} />
                </Button>
            </div>
        </div>
      </div>

      {/* --- TABLE --- */}
      <div className="flex-1 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden flex flex-col min-h-0 relative">
        <div className="absolute inset-0 overflow-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800 text-slate-400 uppercase font-medium sticky top-0 z-10 shadow-sm">
              <tr>
                {[
                  { k: 'status', l: 'Status', w: 'w-10 text-center', tip: 'Overall Validity Status' },
                  { k: 'firstName', l: 'First Name', tip: 'Required Text' },
                  { k: 'lastName', l: 'Last Name', tip: 'Required Text' },
                  { k: 'division', l: 'Division', tip: 'Required (e.g. Varsity, JV). Use "Fill Missing Divs" button to auto-populate empty fields.' },
                  { k: 'dob', l: 'DOB', tip: 'Required (YYYY-MM-DD)' },
                  { k: 'weight', l: 'Weight', tip: 'Required (> 0.0)' },
                  { k: 'rating', l: 'Rating', tip: 'Required (0 - 5)' },
                  { k: 'gender', l: 'Gender', tip: 'Required (M or F)' },
                  { k: 'actions', l: '', tip: 'Actions' }
                ].map(col => (
                  <th 
                    key={col.k} 
                    title={col.tip}
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
                // Validation Checks - Use centralized logic
                const issues = getPlayerValidationIssues(player);
                const complete = issues.length === 0;
                
                return (
                  <tr key={player.id} className="hover:bg-slate-800/50 transition-colors group">
                    {/* Status */}
                    <td className="px-6 py-3 text-center">
                      {complete ? (
                        <div className="flex justify-center"><Check size={16} className="text-green-500" /></div>
                      ) : (
                        <div className="flex justify-center cursor-help" title={issues.join(', ')}>
                           <AlertTriangle size={16} className="text-yellow-500" />
                        </div>
                      )}
                    </td>

                    {/* EDITABLE CELLS */}
                    {[
                        { k: 'firstName', val: player.firstName, type: 'text' },
                        { k: 'lastName', val: player.lastName, type: 'text' },
                        { k: 'division', val: player.division || '', type: 'text' },
                        { k: 'dob', val: player.dob || '', type: 'date' },
                        { k: 'weight', val: player.weight, type: 'text' },
                        { k: 'rating', val: player.rating, type: 'number' },
                        { k: 'gender', val: player.gender, type: 'select', opts: ['M', 'F'] }
                    ].map(cell => {
                        const isEditing = editingCell?.id === player.id && editingCell?.field === cell.k;
                        const isInvalid = isRowInvalid(player, cell.k);
                        const errorClass = isInvalid ? 'border border-red-500 bg-red-500/10 text-red-300' : '';

                        return (
                            <td 
                                key={cell.k}
                                onClick={() => setEditingCell({ id: player.id, field: cell.k })}
                                className={`px-6 py-3 cursor-pointer relative ${errorClass}`}
                            >
                                {isEditing ? (
                                    cell.type === 'select' ? (
                                        <select 
                                            autoFocus
                                            className="bg-slate-950 text-white w-full border border-blue-500 rounded px-1 py-0.5 outline-none"
                                            value={['M','F'].includes(cell.val) ? cell.val : ''}
                                            onChange={(e) => handleInlineSave(player.id, cell.k, e.target.value)}
                                            onBlur={() => setEditingCell(null)}
                                        >
                                            <option value="" disabled>Select</option>
                                            {cell.opts.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    ) : (
                                        <input 
                                            autoFocus
                                            type={cell.type === 'date' && !isValidIsoDate(cell.val) ? 'text' : cell.type} 
                                            className="bg-slate-950 text-white w-full border border-blue-500 rounded px-1 py-0.5 outline-none"
                                            defaultValue={cell.val}
                                            onKeyDown={(e) => {
                                                if(e.key === 'Enter') handleInlineSave(player.id, cell.k, e.target.value);
                                                if(e.key === 'Escape') setEditingCell(null);
                                            }}
                                            onBlur={(e) => handleInlineSave(player.id, cell.k, e.target.value)}
                                        />
                                    )
                                ) : (
                                    <>
                                        {cell.val === '' && isInvalid ? <span className="text-red-500 italic">Required</span> : cell.val}
                                        {isInvalid && <span className="absolute top-1 right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>}
                                    </>
                                )}
                            </td>
                        );
                    })}

                    {/* Actions */}
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); openModal(player); }} className="p-1 hover:text-blue-400" title="Full Edit"><Edit2 size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(player.id); }} className="p-1 hover:text-red-400" title="Delete"><Trash2 size={16} /></button>
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
                  <input required className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Last Name</label>
                  <input required className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Division</label>
                  <input className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Varsity" value={formData.division || ''} onChange={e => setFormData({...formData, division: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Date of Birth</label>
                  <input type="date" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.dob || ''} onChange={e => setFormData({...formData, dob: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Weight</label>
                  <input type="number" step="0.1" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.weight || ''} onChange={e => setFormData({...formData, weight: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Gender</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={['M','F'].includes(formData.gender) ? formData.gender : ''} 
                    onChange={e => setFormData({...formData, gender: e.target.value})}
                  >
                    <option value="" disabled>Select...</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Rating (0-5)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="5" 
                    step="0.1"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" 
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
                        <span className="text-white font-bold">{fullImportData.length > 0 ? fullImportData.length : pendingImport.length + duplicateCount}</span>
                     </div>
                     {duplicateCount > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Skipped Duplicates:</span>
                            <span className="text-blue-400 font-bold">{duplicateCount}</span>
                        </div>
                     )}
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Issues Found:</span>
                        <span className={`font-bold ${pendingImport.some(p => !isPlayerValid(p) || (p.dob && !isValidIsoDate(p.dob))) ? 'text-yellow-500' : 'text-green-500'}`}>
                            {pendingImport.filter(p => !isPlayerValid(p) || (p.dob && !isValidIsoDate(p.dob))).length}
                        </span>
                     </div>
                  </div>
                  
                  {pendingImport.some(p => !isPlayerValid(p)) && (
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
                        <span className="font-medium text-white">Append {pendingImport.length} Records</span>
                        <span className="text-xs text-slate-500 group-hover:text-blue-400">Add to existing</span>
                     </button>
                     <button 
                        onClick={() => confirmImport('replace')}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-red-500 transition-all group"
                     >
                        <span className="font-medium text-white">Replace All Records</span>
                        <span className="text-xs text-slate-500 group-hover:text-red-400">Overwrite entire roster</span>
                     </button>
                  </div>
               </div>
               <div className="p-4 border-t border-slate-800 flex justify-end">
                  <Button variant="ghost" onClick={() => { setShowImportModal(false); setPendingImport([]); setDuplicateCount(0); }}>Cancel</Button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default RosterEditor;