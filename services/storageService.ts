import { Prospect, UserStatus } from '../types';

const STORAGE_KEY = 'maps_prospector_db';

export const saveProspect = (prospect: Prospect): void => {
  const currentDB = getProspects();
  // Check if exists
  const exists = currentDB.find(p => p.id === prospect.id);
  if (exists) {
    const updated = currentDB.map(p => p.id === prospect.id ? prospect : p);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...currentDB, prospect]));
  }
};

export const getProspects = (): Prospect[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const updateProspectStatus = (id: string, status: UserStatus): void => {
  const prospects = getProspects();
  const updated = prospects.map(p => p.id === id ? { ...p, user_status: status } : p);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const deleteProspect = (id: string): void => {
  const prospects = getProspects();
  const updated = prospects.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};