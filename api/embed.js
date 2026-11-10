module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(503).json({ status: 503, message: 'Client offline embeddings enabled' });
};
