module.exports = (req, res, next) => {
  if (req.user?.role !== 'moderator') {
    return res.status(403).json({ error: 'Moderator access required' });
  }
  next();
};
