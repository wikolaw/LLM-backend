const https = require('https');

const options = {
  hostname: 'openrouter.ai',
  path: '/api/v1/models',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);

      // Filter for free and very low-cost models
      const affordableModels = json.data.filter(m =>
        m.id.includes(':free') || parseFloat(m.pricing.prompt) < 0.000001
      );

      console.log('\n=== FREE AND LOW-COST MODELS ===\n');
      affordableModels.forEach(m => {
        console.log(`${m.id}`);
        console.log(`  Name: ${m.name}`);
        console.log(`  Price: $${m.pricing.prompt}/1M input tokens`);
        console.log('');
      });

      console.log(`\n=== TOTAL: ${affordableModels.length} models ===\n`);

      // Also show some popular models
      console.log('\n=== POPULAR MODELS (any price) ===\n');
      const popularModels = json.data.filter(m =>
        m.id.includes('anthropic/claude') ||
        m.id.includes('openai/gpt') ||
        m.id.includes('google/gemini') ||
        m.id.includes('meta/llama') ||
        m.id.includes('meta-llama/llama') ||
        m.id.includes('mistral')
      ).slice(0, 20);

      popularModels.forEach(m => {
        console.log(`${m.id}`);
        console.log(`  Name: ${m.name}`);
        console.log(`  Price: $${m.pricing.prompt}/1M input tokens`);
        console.log('');
      });

    } catch (e) {
      console.error('Error parsing JSON:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.end();
