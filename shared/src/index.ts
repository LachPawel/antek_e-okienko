// Accident Report Types
export interface AccidentReport {
  id: string;
  citizenId: string;
  dateTime: Date;
  location: string;
  description: string;
  witnesses: string[];
  medicalInfo: {
    injuries: string;
    medicalAid: string;
    hospital?: string;
  };
  businessContext: string; // Description of connection to business activity
  extractedEntities: ExtractedEntities;
  conversationTranscript: ConversationMessage[];
  status: 'draft' | 'submitted' | 'reviewing' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtractedEntities {
  date?: string;
  time?: string;
  location?: string;
  medicalInfo?: string;
  businessConnection?: string;
  witnesses?: string[];
  cause?: string;
}

export interface ConversationMessage {
  role: 'citizen' | 'ai' | 'system';
  content: string;
  timestamp: Date;
}

// Legal Criteria Analysis
export interface LegalCriteria {
  suddenEvent: {
    score: number; // 0-1 confidence
    reasoning: string;
    citedArticle?: string;
  };
  externalCause: {
    score: number;
    reasoning: string;
    citedArticle?: string;
  };
  businessConnection: {
    score: number;
    reasoning: string;
    citedArticle?: string;
  };
}

export interface AIRecommendation {
  verdict: 'APPROVE' | 'REJECT' | 'AMBIGUOUS';
  confidence: number; // 0-1
  criteria: LegalCriteria;
  summary: string;
  reasoning: string[];
  generatedAt: Date;
}

export interface OfficialDecision {
  reportId: string;
  officialId: string;
  verdict: 'APPROVE' | 'REJECT';
  notes: string;
  overriddenAIRecommendation: boolean;
  decidedAt: Date;
}

// UI/State Types
export type RoleMode = 'citizen' | 'official';

export interface AppState {
  currentRole: RoleMode;
  currentReport?: AccidentReport;
  aiRecommendation?: AIRecommendation;
  isProcessing: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}
