import { describe, it, expect, vi } from 'vitest'
import { 
  loadTemplate, 
  getAvailableTemplates, 
  populateTemplate, 
  extractTemplateVariables,
  validateTemplateVariables,
  createDocumentFromTemplate 
} from '@/lib/templates'

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}))

vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
  },
}))

describe('Templates Utility', () => {
  describe('getAvailableTemplates', () => {
    it('should return all available template definitions', () => {
      const templates = getAvailableTemplates()
      
      expect(templates).toHaveLength(4)
      expect(templates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'prd-template',
            name: 'Product Requirements Document (PRD)',
            category: 'product',
          }),
          expect.objectContaining({
            id: 'rfc-template',
            name: 'Request for Comments (RFC)',
            category: 'technical',
          }),
          expect.objectContaining({
            id: 'launch-plan-template',
            name: 'Product Launch Plan',
            category: 'business',
          }),
          expect.objectContaining({
            id: 'post-mortem-template',
            name: 'Post-Mortem Report',
            category: 'process',
          }),
        ])
      )
    })

    it('should return templates with correct structure', () => {
      const templates = getAvailableTemplates()
      
      templates.forEach(template => {
        expect(template).toHaveProperty('id')
        expect(template).toHaveProperty('name')
        expect(template).toHaveProperty('description')
        expect(template).toHaveProperty('type')
        expect(template).toHaveProperty('variables')
        expect(template).toHaveProperty('category')
        expect(template).toHaveProperty('tags')
        expect(template).not.toHaveProperty('content')
      })
    })
  })

  describe('populateTemplate', () => {
    it('should replace template variables with values', () => {
      const template = 'Hello [Name], welcome to [Product]!'
      const variables = {
        Name: 'John Doe',
        Product: 'ProdMatic',
      }

      const result = populateTemplate(template, variables)
      expect(result).toBe('Hello John Doe, welcome to ProdMatic!')
    })

    it('should handle multiple occurrences of the same variable', () => {
      const template = '[Name] is using [Product]. [Name] loves [Product]!'
      const variables = {
        Name: 'Alice',
        Product: 'TaskFlow',
      }

      const result = populateTemplate(template, variables)
      expect(result).toBe('Alice is using TaskFlow. Alice loves TaskFlow!')
    })

    it('should leave unreplaced variables unchanged', () => {
      const template = 'Hello [Name], your [Status] is [Unknown]'
      const variables = {
        Name: 'Bob',
        Status: 'active',
      }

      const result = populateTemplate(template, variables)
      expect(result).toBe('Hello Bob, your active is [Unknown]')
    })
  })

  describe('extractTemplateVariables', () => {
    it('should extract variables from template content', () => {
      const content = 'Product: [Product Name]\nAuthor: [Author]\nDate: [Date]'
      
      const variables = extractTemplateVariables(content)
      expect(variables).toEqual(['Product Name', 'Author', 'Date'])
    })

    it('should handle duplicate variables', () => {
      const content = '[Name] and [Name] are working on [Project]'
      
      const variables = extractTemplateVariables(content)
      expect(variables).toEqual(['Name', 'Project'])
    })

    it('should return empty array for content without variables', () => {
      const content = 'This is a regular document without variables'
      
      const variables = extractTemplateVariables(content)
      expect(variables).toEqual([])
    })
  })

  describe('validateTemplateVariables', () => {
    it('should validate required variables', () => {
      const templateId = 'prd-template'
      const variables = {
        'Product Name': 'Test Product',
        'Author Name': 'John Doe',
        'Date': '2024-01-15',
        'Version Number': '1.0',
      }

      const result = validateTemplateVariables(templateId, variables)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return errors for missing required variables', () => {
      const templateId = 'prd-template'
      const variables = {
        'Product Name': 'Test Product',
        // Missing required fields
      }

      const result = validateTemplateVariables(templateId, variables)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Version Number is required')
      expect(result.errors).toContain('Date is required')
      expect(result.errors).toContain('Author Name is required')
    })

    it('should validate date format', () => {
      const templateId = 'prd-template'
      const variables = {
        'Product Name': 'Test Product',
        'Version Number': '1.0',
        'Date': 'invalid-date',
        'Author Name': 'John Doe',
      }

      const result = validateTemplateVariables(templateId, variables)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Date must be a valid date')
    })

    it('should validate select options', () => {
      const templateId = 'rfc-template'
      const variables = {
        'Title': 'Test RFC',
        'RFC Number': 'RFC-2024-001',
        'Author(s)': 'John Doe',
        'Status': 'Invalid Status', // Invalid option
        'Type': 'Standards Track',
      }

      const result = validateTemplateVariables(templateId, variables)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Status must be one of: Draft, Under Review, Accepted, Rejected, Superseded')
    })
  })

  describe('loadTemplate', () => {
    it('should return null for non-existent template', async () => {
      const fs = await import('fs')
      vi.mocked(fs.default.existsSync).mockReturnValue(false)

      const result = await loadTemplate('non-existent')
      expect(result).toBeNull()
    })

    it('should load template with content when file exists', async () => {
      const fs = await import('fs')
      const mockContent = '# Test Template\n\nProduct: [Product Name]'
      
      vi.mocked(fs.default.existsSync).mockReturnValue(true)
      vi.mocked(fs.default.readFileSync).mockReturnValue(mockContent)

      const result = await loadTemplate('prd-template')
      
      expect(result).toEqual({
        id: 'prd-template',
        name: 'Product Requirements Document (PRD)',
        description: 'Comprehensive template for defining product requirements and specifications',
        type: 'PRD',
        variables: [
          'Product Name',
          'Version Number', 
          'Date',
          'Author Name',
          'Stakeholders'
        ],
        category: 'product',
        tags: ['requirements', 'product', 'planning', 'specifications'],
        content: mockContent,
      })
    })
  })

  describe('createDocumentFromTemplate', () => {
    it('should create document with valid variables', async () => {
      const fs = await import('fs')
      const mockContent = '# [Title]\n\nAuthor: [Author]\nDate: [Date]'
      
      vi.mocked(fs.default.existsSync).mockReturnValue(true)
      vi.mocked(fs.default.readFileSync).mockReturnValue(mockContent)

      const variables = {
        'Title': 'Test RFC',
        'RFC Number': 'RFC-2024-001',
        'Author(s)': 'John Doe',
        'Status': 'Draft',
        'Type': 'Standards Track',
      }

      const result = await createDocumentFromTemplate('rfc-template', variables, 'Test Document')
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.content).toContain('Test RFC')
    })

    it('should return errors for invalid variables', async () => {
      const variables = {
        'Title': 'Test RFC',
        // Missing required fields
      }

      const result = await createDocumentFromTemplate('rfc-template', variables, 'Test Document')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.content).toBe('')
    })
  })
})