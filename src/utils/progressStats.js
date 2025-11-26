export const defaultSummaryStats = { days: 0, lessons: 0, activities: 0 };

export const mapProgressSnapshot = (snapshot) => {
  if (!snapshot || !snapshot.size) {
    return defaultSummaryStats;
  }
  const uniqueDays = new Set();
  let lessonsWatched = 0;
  let activitiesCount = 0;
  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const timestamp = data?.updatedAt;
    if (data?.watched) {
      lessonsWatched += 1;
    }
    const score = Number.isFinite(data?.score) ? data.score : Number(data?.score);
    if (Number.isFinite(score) && score >= 70) {
      activitiesCount += 1;
    }
    if (timestamp?.toDate) {
      const dayKey = timestamp.toDate().toISOString().slice(0, 10);
      uniqueDays.add(dayKey);
    }
  });
  return {
    days: uniqueDays.size || 1,
    lessons: lessonsWatched,
    activities: activitiesCount,
  };
};
