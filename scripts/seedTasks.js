const http = require('http');

const TASK_COUNT = 5000; // Seeding 5000 tasks first to see impact
const PORT = 3000;

async function seed() {
  console.log(`Seeding ${TASK_COUNT} tasks...`);
  
  for (let i = 0; i < TASK_COUNT; i++) {
    const data = JSON.stringify({
      title: `Load Test Task ${i}`,
      description: `Description for task ${i}`,
      priority: i % 3 === 0 ? 'high' : 'medium',
      status: i % 2 === 0 ? 'todo' : 'in_progress',
      dueDate: new Date(Date.now() + Math.random() * 1000000000).toISOString()
    });

    const options = {
      hostname: 'localhost',
      port: PORT,
      path: '/tasks',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        res.on('data', () => {});
        res.on('end', resolve);
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });

    if (i % 500 === 0) console.log(`  Seeded ${i}...`);
  }
  
  console.log('Seeding complete!');
}

seed().catch(console.error);
