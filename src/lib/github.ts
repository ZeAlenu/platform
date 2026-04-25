import { Octokit } from "octokit";

export interface GithubConfig {
  token: string;
  owner: string;
  repo: string;
  baseBranch: string;
}

export function getGithubConfig(): GithubConfig | null {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  if (!token || !owner || !repo) return null;
  const baseBranch = process.env.GITHUB_DEFAULT_BRANCH || "main";
  return { token, owner, repo, baseBranch };
}

export interface OpenSubmissionPrInput {
  branchName: string;
  filePath: string;
  fileContents: string;
  commitMessage: string;
  prTitle: string;
  prBody: string;
}

export interface OpenSubmissionPrResult {
  prUrl: string;
  prNumber: number;
  branchName: string;
}

export async function openSubmissionPr(
  cfg: GithubConfig,
  input: OpenSubmissionPrInput,
): Promise<OpenSubmissionPrResult> {
  const octokit = new Octokit({ auth: cfg.token });
  const { owner, repo, baseBranch } = cfg;

  const { data: baseRef } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${baseBranch}`,
  });
  const baseSha = baseRef.object.sha;

  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${input.branchName}`,
    sha: baseSha,
  });

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: input.filePath,
    branch: input.branchName,
    message: input.commitMessage,
    content: Buffer.from(input.fileContents, "utf8").toString("base64"),
  });

  const { data: pr } = await octokit.rest.pulls.create({
    owner,
    repo,
    head: input.branchName,
    base: baseBranch,
    title: input.prTitle,
    body: input.prBody,
    draft: true,
  });

  return {
    prUrl: pr.html_url,
    prNumber: pr.number,
    branchName: input.branchName,
  };
}
