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
  rating: 0,     // Integer Elo
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

// --- VALIDATION UTILS ---

/**
 * Checks a wrestler object for required fields and data validity.
 * @param {Object} p - The player/wrestler object
 * @returns {Array} - Array of error strings. Empty array means valid.
 */
export const getPlayerValidationIssues = (p) => {
  const issues = [];
  
  // All fields required check
  if (!p.firstName || p.firstName.trim() === '') issues.push('Missing First Name');
  if (!p.lastName || p.lastName.trim() === '') issues.push('Missing Last Name');
  if (!p.division || p.division.trim() === '') issues.push('Missing Division');
  
  // Weight must be a positive number
  if (typeof p.weight !== 'number' || isNaN(p.weight) || p.weight <= 0) {
    issues.push('Invalid Weight (Must be > 0)');
  }
  
  if (!['M', 'F'].includes(p.gender)) issues.push('Invalid Gender (Must be M or F)');
  
  // Rating must be 0-5
  if (p.rating === null || isNaN(p.rating) || p.rating < 0 || p.rating > 5) {
    issues.push('Invalid Rating (0-5)');
  }
  
  // Strict Date Check: Must be YYYY-MM-DD
  if (!p.dob) {
      issues.push('Missing DOB');
  } else {
      // Regex for YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(p.dob)) {
          issues.push('Invalid Date Format (YYYY-MM-DD)');
      } else {
          // Logical Check (No future dates, reasonable age)
          const d = new Date(p.dob);
          const now = new Date();
          if (isNaN(d.getTime())) {
              issues.push('Invalid Date');
          } else if (d > now) {
              issues.push('Future Date of Birth');
          } else if (d.getFullYear() < 1900) { // Basic sanity check
              issues.push('Invalid Year');
          }
      }
  }
  
  return issues;
};

export const isPlayerValid = (p) => getPlayerValidationIssues(p).length === 0;