// Minimal dependency-free test harness shared by every tests/*.test.js file.
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok  ' + name);
  } catch (e) {
    failed++;
    console.error('  FAIL ' + name + '\n       ' + e.message.split('\n').join('\n       '));
    process.exitCode = 1;
  }
}

process.on('exit', () => console.log(`${passed} passed, ${failed} failed`));

module.exports = { test };
