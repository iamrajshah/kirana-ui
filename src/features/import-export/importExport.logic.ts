import type { ImportJob, ImportType } from '@core/api/importExportApi';

export const filterImportJobsByType = (jobs: ImportJob[], type: ImportType): ImportJob[] =>
  jobs.filter((job) => job.type === type || job.import_type === type);

export const canCommitImportJob = (job: ImportJob): boolean =>
  job.status === 'COMPLETED' && job.row_counts.valid > 0;

export const hasActiveImportJobs = (jobs: ImportJob[]): boolean =>
  jobs.some((job) => job.status === 'PENDING' || job.status === 'PROCESSING');
