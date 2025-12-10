import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Edit2, 
  Trash2, 
  ArrowUpDown, 
  Calendar,
  MapPin,
  Clock,
  Circle,
  Loader,
  TriangleAlert,
  CheckCircle,
  Globe,
  Plus 
} from 'lucide-react';
import { formatDate, Button } from '../utils'; 

const STATUS_CONFIG = {
  not_started: { icon: Circle, color: 'text-slate-500', bg: 'bg-slate-500/10', label: 'Not Started' },
  in_progress: { icon: Loader, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'In Progress' },
  issue: { icon: TriangleAlert, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Issue' },
  complete: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Complete' },
  published: { icon: Globe, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Published' }
};

const ScheduleList = ({ schedules = [], onEdit, onDelete, onCreate }) => { 
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' }); 

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key) {
        direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } 
    setSortConfig({ key, direction });
  };

  const processedSchedules = useMemo(() => {
    let data = [...schedules];
    
    // Filter
    if (filter) {
      const lower = filter.toLowerCase();
      data = data.filter(s => 
        s.name.toLowerCase().includes(lower) || 
        s.location?.toLowerCase().includes(lower)
      );
    }

    // Sort
    data.sort((a, b) => {
      let aVal = a[sortConfig.key] || '';
      let bVal = b[sortConfig.key] || '';
      let comparison = 0;

      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;

      // Secondary Sort: Event Name (if Dates are equal)
      if (comparison === 0 && sortConfig.key === 'date') {
          return a.name.localeCompare(b.name);
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return data;
  }, [schedules, filter, sortConfig]);

  return (
    <div className="flex flex-col h-full bg-slate-800/50 border border-slate-700 rounded-xl p-6 min-h-0">
      
      {/* --- SEARCH BAR --- */}
      <div className="mb-4">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
                type="text" 
                placeholder="Search events..." 
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
        </div>
      </div>

      {/* --- ACTION BUTTONS --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 shrink-0">
        {onCreate && (
           <Button onClick={onCreate} icon={Plus}>New Event</Button>
        )}
      </div>

      {/* --- TABLE CONTAINER --- */}
      <div className="flex-1 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden flex flex-col min-h-0 relative">
        <div className="absolute inset-0 overflow-auto">
            <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800 text-slate-400 uppercase font-medium sticky top-0 z-10 shadow-sm">
                <tr>
                {[
                    { k: 'date', l: 'Date' },
                    { k: 'name', l: 'Event Name' },
                    { k: 'location', l: 'Location' },
                    { k: 'schedulingStatus', l: 'Status' },
                    { k: 'wrestlerCount', l: 'Wrestlers' },
                    { k: 'actions', l: '' }
                ].map(col => (
                    <th 
                    key={col.k} 
                    className="px-6 py-3 cursor-pointer hover:text-white"
                    onClick={() => col.k !== 'actions' && handleSort(col.k)}
                    >
                    <div className="flex items-center gap-1">
                        {col.l}
                        {col.k !== 'actions' && <ArrowUpDown size={12} className={sortConfig.key === col.k ? 'text-blue-400' : 'opacity-30'} />}
                    </div>
                    </th>
                ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
                {processedSchedules.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">No events found.</td></tr>
                ) : processedSchedules.map(event => {
                const status = STATUS_CONFIG[event.schedulingStatus] || STATUS_CONFIG['not_started'];
                const StatusIcon = status.icon;
                
                // Calculate total wrestlers (Host + Guests)
                const hostCount = event.rosterSnapshot?.length || 0;
                const guestCount = event.participatingTeams?.reduce((acc, t) => acc + (t.roster?.length || 0), 0) || 0;
                const totalWrestlers = hostCount + guestCount;

                return (
                    <tr key={event.id} className="hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-500"/>
                            {formatDate(event.date)}
                        </div>
                        {!event.isTimeTbd && event.time && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            <Clock size={12} />
                            {event.time}
                            </div>
                        )}
                    </td>
                    <td className="px-6 py-4 font-medium text-blue-400 group-hover:underline cursor-pointer" onClick={() => onEdit(event)}>
                        {event.name}
                    </td>
                    <td className="px-6 py-4">
                        {event.isLocationTbd ? (
                        <span className="text-slate-500 italic">TBD</span>
                        ) : (
                        <div className="flex items-center gap-2">
                            {event.location && <MapPin size={14} className="text-slate-500" />}
                            {event.location || '-'}
                        </div>
                        )}
                    </td>
                    <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/5 ${status.bg} ${status.color}`}>
                        <StatusIcon size={14} />
                        <span className="text-xs font-bold">{status.label}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                        {totalWrestlers}
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(event)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-400 transition-colors" title="Edit Event">
                            <Edit2 size={16} />
                        </button>
                        <button onClick={() => onDelete(event.id)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors" title="Delete Event">
                            <Trash2 size={16} />
                        </button>
                        </div>
                    </td>
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

export default ScheduleList;