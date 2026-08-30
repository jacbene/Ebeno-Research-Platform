module.exports = function override(config, env) {
  // Désactiver le problème de react-refresh
  const entry = config.entry;
  if (entry && Array.isArray(entry)) {
    config.entry = entry.filter(e => !e.includes('react-refresh/runtime'));
  }
  return config;
};
