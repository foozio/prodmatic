import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils'

// Mock the Button component since it might not exist yet
const Button = ({ 
  children, 
  onClick, 
  variant = 'default', 
  size = 'default',
  disabled = false,
  ...props 
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: string
  size?: string
  disabled?: boolean
}) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    data-variant={variant}
    data-size={size}
    {...props}
  >
    {children}
  </button>
)

// Mock Card components
const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={className} data-testid="card">{children}</div>
)

const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="card-header">{children}</div>
)

const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 data-testid="card-title">{children}</h3>
)

const CardContent = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="card-content">{children}</div>
)

// Example component to test
const IdeaCard = ({ 
  idea, 
  onVote, 
  onEdit 
}: { 
  idea: any
  onVote: (id: string) => void
  onEdit: (id: string) => void
}) => {
  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle>{idea.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p data-testid="idea-description">{idea.description}</p>
        <div className="flex items-center justify-between mt-4">
          <span data-testid="vote-count">Votes: {idea.votes}</span>
          <div className="flex space-x-2">
            <Button 
              onClick={() => onVote(idea.id)}
              data-testid="vote-button"
            >
              Vote
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onEdit(idea.id)}
              data-testid="edit-button"
            >
              Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Example form component
const IdeaForm = ({ 
  onSubmit, 
  initialData = {} 
}: { 
  onSubmit: (data: any) => void
  initialData?: any
}) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit({
      title: formData.get('title'),
      description: formData.get('description'),
      priority: formData.get('priority'),
    })
  }

  return (
    <form onSubmit={handleSubmit} data-testid="idea-form">
      <div className="space-y-4">
        <div>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            type="text"
            defaultValue={initialData.title}
            required
            data-testid="title-input"
          />
        </div>
        
        <div>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            defaultValue={initialData.description}
            required
            data-testid="description-input"
          />
        </div>
        
        <div>
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            name="priority"
            defaultValue={initialData.priority || 'MEDIUM'}
            data-testid="priority-select"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        
        <Button type="submit" data-testid="submit-button">
          Submit Idea
        </Button>
      </div>
    </form>
  )
}

describe('IdeaCard Component', () => {
  const mockIdea = {
    id: 'idea-1',
    title: 'Test Idea',
    description: 'This is a test idea description',
    votes: 5,
    priority: 'HIGH',
    status: 'SUBMITTED',
  }

  const mockOnVote = vi.fn()
  const mockOnEdit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render idea information correctly', () => {
    renderWithProviders(
      <IdeaCard 
        idea={mockIdea} 
        onVote={mockOnVote} 
        onEdit={mockOnEdit} 
      />
    )

    expect(screen.getByTestId('card-title')).toHaveTextContent('Test Idea')
    expect(screen.getByTestId('idea-description')).toHaveTextContent('This is a test idea description')
    expect(screen.getByTestId('vote-count')).toHaveTextContent('Votes: 5')
  })

  it('should call onVote when vote button is clicked', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(
      <IdeaCard 
        idea={mockIdea} 
        onVote={mockOnVote} 
        onEdit={mockOnEdit} 
      />
    )

    const voteButton = screen.getByTestId('vote-button')
    await user.click(voteButton)

    expect(mockOnVote).toHaveBeenCalledWith('idea-1')
    expect(mockOnVote).toHaveBeenCalledTimes(1)
  })

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(
      <IdeaCard 
        idea={mockIdea} 
        onVote={mockOnVote} 
        onEdit={mockOnEdit} 
      />
    )

    const editButton = screen.getByTestId('edit-button')
    await user.click(editButton)

    expect(mockOnEdit).toHaveBeenCalledWith('idea-1')
    expect(mockOnEdit).toHaveBeenCalledTimes(1)
  })

  it('should render with correct button variants', () => {
    renderWithProviders(
      <IdeaCard 
        idea={mockIdea} 
        onVote={mockOnVote} 
        onEdit={mockOnEdit} 
      />
    )

    const voteButton = screen.getByTestId('vote-button')
    const editButton = screen.getByTestId('edit-button')

    expect(voteButton).toHaveAttribute('data-variant', 'default')
    expect(editButton).toHaveAttribute('data-variant', 'outline')
  })
})

describe('IdeaForm Component', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render form fields correctly', () => {
    renderWithProviders(
      <IdeaForm onSubmit={mockOnSubmit} />
    )

    expect(screen.getByTestId('title-input')).toBeInTheDocument()
    expect(screen.getByTestId('description-input')).toBeInTheDocument()
    expect(screen.getByTestId('priority-select')).toBeInTheDocument()
    expect(screen.getByTestId('submit-button')).toBeInTheDocument()
  })

  it('should populate form with initial data', () => {
    const initialData = {
      title: 'Initial Title',
      description: 'Initial Description',
      priority: 'HIGH',
    }

    renderWithProviders(
      <IdeaForm onSubmit={mockOnSubmit} initialData={initialData} />
    )

    expect(screen.getByTestId('title-input')).toHaveValue('Initial Title')
    expect(screen.getByTestId('description-input')).toHaveValue('Initial Description')
    expect(screen.getByTestId('priority-select')).toHaveValue('HIGH')
  })

  it('should submit form with correct data', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(
      <IdeaForm onSubmit={mockOnSubmit} />
    )

    // Fill out the form
    await user.type(screen.getByTestId('title-input'), 'New Idea Title')
    await user.type(screen.getByTestId('description-input'), 'New idea description')
    await user.selectOptions(screen.getByTestId('priority-select'), 'HIGH')

    // Submit the form
    await user.click(screen.getByTestId('submit-button'))

    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'New Idea Title',
      description: 'New idea description',
      priority: 'HIGH',
    })
  })

  it('should require title and description fields', () => {
    renderWithProviders(
      <IdeaForm onSubmit={mockOnSubmit} />
    )

    const titleInput = screen.getByTestId('title-input')
    const descriptionInput = screen.getByTestId('description-input')

    expect(titleInput).toBeRequired()
    expect(descriptionInput).toBeRequired()
  })

  it('should have default priority value', () => {
    renderWithProviders(
      <IdeaForm onSubmit={mockOnSubmit} />
    )

    expect(screen.getByTestId('priority-select')).toHaveValue('MEDIUM')
  })

  it('should prevent submission with empty required fields', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(
      <IdeaForm onSubmit={mockOnSubmit} />
    )

    // Try to submit without filling required fields
    await user.click(screen.getByTestId('submit-button'))

    // Form should not be submitted due to HTML5 validation
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })
})

describe('Component Integration Tests', () => {
  it('should handle complex user interactions', async () => {
    const user = userEvent.setup()
    const mockVote = vi.fn()
    const mockEdit = vi.fn()
    const mockSubmit = vi.fn()

    const idea = {
      id: 'idea-1',
      title: 'Original Idea',
      description: 'Original description',
      votes: 3,
    }

    renderWithProviders(
      <div>
        <IdeaCard idea={idea} onVote={mockVote} onEdit={mockEdit} />
        <IdeaForm onSubmit={mockSubmit} />
      </div>
    )

    // Interact with idea card
    await user.click(screen.getByTestId('vote-button'))
    expect(mockVote).toHaveBeenCalledWith('idea-1')

    // Fill and submit form
    await user.type(screen.getByTestId('title-input'), 'New Idea')
    await user.type(screen.getByTestId('description-input'), 'New description')
    await user.click(screen.getByTestId('submit-button'))

    expect(mockSubmit).toHaveBeenCalledWith({
      title: 'New Idea',
      description: 'New description',
      priority: 'MEDIUM',
    })
  })
})