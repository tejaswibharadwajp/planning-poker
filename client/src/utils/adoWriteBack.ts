// Writes a story point estimate back to an ADO work item.
// Story title format expected: "WorkItemType #ID: Title"
// ADO config stored in sessionStorage as ado_config: { org, project, pat }

export async function writeBackToADO(storyTitle: string, estimate: string): Promise<boolean> {
  const match = storyTitle.match(/#(\d+)/);
  if (!match) return false;
  const workItemId = match[1];

  const raw = sessionStorage.getItem('ado_config');
  if (!raw) return false;

  let config: { org: string; project: string; pat: string };
  try {
    config = JSON.parse(raw);
  } catch {
    return false;
  }

  const numericEstimate = parseFloat(estimate);
  if (isNaN(numericEstimate)) return false;

  try {
    const res = await fetch(
      `https://dev.azure.com/${config.org}/_apis/wit/workitems/${workItemId}?api-version=7.1`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Basic ${btoa(`:${config.pat}`)}`,
          'Content-Type': 'application/json-patch+json',
        },
        body: JSON.stringify([
          {
            op: 'add',
            path: '/fields/Microsoft.VSTS.Scheduling.StoryPoints',
            value: numericEstimate,
          },
        ]),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
