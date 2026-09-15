export type CourseContentType =
  | 'introduction'
  | 'material'
  | 'movie'
  | 'note'
  | 'reference'
  | 'submission'
  | 'bookReference';

export type CourseDocument = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  source: string;
};

export type CourseVideo = {
  id: string;
  title: string;
  description: string;
  url: string;
};

export type CourseAssignment = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  source?: string;
};

export type CourseLink = {
  id: string;
  title: string;
  url: string;
};

export type CourseBook = {
  id?: string;
  name: string;
  title?: string;
  author?: string;
  source?: string;
  url?: string;
};

export type SubmissionStatus = 'not-submitted' | 'submitted' | 'graded';

export type SubmittedFile = {
  name: string;
  submittedAt: string;
};

export type CourseSubmission = {
  status: SubmissionStatus;
  submittedFile?: SubmittedFile;
  dueDate: string;
  grade?: number | null;
  maxGrade?: number | null;
  feedback?: string | null;
  canEdit?: boolean;
  maxFiles?: number;
  maxFileCount?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
  maxFileSize?: number;
  maxFileSizeUnit?: string;
};

export type CourseContent =
  | {
      id: string;
      type: 'introduction';
      title: string;
      data: { text: string };
    }
  | {
      id: string;
      type: 'material';
      title: string;
      data: { document?: CourseDocument };
    }
  | {
      id: string;
      type: 'movie';
      title: string;
      data: { video?: CourseVideo };
    }
  | {
      id: string;
      type: 'note';
      title: string;
      data: { assignment?: CourseAssignment };
    }
  | {
      id: string;
      type: 'reference';
      title: string;
      data: { link?: CourseLink };
    }
  | {
      id: string;
      type: 'submission';
      title: string;
      description?: string;
      data: CourseSubmission;
    }
  | {
      id: string;
      type: 'bookReference';
      title: string;
      data: { books: CourseBook[] };
    };

export type CourseDetail = {
  id: string;
  code: string;
  title: string;
  instructor: string;
  content: CourseContent[];
};
