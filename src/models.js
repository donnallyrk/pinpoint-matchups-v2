/**
 * GridPoint SaaS Data Models
 * Contains factory functions to ensure consistent data structure.
 */

import { serverTimestamp } from 'firebase/firestore';

// --- COLLECTIONS ---
export const COLLECTIONS = {
  USERS: 'users',
  TEAMS: 'teams',
  EVENTS: 'schedules',
  ROSTER: 'roster'
};

// --- FACTORIES ---

export const createTeam = (ownerId, name, abbreviation = '', coaches = []) => ({
  metadata: {
    name,
    abbreviation: abbreviation || name.substring(0, 3).toUpperCase(),
    sport: 'Wrestling',
    ownerId,
    defaultLocation: '', // New field for default event location
    logoUrl: '', 
    createdAt: serverTimestamp()
  },
  roles: {
    owner: ownerId,
    coaches: coaches, // Array of emails (strings) for now
    members: []  
  },
  subscription: {
    status: 'free',
    planId: null
  },
  // We store the roster on the parent doc for Phase 1 simplicity
  roster: [] 
});

/**
 * Creates a new Wrestler/Player
 */
export const createPlayer = (firstName, lastName) => ({
  id: crypto.randomUUID(),
  firstName,
  lastName,
  division: '',     // e.g., Varsity, JV, 106lbs
  dob: '',          // YYYY-MM-DD
  weight: 0.0,      // Number with 1 decimal
  gender: 'M',      // 'M' | 'F'
  rating: 1000,     // Integer Elo
  active: true,
  stats: {
    matches: 0,
    wins: 0
  }
});

/**
 * Creates a new Event/Schedule
 */
export const createSchedule = (name, date, creatorId) => ({
  name,
  date,             // YYYY-MM-DD
  time: '',         // HH:MM 24hr format
  isTimeTbd: false,
  location: '',
  isLocationTbd: false,
  
  // Status Workflow: 'not_started' | 'in_progress' | 'issue' | 'complete' | 'published'
  schedulingStatus: 'not_started', 
  
  notes: '',
  created_by: creatorId,
  created_at: serverTimestamp(),
  rosterSnapshot: [], 
  matchups: null      
});