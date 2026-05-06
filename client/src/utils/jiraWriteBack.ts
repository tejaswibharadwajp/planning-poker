// Writes a story point estimate back to a Jira issue.
// Issue key detected from story title: any "ABC-123" pattern.
// Jira config in sessionStorage as jira_config: { host, email, token }
// host = "yourorg.atlassian.net" (no protocol)

export async function writeBackToJira(storyTitle: string, estimate: string): Promise<boolean> {
  const match = storyTitle.match(/\b([A-Z][A-Z0-9]+-\d+)\b/);
  if (!match) return false;
  const issueKey = match[1];

  const raw = sessionStorage.getItem('jira_config');
  if (!raw) return false;

  let config: { host: string; email: string; token: string };
  try {
    config = JSON.parse(raw);
  } catch {
    return false;
  }

  const numericEstimate = parseFloat(estimate);
  if (isNaN(numericEstimate)) return false;

  try {
    const res = await fetch(
      `https://${config.host}/rest/api/3/issue/${issueKey}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Basic ${btoa(`${config.email}:${config.token}`)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            story_points: numericEstimate,
          },
        }),
      }
    );
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}
