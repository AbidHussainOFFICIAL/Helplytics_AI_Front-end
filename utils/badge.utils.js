exports.assignBadges = (user) => {
  const badges = [];

  if (user.contributions >= 10) badges.push('Helper Lv1');
  if (user.contributions >= 50) badges.push('Helper Lv2');
  if (user.trustScore >= 50) badges.push('Trusted');
  if (user.trustScore >= 80) badges.push('Elite Helper');

  user.badges = [...new Set(badges)];
};