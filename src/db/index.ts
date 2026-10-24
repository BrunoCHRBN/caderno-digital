import Dexie, { type EntityTable } from 'dexie';
import { Subject, Notebook, PageData } from '../types/notebook';

const db = new Dexie('CadernoDigitalDB') as Dexie & {
  subjects: EntityTable<Subject, 'id'>;
  notebooks: EntityTable<Notebook, 'id'>;
  pages: EntityTable<PageData, 'id'>;
};

// Schema declaration
db.version(1).stores({
  subjects: 'id, name, createdAt, updatedAt',
  notebooks: 'id, subjectId, title, createdAt, updatedAt',
  pages: 'id, notebookId, pageNumber, format, updatedAt'
});

export { db };

export async function initializeDatabase() {
  const subjectCount = await db.subjects.count();
  if (subjectCount === 0) {
    const defaultSubjectId = 'sub-calculo-1';
    const defaultNotebookId = 'nb-derivadas-integrais';
    const defaultPageId = 'page-1';
    const now = Date.now();

    await db.subjects.add({
      id: defaultSubjectId,
      name: 'Cálculo Diferencial',
      code: 'MAT-101',
      color: '#1D4ED8', // Azul sóbrio
      createdAt: now,
      updatedAt: now
    });

    await db.notebooks.add({
      id: defaultNotebookId,
      subjectId: defaultSubjectId,
      title: 'Derivadas e Integrais',
      createdAt: now,
      updatedAt: now
    });

    await db.pages.add({
      id: defaultPageId,
      notebookId: defaultNotebookId,
      pageNumber: 1,
      format: 'a4',
      pattern: 'lined',
      strokes: [],
      createdAt: now,
      updatedAt: now
    });
  }
}

