import { ModerationAdvertStatus } from '@/models/response/moderation-advert-response.model';

/** Matches BE AdminTransitionAllowed (phase-one OpenAPI). */
export type ModerationAction = 'approve' | 'requestChanges' | 'reject' | 'suspend';

export function allowedModerationActions(status: ModerationAdvertStatus | string): ModerationAction[] {
  switch (status) {
    case 'PENDING_REVIEW':
      return ['approve', 'requestChanges', 'reject'];
    case 'PUBLISHED':
      return ['suspend'];
    default:
      return [];
  }
}

export function canModerationAction(
  status: ModerationAdvertStatus | string,
  action: ModerationAction,
): boolean {
  return allowedModerationActions(status).includes(action);
}
