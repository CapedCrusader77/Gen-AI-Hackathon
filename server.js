const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Mock endpoint for custom repository parsing
app.post('/api/analyze', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Repository url/name is required' });
  }

  // Simulate complex processing delay
  setTimeout(() => {
    res.json({
      success: true,
      name: url.split('/').pop().replace('.git', '') || 'CustomRepo',
      analyzedAt: new Date().toISOString()
    });
  }, 1200);
});

app.listen(PORT, () => {
  console.log(`TrustIQ is running at http://localhost:${PORT}`);
});
