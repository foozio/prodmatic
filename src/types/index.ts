import { Prisma } from "@prisma/client";

// User types with relations
export type UserWithProfile = Prisma.UserGetPayload<{
  include: {
    profile: true;
    memberships: {
      include: {
        organization: true;
        team: true;
      };
    };
  };
}>;

export type OrganizationWithTeams = Prisma.OrganizationGetPayload<{
  include: {
    teams: true;
    memberships: {
      include: {
        user: {
          include: {
            profile: true;
          };
        };
      };
    };
  };
}>;

export type ProductWithDetails = Prisma.ProductGetPayload<{
  include: {
    organization: true;
    teams: true;
    ideas: {
      include: {
        creator: true;
      };
    };
    features: {
      include: {
        epic: true;
      };
    };
    releases: true;
    flags: true;
  };
}>;

export type IdeaWithDetails = Prisma.IdeaGetPayload<{
  include: {
    product: true;
    creator: true;
    convertedToEpic: true;
    insights: true;
  };
}>;

export type EpicWithFeatures = Prisma.EpicGetPayload<{
  include: {
    product: true;
    features: {
      include: {
        tasks: true;
      };
    };
    fromIdeas: true;
  };
}>;

export type FeatureWithTasks = Prisma.FeatureGetPayload<{
  include: {
    product: true;
    epic: true;
    tasks: {
      include: {
        assignee: true;
        sprint: true;
      };
    };
    release: true;
    flags: true;
  };
}>;

export type TaskWithDetails = Prisma.TaskGetPayload<{
  include: {
    product: true;
    feature: true;
    assignee: true;
    sprint: true;
  };
}>;

export type SprintWithTasks = Prisma.SprintGetPayload<{
  include: {
    product: true;
    tasks: {
      include: {
        assignee: true;
        feature: true;
      };
    };
  };
}>;

export type ReleaseWithFeatures = Prisma.ReleaseGetPayload<{
  include: {
    product: true;
    features: true;
    changelog: true;
  };
}>;

export type OKRWithKeyResults = Prisma.OKRGetPayload<{
  include: {
    product: true;
    owner: true;
    keyResults: true;
  };
}>;

export type ExperimentWithInsights = Prisma.ExperimentGetPayload<{
  include: {
    product: true;
    owner: true;
    insights: true;
  };
}>;

export type InterviewWithDetails = Prisma.InterviewGetPayload<{
  include: {
    product: true;
    customer: true;
    persona: true;
    conductor: true;
    insights: true;
  };
}>;

export type FeedbackWithCustomer = Prisma.FeedbackGetPayload<{
  include: {
    product: true;
    customer: true;
  };
}>;

// Scoring and prioritization types
export interface RiceScoring {
  reach: number;
  impact: number;
  confidence: number;
  effort: number;
  score: number;
}

export interface WsjfScoring {
  businessValue: number;
  jobSize: number;
  score: number;
}

export interface IceScoring {
  impact: number;
  confidence: number;
  ease: number;
  score: number;
}

// Dashboard and analytics types
export interface KPIData {
  name: string;
  current: number;
  target: number;
  unit: string;
  trend: "up" | "down" | "stable";
  change: number;
}

export interface ChartData {
  label: string;
  value: number;
  date?: string;
}

// Navigation and UI types
export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType;
  badge?: string | number;
  children?: NavItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Form and validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}

// Feature flags and experiments
export interface FeatureFlagConfig {
  enabled: boolean;
  rollout: number;
  targeting: {
    organizations?: string[];
    teams?: string[];
    roles?: string[];
  };
  variants?: {
    [key: string]: any;
  };
}

export interface ExperimentVariant {
  name: string;
  weight: number;
  config: any;
}

// Integration types
export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  organizationId: string;
}

export interface Integration {
  name: string;
  type: "github" | "jira" | "slack" | "linear" | "trello";
  config: any;
  enabled: boolean;
}

// Report and export types
export interface ExportOptions {
  format: "csv" | "pdf";
  fields?: string[];
  filters?: any;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Search and filter types
export interface SearchFilters {
  query?: string;
  status?: string[];
  priority?: string[];
  assignee?: string[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}