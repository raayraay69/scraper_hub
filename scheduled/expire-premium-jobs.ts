/**
 * Scheduled task to expire premium job listings
 * This script checks for premium jobs with expired promotion_end_date
 * and resets them to free tier
 */

import { Env } from '../../types';
import { getTypedBindings } from '../utils/index';

export async function expirePremiumJobs(env: Env) {
  try {
    const bindings = {
      DB: env.DB,
    };

    // Check for DB binding
    if (!bindings.DB) {
      console.error('[Expire Premium Jobs] ERROR: DB binding is undefined!');
      return { success: false, error: 'Database connection error' };
    }

    const now = new Date().toISOString();

    // Find all premium jobs with expired promotion dates
    const expiredFeaturedJobsResult = await bindings.DB.prepare(`
      SELECT id, is_featured, featured_until
      FROM job_listings
      WHERE is_featured = 1
      AND featured_until < ?
      AND deleted_at IS NULL
    `).bind(now).all();

    const expiredUrgentJobsResult = await bindings.DB.prepare(`
      SELECT id, is_urgent, urgent_until
      FROM job_listings
      WHERE is_urgent = 1
      AND urgent_until < ?
      AND deleted_at IS NULL
    `).bind(now).all();

    const expiredSpotlightJobsResult = await bindings.DB.prepare(`
      SELECT id, is_spotlight, spotlight_until
      FROM job_listings
      WHERE is_spotlight = 1
      AND spotlight_until < ?
      AND deleted_at IS NULL
    `).bind(now).all();

    const expiredFeaturedJobs = expiredFeaturedJobsResult.results || [];
    const expiredUrgentJobs = expiredUrgentJobsResult.results || [];
    const expiredSpotlightJobs = expiredSpotlightJobsResult.results || [];

    const totalExpiredJobs = expiredFeaturedJobs.length + expiredUrgentJobs.length + expiredSpotlightJobs.length;

    if (totalExpiredJobs === 0) {
      console.log('[Expire Premium Jobs] No expired premium jobs found');
      return { success: true, message: 'No expired premium jobs found' };
    }

    // Reset expired featured jobs
    if (expiredFeaturedJobs.length > 0) {
      const resetFeaturedJobsPromises = expiredFeaturedJobs.map(job => {
        return bindings.DB.prepare(`
          UPDATE job_listings
          SET is_featured = 0,
              featured_until = NULL,
              updated_at = ?
          WHERE id = ?
        `).bind(now, job.id).run();
      });
      await Promise.all(resetFeaturedJobsPromises);
      console.log(`[Expire Premium Jobs] Reset ${expiredFeaturedJobs.length} expired featured jobs`);
    }

    // Reset expired urgent jobs
    if (expiredUrgentJobs.length > 0) {
      const resetUrgentJobsPromises = expiredUrgentJobs.map(job => {
        return bindings.DB.prepare(`
          UPDATE job_listings
          SET is_urgent = 0,
              urgent_until = NULL,
              updated_at = ?
          WHERE id = ?
        `).bind(now, job.id).run();
      });
      await Promise.all(resetUrgentJobsPromises);
      console.log(`[Expire Premium Jobs] Reset ${expiredUrgentJobs.length} expired urgent jobs`);
    }

    // Reset expired spotlight jobs
    if (expiredSpotlightJobs.length > 0) {
      const resetSpotlightJobsPromises = expiredSpotlightJobs.map(job => {
        return bindings.DB.prepare(`
          UPDATE job_listings
          SET is_spotlight = 0,
              spotlight_until = NULL,
              updated_at = ?
          WHERE id = ?
        `).bind(now, job.id).run();
      });
      await Promise.all(resetSpotlightJobsPromises);
      console.log(`[Expire Premium Jobs] Reset ${expiredSpotlightJobs.length} expired spotlight jobs`);
    }

    console.log(`[Expire Premium Jobs] Reset ${totalExpiredJobs} expired premium jobs`);
    return {
      success: true,
      message: `Reset ${totalExpiredJobs} expired premium jobs`,
      expiredFeaturedJobs,
      expiredUrgentJobs,
      expiredSpotlightJobs
    };
  } catch (error) {
    console.error('[Expire Premium Jobs] Error expiring premium jobs:', error);
    return { success: false, error: 'Failed to expire premium jobs' };
  }
}
