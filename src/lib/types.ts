export type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  cover_url: string | null;
  category: string;
  level: string;
  price_cents: number;
  currency: string;
  status: string;
  instructor: string;
  learning_outcomes: string[];
  requirements: string[];
  featured: boolean;
  created_at?: string;
  modules?: Module[];
  lessons?: Lesson[];
};
export type Module = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  lessons?: Lesson[];
};
export type Lesson = {
  id: string;
  course_id: string;
  module_id: string;
  title: string;
  description: string;
  duration_seconds: number;
  position: number;
  is_preview: boolean;
};
export type Progress = {
  user_id: string;
  lesson_id: string;
  position_seconds: number;
  completed: boolean;
  updated_at: string;
};
