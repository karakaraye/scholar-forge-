import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  authApi: {},
  collaborationApi: {
    myInvitations: vi.fn().mockResolvedValue([
      {
        token: 'tok-123',
        project_id: 'proj-1',
        project_title: 'Mobile Money and Savings',
        project_owner_name: 'Ada Owner',
        invited_by_name: 'Ada Owner',
        invitee_email: 'me@uni.edu',
        role: 'CO_AUTHOR',
        role_label: 'Co-Author',
        assigned_sections_count: 0,
        status: 'PENDING',
        is_expired: false,
        expires_at: '2026-11-20T00:00:00Z',
        created_at: '2026-11-10T00:00:00Z',
      },
    ]),
  },
}));

import { safeRedirectPath } from '@/context/AuthContext';
import PendingInvitationsBanner from '@/components/collaboration/PendingInvitationsBanner';

describe('safeRedirectPath', () => {
  it('allows same-site relative paths', () => {
    expect(safeRedirectPath('/invitations/abc')).toBe('/invitations/abc');
  });

  it('falls back to the dashboard for missing or external destinations', () => {
    expect(safeRedirectPath(null)).toBe('/dashboard');
    expect(safeRedirectPath('')).toBe('/dashboard');
    expect(safeRedirectPath('https://evil.example.com')).toBe('/dashboard');
    expect(safeRedirectPath('//evil.example.com')).toBe('/dashboard');
    expect(safeRedirectPath('/\\evil.example.com')).toBe('/dashboard');
  });
});

describe('PendingInvitationsBanner', () => {
  it('lists pending invitations with a review link', async () => {
    render(<PendingInvitationsBanner />);

    await waitFor(() => {
      expect(screen.getByText(/You have 1 pending project invitation/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Mobile Money and Savings')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/invitations/tok-123');
  });
});
