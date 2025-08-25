import fs from "fs";
import path from "path";

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  content: string;
  variables: string[];
  category: "product" | "technical" | "business" | "process";
  tags: string[];
}

export interface TemplateVariable {
  name: string;
  type: "text" | "date" | "number" | "select" | "multiline";
  description: string;
  required: boolean;
  defaultValue?: string;
  options?: string[]; // For select type
}

// Template definitions with metadata
export const TEMPLATE_DEFINITIONS: Record<string, Omit<DocumentTemplate, "content">> = {
  "prd-template": {
    id: "prd-template",
    name: "Product Requirements Document (PRD)",
    description: "Comprehensive template for defining product requirements and specifications",
    type: "PRD",
    variables: [
      "Product Name",
      "Version Number", 
      "Date",
      "Author Name",
      "Stakeholders"
    ],
    category: "product",
    tags: ["requirements", "product", "planning", "specifications"],
  },
  "rfc-template": {
    id: "rfc-template", 
    name: "Request for Comments (RFC)",
    description: "Technical proposal template for architectural decisions and design proposals",
    type: "RFC",
    variables: [
      "Title",
      "RFC Number",
      "Author(s)",
      "Status",
      "Type"
    ],
    category: "technical",
    tags: ["technical", "architecture", "design", "proposal"],
  },
  "launch-plan-template": {
    id: "launch-plan-template",
    name: "Product Launch Plan", 
    description: "Comprehensive launch planning template for coordinating go-to-market activities",
    type: "LAUNCH_PLAN",
    variables: [
      "Product Name",
      "Launch Date",
      "Launch Manager",
      "Version",
      "Last Updated"
    ],
    category: "business",
    tags: ["launch", "marketing", "go-to-market", "planning"],
  },
  "post-mortem-template": {
    id: "post-mortem-template",
    name: "Post-Mortem Report",
    description: "Incident analysis template for learning from failures and improvements",
    type: "POST_MORTEM", 
    variables: [
      "Incident/Project",
      "Date of Incident/Completion",
      "Report Date",
      "Report Author",
      "Severity"
    ],
    category: "process",
    tags: ["incident", "analysis", "learning", "improvement"],
  },
};

// Variable definitions for template forms
export const TEMPLATE_VARIABLES: Record<string, TemplateVariable[]> = {
  "prd-template": [
    {
      name: "Product Name",
      type: "text",
      description: "Name of the product being documented",
      required: true,
    },
    {
      name: "Version Number", 
      type: "text",
      description: "Document version (e.g., 1.0, 2.1)",
      required: true,
      defaultValue: "1.0",
    },
    {
      name: "Date",
      type: "date",
      description: "Document creation date",
      required: true,
    },
    {
      name: "Author Name",
      type: "text", 
      description: "Document author",
      required: true,
    },
    {
      name: "Stakeholders",
      type: "multiline",
      description: "List of key stakeholders",
      required: false,
    },
  ],
  "rfc-template": [
    {
      name: "Title",
      type: "text",
      description: "RFC title describing the proposal",
      required: true,
    },
    {
      name: "RFC Number",
      type: "text",
      description: "RFC identifier (e.g., RFC-2024-001)",
      required: true,
    },
    {
      name: "Author(s)",
      type: "text",
      description: "RFC author(s) with email addresses", 
      required: true,
    },
    {
      name: "Status",
      type: "select",
      description: "Current status of the RFC",
      required: true,
      defaultValue: "Draft",
      options: ["Draft", "Under Review", "Accepted", "Rejected", "Superseded"],
    },
    {
      name: "Type",
      type: "select",
      description: "Type of RFC",
      required: true,
      defaultValue: "Standards Track",
      options: ["Standards Track", "Informational", "Process"],
    },
  ],
  "launch-plan-template": [
    {
      name: "Product Name",
      type: "text",
      description: "Name of the product being launched",
      required: true,
    },
    {
      name: "Launch Date",
      type: "date",
      description: "Target launch date",
      required: true,
    },
    {
      name: "Launch Manager", 
      type: "text",
      description: "Person responsible for the launch",
      required: true,
    },
    {
      name: "Version",
      type: "text",
      description: "Document version",
      required: true,
      defaultValue: "1.0",
    },
    {
      name: "Last Updated",
      type: "date",
      description: "Last update date",
      required: true,
    },
  ],
  "post-mortem-template": [
    {
      name: "Incident/Project",
      type: "text",
      description: "Name or title of the incident or project",
      required: true,
    },
    {
      name: "Date of Incident/Completion",
      type: "date", 
      description: "When the incident occurred or project completed",
      required: true,
    },
    {
      name: "Report Date",
      type: "date",
      description: "Date this report was created",
      required: true,
    },
    {
      name: "Report Author",
      type: "text",
      description: "Person writing this post-mortem",
      required: true,
    },
    {
      name: "Severity",
      type: "select",
      description: "Severity level of the incident",
      required: true,
      defaultValue: "Medium",
      options: ["Critical", "High", "Medium", "Low"],
    },
  ],
};

/**
 * Load a template from the file system
 */
export async function loadTemplate(templateId: string): Promise<DocumentTemplate | null> {
  try {
    const templatePath = path.join(process.cwd(), "templates", `${templateId}.md`);
    
    if (!fs.existsSync(templatePath)) {
      console.warn(`Template file not found: ${templatePath}`);
      return null;
    }

    const content = fs.readFileSync(templatePath, "utf-8");
    const definition = TEMPLATE_DEFINITIONS[templateId];
    
    if (!definition) {
      console.warn(`Template definition not found for: ${templateId}`);
      return null;
    }

    return {
      ...definition,
      content,
    };
  } catch (error) {
    console.error(`Error loading template ${templateId}:`, error);
    return null;
  }
}

/**
 * Get all available templates
 */
export function getAvailableTemplates(): Omit<DocumentTemplate, "content">[] {
  return Object.values(TEMPLATE_DEFINITIONS);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: DocumentTemplate["category"]): Omit<DocumentTemplate, "content">[] {
  return Object.values(TEMPLATE_DEFINITIONS).filter(template => template.category === category);
}

/**
 * Get template variables for a specific template
 */
export function getTemplateVariables(templateId: string): TemplateVariable[] {
  return TEMPLATE_VARIABLES[templateId] || [];
}

/**
 * Replace template variables with actual values
 */
export function populateTemplate(
  content: string, 
  variables: Record<string, string>
): string {
  let populatedContent = content;
  
  // Replace placeholder variables in the format [Variable Name]
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `[${key}]`;
    populatedContent = populatedContent.replace(new RegExp(placeholder, "g"), value);
  });
  
  return populatedContent;
}

/**
 * Extract variables from template content
 */
export function extractTemplateVariables(content: string): string[] {
  const variableRegex = /\[([^\]]+)\]/g;
  const variables: string[] = [];
  let match;
  
  while ((match = variableRegex.exec(content)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  
  return variables;
}

/**
 * Validate template variables against definitions
 */
export function validateTemplateVariables(
  templateId: string,
  variables: Record<string, string>
): { isValid: boolean; errors: string[] } {
  const templateVars = getTemplateVariables(templateId);
  const errors: string[] = [];
  
  // Check required variables
  templateVars.forEach(templateVar => {
    if (templateVar.required && !variables[templateVar.name]) {
      errors.push(`${templateVar.name} is required`);
    }
  });
  
  // Check variable types (basic validation)
  Object.entries(variables).forEach(([key, value]) => {
    const templateVar = templateVars.find(tv => tv.name === key);
    if (templateVar) {
      switch (templateVar.type) {
        case "date":
          if (value && isNaN(Date.parse(value))) {
            errors.push(`${key} must be a valid date`);
          }
          break;
        case "number":
          if (value && isNaN(Number(value))) {
            errors.push(`${key} must be a valid number`);
          }
          break;
        case "select":
          if (value && templateVar.options && !templateVar.options.includes(value)) {
            errors.push(`${key} must be one of: ${templateVar.options.join(", ")}`);
          }
          break;
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create a new document from template
 */
export async function createDocumentFromTemplate(
  templateId: string,
  variables: Record<string, string>,
  title: string
): Promise<{ content: string; isValid: boolean; errors: string[] }> {
  const validation = validateTemplateVariables(templateId, variables);
  
  if (!validation.isValid) {
    return {
      content: "",
      isValid: false,
      errors: validation.errors,
    };
  }
  
  const template = await loadTemplate(templateId);
  if (!template) {
    return {
      content: "",
      isValid: false,
      errors: [`Template ${templateId} not found`],
    };
  }
  
  const populatedContent = populateTemplate(template.content, variables);
  
  return {
    content: populatedContent,
    isValid: true,
    errors: [],
  };
}

// Template categories for organization
export const TEMPLATE_CATEGORIES = {
  product: {
    name: "Product",
    description: "Product management and planning documents",
    icon: "Package",
  },
  technical: {
    name: "Technical", 
    description: "Technical specifications and architecture",
    icon: "Code",
  },
  business: {
    name: "Business",
    description: "Business strategy and go-to-market plans",
    icon: "TrendingUp",
  },
  process: {
    name: "Process",
    description: "Process documentation and improvement",
    icon: "Settings",
  },
} as const;