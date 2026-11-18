export interface Coach {
  _id: string;
  name: string;
  focus: string;
}

export interface TimeGroup {
  label: string;      // Morning, Afternoon, Evening
  times: string[];    // "9:00 AM", ...
}

// Everything the lesson page needs, from GET /api/lessons
export interface LessonInfo {
  name: string;
  description: string;
  price: number;
  coaches: Coach[];
  timeGroups: TimeGroup[];
}

// From GET /api/lessons/availability
export interface Availability {
  coach: string;
  date: string;
  bookedTimes: string[];
}
