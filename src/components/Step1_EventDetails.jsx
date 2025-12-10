import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Calendar, FileText } from 'lucide-react';
import { Card } from '../utils';
import PageHeader from './PageHeader';

const Step1_EventDetails = ({ event, onUpdate }) => {
  // 1. LOCAL STATE: Holds the value while you type (Instant)
  const [localData, setLocalData] = useState({
      name: event.name || '',
      date: event.date || '',
      time: event.time || '',
      location: event.location || '',
      notes: event.notes || ''
  });

  // 2. SYNC EFFECT: Updates local state if you switch to a different event
  useEffect(() => {
    setLocalData({
      name: event.name || '',
      date: event.date || '',
      time: event.time || '',
      location: event.location || '',
      notes: event.notes || ''
  });
  }, [event.id]); 

  // 3. HANDLER: Updates ONLY the local state (No Database Lag)
  const handleChange = (field, value) => {
      setLocalData(prev => ({ ...prev, [field]: value }));
  };

  // 4. SAVE HANDLER: Updates Database ONLY when you leave the field (onBlur)
  const handleBlur = (field) => {
      if (localData[field] !== event[field]) {
          onUpdate(event.id, { [field]: localData[field] });
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 h-full flex flex-col">
      
      {/* Header Section */}
      <PageHeader 
        title="Event Setup" 
        description="Define the core logistics for this matchup event." 
      />

      {/* Core Content Container */}
      <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl p-6 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Main Details Card - Inner */}
            <div className="md:col-span-2 space-y-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Event Name</label>
                    <input 
                        className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-600"
                        placeholder="e.g. Winter Varsity Duals"
                        value={localData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        onBlur={() => handleBlur('name')}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Calendar size={14}/> Date
                        </label>
                        <input 
                            type="date"
                            className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={localData.date}
                            onChange={(e) => handleChange('date', e.target.value)}
                            onBlur={() => handleBlur('date')}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Clock size={14}/> Start Time
                        </label>
                        <input 
                            type="time"
                            className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={localData.time}
                            onChange={(e) => handleChange('time', e.target.value)}
                            onBlur={() => handleBlur('time')}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <MapPin size={14}/> Location
                    </label>
                    <input 
                        className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Enter venue name or address..."
                        value={localData.location}
                        onChange={(e) => handleChange('location', e.target.value)}
                        onBlur={() => handleBlur('location')}
                    />
                </div>
            </div>

            {/* Sidebar / Notes - Inner */}
            <div className="flex flex-col h-full">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <FileText size={14}/> Event Notes
                </label>
                <textarea 
                    className="flex-1 w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm leading-relaxed min-h-[200px]"
                    placeholder="Add specific instructions for coaches, weigh-in times, or parking info..."
                    value={localData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    onBlur={() => handleBlur('notes')}
                />
            </div>

        </div>
      </div>
    </div>
  );
};

export default Step1_EventDetails;