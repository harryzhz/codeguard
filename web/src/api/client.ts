export type Severity = "critical" | "warning" | "style";
export type FindingStatus = "open" | "accepted" | "dismissed";
export type FindingCategory = "logic" | "security" | "performance" | "style";

export interface EvidenceStep {
  step: number;
  file?: string;
  line?: number;
  snippet?: string;
  observation: string;
}

export interface TestVerification {
  status: "passed" | "failed" | "no_coverage";
  test_name?: string;
  output?: string;
}

export interface Finding {
  id: string;
  review_id: string;
  severity: Severity;
  confidence: number;
  title: string;
  description: string;
  category: FindingCategory;
  evidence_chain: EvidenceStep[];
  test_verification: TestVerification | null;
  suggestion: string;
  status: FindingStatus;
  created_at: string;
}

export interface ReviewSummary {
  files_reviewed: number;
  total_findings: number;
  critical: number;
  warning: number;
  style: number;
  tests_run: number;
  tests_passed: number;
  tests_failed: number;
}

export interface Review {
  id: string;
  project_id: string;
  version: string;
  summary: ReviewSummary;
  files_changed: string[];
  created_at: string;
}

export interface ReviewDetail extends Review {
  findings: Finding[];
}

export interface Project {
  id: string;
  name: string;
  api_key: string;
  created_at: string;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    throw new ApiError(response.status, `Request failed: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export function fetchProjects(): Promise<Project[]> {
  return request<Project[]>("/projects/");
}

export function fetchReviews(projectId: string): Promise<Review[]> {
  return request<Review[]>(`/reviews/?project_id=${projectId}`);
}

export function fetchReview(reviewId: string): Promise<ReviewDetail> {
  return request<ReviewDetail>(`/reviews/${reviewId}`);
}

export function updateFindingStatus(
  findingId: string,
  status: FindingStatus,
): Promise<Finding> {
  return request<Finding>(
    `/findings/${findingId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}
