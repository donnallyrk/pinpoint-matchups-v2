import React from 'react';
import { Card } from '../utils';
import { MapPin, Clock, Calendar } from 'lucide-react';

const Step1_EventDetails = ({ event, onUpdate }) => {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white">Event Basics</h2>
        <p className="text-slate-400 mt-1">Let's start by defining the core details of your event.</p>
      </div>

      <Card className="p-8 space-y-6 border-t-4 border-t-blue-600">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Event Name
          </label>
          <input
            autoFocus
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-lg text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-700"
            placeholder="e.g. Winter Varsity Duals"
            value={event.name}
            onChange={e => onUpdate(event.id, { name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between mb-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={14}/> Date
                </label>
                <label className="flex items-center text-xs text-slate-500 cursor-pointer hover:text-blue-400 transition-colors">
                    <input
                        type="checkbox"
                        className="mr-2 rounded border-slate-700 bg-slate-900"
                        checked={event.isDateTbd || false} // Handle undefined
                        onChange={e => onUpdate(event.id, { isDateTbd: e.target.checked })}
                    />
                    Set TBD
                </label>
            </div>
            {/* style={{ colorScheme: 'dark' }} forces the browser's native date picker 
                to use light text/icons, making the calendar icon readable on dark backgrounds.
            */}
            <input
              type="date"
              disabled={event.isDateTbd}
              onKeyDown={(e) => e.preventDefault()} // Disables manual typing, forces picker
              onClick={(e) => e.target.showPicker && e.target.showPicker()} // Tries to open picker on click
              style={{ colorScheme: 'dark' }} 
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              value={event.date || ''}
              onChange={e => onUpdate(event.id, { date: e.target.value })}
            />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                 <Clock size={14}/> Start Time
              </label>
              <label className="flex items-center text-xs text-slate-500 cursor-pointer hover:text-blue-400 transition-colors">
                <input
                  type="checkbox"
                  className="mr-2 rounded border-slate-700 bg-slate-900"
                  checked={event.isTimeTbd}
                  onChange={e => onUpdate(event.id, { isTimeTbd: e.target.checked })}
                />
                Set TBD
              </label>
            </div>
            <input
              type="time"
              disabled={event.isTimeTbd}
              style={{ colorScheme: 'dark' }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white disabled:opacity-30 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 outline-none"
              value={event.time || ''}
              onChange={e => onUpdate(event.id, { time: e.target.value })}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
               <MapPin size={14}/> Location
            </label>
            <label className="flex items-center text-xs text-slate-500 cursor-pointer hover:text-blue-400 transition-colors">
              <input
                type="checkbox"
                className="mr-2 rounded border-slate-700 bg-slate-900"
                checked={event.isLocationTbd}
                onChange={e => onUpdate(event.id, { isLocationTbd: e.target.checked })}
              />
              Set TBD
            </label>
          </div>
          <input
            type="text"
            disabled={event.isLocationTbd}
            placeholder="Venue Name or Address..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white disabled:opacity-30 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 outline-none"
            value={event.location || ''}
            onChange={e => onUpdate(event.id, { location: e.target.value })}
          />
        </div>
      </Card>
    </div>
  );
};

export default Step1_EventDetails;