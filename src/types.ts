export type ControlPosition = 'tower' | 'ground' | 'flight_data' | 'par_asr' | 'radar_approach';

export interface Aircraft {
  id: string;
  callsign: string;
  type: 'MV-22B' | 'AH-1Z' | 'UH-1Y' | 'CH-53K' | 'F-35B' | 'C-130' | 'C-12' | 'H-60' | 'C172';
  category: 'rotary' | 'tiltrotor' | 'jet' | 'prop' | 'heavy';
  x: number; // Nautical miles from KNFG field center (-6 to +6)
  y: number; // Nautical miles from KNFG field center (-6 to +6)
  altitude: number; // feet MSL
  heading: number; // degrees 0 - 359
  speed: number; // knots
  targetAltitude: number;
  targetHeading: number;
  targetSpeed: number;
  squawk: string;
  status: 'inbound' | 'outbound' | 'pattern' | 'final_approach' | 'par_final' | 'taxiing' | 'holding' | 'departed';
  assignedRunway?: string;
  assignedPad?: string;
  clearanceState?: string;
  isEmergency?: boolean;
  emergencyType?: string;
  history: { x: number; y: number }[];
  lastInstruction?: string;
  pilotReadback?: string;
}

export interface Waypoint {
  id: string;
  name: string;
  code: string;
  x: number; // NM
  y: number; // NM
  type: 'fix' | 'navaid' | 'reporting_point' | 'helipad' | 'runway_threshold';
  description?: string;
}

export interface Flashcard {
  id: string;
  category: 'Class D Rules' | 'Phraseology' | 'KNFG Airfield' | 'Emergency & SVFR' | 'PAR/ASR GCA' | 'LOPs & LOAs';
  question: string;
  answer: string;
  reference: string;
  difficulty: 'Basic' | 'Intermediate' | 'Advanced';
}

export interface ExamQuestion {
  id: string;
  position: ControlPosition;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  reference: string;
}

export interface ATCScenario {
  id: string;
  title: string;
  position: ControlPosition;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Emergency';
  weather: {
    visibility: string;
    ceiling: string;
    wind: string;
    altimeter: string;
    condition: 'VFR' | 'MVFR' | 'IFR' | 'SVFR';
  };
  runwayInUse: '03' | '21';
  objective: string;
  aircraftList: Partial<Aircraft>[];
}

export interface ATISError {
  code: string;
  wind: string;
  visibility: string;
  ceiling: string;
  temp: string;
  dewpoint: string;
  altimeter: string;
  runwayInUse: string;
  remarks: string;
}

export interface StudyQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  reference: string;
}

export interface StudyTopic {
  id: string;
  title: string;
  category: 'departure' | 'arrival' | 'emergency' | 'airspace_svfr' | 'lops' | 'par_gca';
  iconName: string;
  summary: string;
  keyPoints: string[];
  phraseologyExamples: { scenario: string; atcCall: string; pilotReadback: string }[];
  reference: string;
  quizQuestions: StudyQuizQuestion[];
}

export interface SimEvaluation {
  timestamp: string;
  callsign: string;
  command: string;
  readback: string;
  score: number;
  feedback: string;
  isSeparationValid: boolean;
  efficiencyRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_WORK' | 'CRITICAL_HAZARD';
  responseTime?: number;
  complianceScore?: number;
}

