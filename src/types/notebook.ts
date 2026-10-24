import { PageFormat, BackgroundPattern, Stroke } from './canvas';

export interface Subject {
  id: string;
  name: string;
  code?: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface Notebook {
  id: string;
  subjectId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface PageData {
  id: string;
  notebookId: string;
  pageNumber: number;
  format: PageFormat;
  pattern: BackgroundPattern;
  strokes: Stroke[];
  createdAt: number;
  updatedAt: number;
}

