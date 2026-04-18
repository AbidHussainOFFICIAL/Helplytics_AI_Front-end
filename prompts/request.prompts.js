exports.autoCategorizePrompt = (data) => `
Request:
Title: ${data.title}
Description: ${data.description}

Return:
{
  "category": "",
  "tags": []
}
`;

exports.rewritePrompt = (data) => `
Rewrite this request to be clearer and more professional:

Title: ${data.title}
Description: ${data.description}
`;

exports.summaryPrompt = (data) => `
Summarize this request in 1-2 lines:

${data.description}
`;

exports.responseSuggestionPrompt = (data) => `
A helper wants to reply to this request:

${data.description}

Generate 3 helpful responses.
`;

exports.trendsPrompt = (requests) => `
Analyze requests:

${JSON.stringify(requests)}

Return:
- trending categories
- common problems
- urgent patterns
`;