const autocannon = require('autocannon');

async function runBenchmark() {
  console.log('Running Write Benchmark (10 concurrent, 5 seconds)...');
  
  const result = await autocannon({
    url: 'http://localhost:3000/tasks',
    connections: 10,
    duration: 5,
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Load Test Task',
      description: 'Benchmarking the POST endpoint',
      priority: 'high'
    })
  });

  console.log(autocannon.printResult(result));
}

runBenchmark().catch(console.error);
