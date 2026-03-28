export type Severity = "critical" | "warning" | "style";
export type FindingStatus = "open" | "accepted" | "dismissed";

export interface EvidenceStep {
  step: number;
  description: string;
  file?: string;
  line?: number;
  code?: string;
}

export interface TestVerification {
  description: string;
  status: "pass" | "fail" | "skipped";
  details?: string;
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: FindingStatus;
  confidence: number;
  file: string;
  line: number;
  suggestion?: string;
  evidence: EvidenceStep[];
  test_verification?: TestVerification;
}

export interface ReviewSummary {
  total: number;
  critical: number;
  warning: number;
  style: number;
}

export interface Review {
  id: string;
  project_id: string;
  commit_sha: string;
  branch: string;
  status: string;
  summary: ReviewSummary;
  findings: Finding[];
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  repo_url: string;
  latest_review?: Review;
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
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    throw new ApiError(response.status, `Request failed: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export function fetchProjects(): Promise<Project[]> {
  return request<Project[]>("/projects");
}

export function fetchReviews(projectId: string): Promise<Review[]> {
  return request<Review[]>(`/projects/${projectId}/reviews`);
}

export function fetchReview(projectId: string, reviewId: string): Promise<Review> {
  return request<Review>(`/projects/${projectId}/reviews/${reviewId}`);
}

export function updateFindingStatus(
  projectId: string,
  reviewId: string,
  findingId: string,
  status: FindingStatus,
): Promise<Finding> {
  return request<Finding>(
    `/projects/${projectId}/reviews/${reviewId}/findings/${findingId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}
