exports.skillSuggestionPrompt = (user) => `
User Profile:
Skills: ${JSON.stringify(user.skills)}
Interests: ${user.interests?.join(', ')}

Suggest:
1. Skills user can help others with
2. Areas where user may need help

Return JSON:
{
  "canHelpWith": [],
  "needsHelpWith": []
}
`;

exports.userInsightsPrompt = (user) => `
Analyze this user:

Skills: ${JSON.stringify(user.skills)}
Interests: ${user.interests?.join(', ')}
Trust Score: ${user.trustScore}

Give insights:
- Strengths
- Weaknesses
- Growth suggestions

Short response.
`;