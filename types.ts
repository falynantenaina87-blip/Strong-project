export interface Location {
  lat: number;
  lng: number;
}

export interface BusinessData {
  name: string;
  rating?: number;
  userRatingCount?: number;
  phone?: string;
  website?: string;
  address?: string;
  email?: string; // Nouveau champ
  placeId?: string;
}

export interface AIInsight {
  score: number; // 0 to 10
  analysis_summary: string;
  suggested_offer: string;
  is_target: boolean;
  prospection_reason?: string;
}

export type UserStatus = 'New' | 'Contacted' | 'Ignored' | 'Signed';

export interface Prospect {
  id: string;
  business_data: BusinessData;
  location: Location;
  ai_insight?: AIInsight;
  user_status: UserStatus;
  createdAt: number;
}

export interface SearchResult {
  business_data: BusinessData;
  location: Location;
  source_id: string;
}