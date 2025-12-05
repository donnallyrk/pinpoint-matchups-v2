import React from 'react';
import { 
  Calendar, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Circle, 
  TriangleAlert, 
  CheckCircle, 
  Globe,
  Loader
} from 'lucide-react';
import { formatDate } from '../utils';

const STATUS_CONFIG = {
  not_started: { icon: Circle, color: 'text-slate-500', bg: 'bg-slate-500/10', label: 'Not Started' },
  in_progress: { icon: Loader, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'In Progress' },
  issue: { icon: TriangleAlert, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Issue' },
  complete: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Complete' },
  published: { icon: Globe, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Published' }
};

const EventCard = ({ event, onClick }) => {
  const status = STATUS_CONFIG[event.schedulingStatus] || STATUS_CONFIG['not_started'];
  const StatusIcon = status.icon;

  return (
    <div 
      onClick={() => onClick(event)}
      className="group relative flex flex-col p-5 bg-slate-800 border border-slate-700 rounded-xl hover:border-blue-500/50 hover:shadow-lg transition-all cursor-pointer h-full"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
          <Calendar size={20} />
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full border border-white/5 ${status.bg} ${status.color}`}>
          <StatusIcon size={12} />
          <span className="text-[10px] font-bold uppercase tracking-wide">{status.label}</span>
        </div>
      </div>
      
      <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors line-clamp-1">
        {event.name}
      </h3>
      <p className="text-slate-400 text-sm mb-4 font-medium">
        {formatDate(event.date)}
      </p>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-xs text-slate-500">
          <Clock size={14} className="mr-2" />
          {event.isTimeTbd ? 'Time TBD' : (event.time || 'No time set')}
        </div>
        <div className="flex items-center text-xs text-slate-500">
          <MapPin size={14} className="mr-2" />
          {event.isLocationTbd ? 'Location TBD' : (event.location || 'No location set')}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-700/50">
        <div className="text-xs text-slate-500">
          {event.rosterSnapshot?.length || 0} Wrestlers
        </div>
        <ChevronRight size={16} className="text-slate-500 group-hover:text-white transform group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
};

export default EventCard;