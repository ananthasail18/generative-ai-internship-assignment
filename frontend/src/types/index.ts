export type User = {
  id: number;
  name: string;
  email: string;
  image?: string | null;
  oauth_provider?: string | null;
  created_at: string;
};

export type Document = {
  id: number;
  user_id: number;
  filename: string;
  file_size: number;
  page_count: number;
  title?: string | null;
  author?: string | null;
  upload_date: string;
  has_course: boolean;
};

export type Story = {
  id: number;
  analogy?: string | null;
  story?: string | null;
  real_world_example?: string | null;
  practical_application?: string | null;
  beginner_explanation?: string | null;
};

export type Flashcard = {
  id: number;
  question: string;
  answer: string;
  quick_notes?: string | null;
  memory_tricks?: string | null;
};

export type QuizQuestion = {
  id: number;
  question_type: string;
  question: string;
  options?: Record<string, any> | null;
  correct_answer: string;
  difficulty?: string | null;
  explanation?: string | null;
};

export type Lesson = {
  id: number;
  topic_id: number;
  title: string;
  content: string;
  order: number;
  completed: boolean;
  time_spent: number;
  
  introduction?: string | null;
  explanation?: string | null;
  concepts?: Record<string, any> | null;
  examples?: Record<string, any> | null;
  key_takeaways?: Record<string, any> | null;
  important_notes?: Record<string, any> | null;
  summary?: string | null;
  
  stories: Story[];
  flashcards: Flashcard[];
  quizzes: QuizQuestion[];
};

export type Topic = {
  id: number;
  chapter_id: number;
  title: string;
  order: number;
  lessons: Lesson[];
};

export type Chapter = {
  id: number;
  course_id: number;
  title: string;
  order: number;
  topics: Topic[];
};

export type Course = {
  id: number;
  document_id: number;
  title: string;
  description?: string | null;
  difficulty: string;
  estimated_time: number;
  created_at: string;
  total_lessons: number;
  completed_lessons: number;
  progress_percent: number;
};

export type CourseDetail = Course & {
  chapters: Chapter[];
};

export type DashboardProgress = {
  overall_progress_percent: number;
  total_courses: number;
  total_lessons_completed: number;
  total_lessons: number;
  continue_learning: Course[];
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user?: User | null;
};

export type ApiError = {
  detail?: string;
  message?: string;
};
