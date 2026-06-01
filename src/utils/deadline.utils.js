// utils/deadline.utils.js
const getTimeRemaining = (deadline) => {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end - now; // ms

  if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    expired: false,
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
};

module.exports = { getTimeRemaining };