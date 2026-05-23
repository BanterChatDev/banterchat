import { request } from './client';
import { r } from './routes';

export function apiCreateReport(targetType, targetId, reason = '') {
  return request('POST', r.reports.create(), { target_type: targetType, target_id: targetId, reason });
}

export function apiListReports({ status = 'open', limit = 50, offset = 0 } = {}) {
  return request('GET', `${r.admin.reports()}?status=${encodeURIComponent(status)}&limit=${limit}&offset=${offset}`);
}

export function apiResolveReport(reportId, action = 'dismiss') {
  return request('POST', r.admin.resolve(reportId), { action });
}