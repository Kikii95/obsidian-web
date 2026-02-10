import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShareCard } from './share-card'
import type {
  ShareDisplayData,
  ShareCardHandlers,
  ShareCardState,
  ShareCardUtils,
} from '@/types/shares'

const mockShare: ShareDisplayData = {
  id: 'share-1',
  token: 'abc123',
  shareType: 'folder',
  folderPath: 'Notes/Daily',
  folderName: 'Daily',
  name: 'My Daily Notes',
  includeSubfolders: true,
  mode: 'reader',
  createdAt: '2025-01-15T10:00:00Z',
  expiresAt: '2025-01-22T10:00:00Z',
  accessCount: 5,
  isExpired: false,
}

const mockHandlers: ShareCardHandlers = {
  onDelete: vi.fn(),
  onCopy: vi.fn(),
  onRename: vi.fn().mockResolvedValue(true),
}

const mockState: ShareCardState = {
  deletingId: null,
  copiedToken: null,
}

const mockUtils: ShareCardUtils = {
  formatDate: (date: string) => new Date(date).toLocaleDateString('fr-FR'),
  getTimeRemaining: () => '7j restants',
}

describe('ShareCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders share name and path', () => {
      render(
        <ShareCard
          share={mockShare}
          handlers={mockHandlers}
          state={mockState}
          utils={mockUtils}
        />
      )

      expect(screen.getByText('My Daily Notes')).toBeInTheDocument()
      expect(screen.getByText('Notes/Daily')).toBeInTheDocument()
    })

    it('shows folder icon for folder shares', () => {
      render(
        <ShareCard
          share={mockShare}
          handlers={mockHandlers}
          state={mockState}
          utils={mockUtils}
        />
      )

      expect(screen.getByText('Dossier + sous-dossiers')).toBeInTheDocument()
    })

    it('shows note icon for note shares', () => {
      const noteShare: ShareDisplayData = {
        ...mockShare,
        shareType: 'note',
        includeSubfolders: false,
      }

      render(
        <ShareCard
          share={noteShare}
          handlers={mockHandlers}
          state={mockState}
          utils={mockUtils}
        />
      )

      expect(screen.getByText('Note')).toBeInTheDocument()
    })

    it('shows reader mode badge', () => {
      render(
        <ShareCard
          share={mockShare}
          handlers={mockHandlers}
          state={mockState}
          utils={mockUtils}
        />
      )

      expect(screen.getByText('Lecture')).toBeInTheDocument()
    })

    it('shows writer mode badge', () => {
      const writerShare: ShareDisplayData = { ...mockShare, mode: 'writer' }

      render(
        <ShareCard
          share={writerShare}
          handlers={mockHandlers}
          state={mockState}
          utils={mockUtils}
        />
      )

      expect(screen.getByText('Écriture')).toBeInTheDocument()
    })

    it('shows access count', () => {
      render(
        <ShareCard
          share={mockShare}
          handlers={mockHandlers}
          state={mockState}
          utils={mockUtils}
        />
      )

      expect(screen.getByText('5 vues')).toBeInTheDocument()
    })

    it('shows time remaining', () => {
      render(
        <ShareCard
          share={mockShare}
          handlers={mockHandlers}
          state={mockState}
          utils={mockUtils}
        />
      )

      expect(screen.getByText('7j restants')).toBeInTheDocument()
    })
  })

  describe('expired shares', () => {
    it('hides copy and open buttons for expired shares', () => {
      const expiredShare: ShareDisplayData = { ...mockShare, isExpired: true }

      render(
        <ShareCard
          share={expiredShare}
          handlers={mockHandlers}
          state={mockState}
          utils={mockUtils}
        />
      )

      expect(screen.queryByTitle('Copier le lien')).not.toBeInTheDocument()
      expect(screen.queryByTitle('Ouvrir le lien')).not.toBeInTheDocument()
    })

    it('still shows delete button for expired shares', () => {
      const expiredShare: ShareDisplayData = { ...mockShare, isExpired: true }

      render(
        <ShareCard
          share={expiredShare}
          handlers={mockHandlers}
          state={mockState}
          utils={mockUtils}
        />
      )

      expect(screen.getByTitle('Supprimer')).toBeInTheDocument()
    })
  })

  describe('actions', () => {
    it('calls onCopy when copy button is clicked', () => {
      render(
        <ShareCard
          share={mockShare}
          handlers={mockHandlers}
          state={mockState}
          utils={mockUtils}
        />
      )

      fireEvent.click(screen.getByTitle('Copier le lien'))
      expect(mockHandlers.onCopy).toHaveBeenCalledWith('abc123')
    })

    it('shows check icon when token is copied', () => {
      const copiedState: ShareCardState = { ...mockState, copiedToken: 'abc123' }

      render(
        <ShareCard
          share={mockShare}
          handlers={mockHandlers}
          state={copiedState}
          utils={mockUtils}
        />
      )

      const copyButton = screen.getByTitle('Copier le lien')
      expect(copyButton.querySelector('.text-green-500')).toBeInTheDocument()
    })

    it('shows loading state when deleting', () => {
      const deletingState: ShareCardState = { ...mockState, deletingId: 'abc123' }

      render(
        <ShareCard
          share={mockShare}
          handlers={mockHandlers}
          state={deletingState}
          utils={mockUtils}
        />
      )

      const deleteButton = screen.getByTitle('Supprimer')
      expect(deleteButton).toBeDisabled()
    })
  })

  describe('rename dialog', () => {
    it('opens rename dialog when pencil button is clicked', () => {
      render(
        <ShareCard
          share={mockShare}
          handlers={mockHandlers}
          state={mockState}
          utils={mockUtils}
        />
      )

      fireEvent.click(screen.getByTitle('Renommer'))
      expect(screen.getByText('Renommer ce lien')).toBeInTheDocument()
    })

    it('calls onRename with new name on submit', async () => {
      render(
        <ShareCard
          share={mockShare}
          handlers={mockHandlers}
          state={mockState}
          utils={mockUtils}
        />
      )

      fireEvent.click(screen.getByTitle('Renommer'))

      const input = screen.getByLabelText('Nouveau nom')
      fireEvent.change(input, { target: { value: 'New Name' } })

      fireEvent.click(screen.getByText('Enregistrer'))

      await waitFor(() => {
        expect(mockHandlers.onRename).toHaveBeenCalledWith('abc123', 'New Name')
      })
    })
  })
})
