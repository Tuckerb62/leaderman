import { execFileSync } from 'node:child_process';
import { userInfo } from 'node:os';

const SERVICE_NAME = 'leaderman-openai-key';

function readHidden(prompt) {
  return new Promise((resolve) => {
    let value = '';
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    function finish() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
      process.stdin.off('data', onData);
      resolve(value);
    }

    function onData(char) {
      if (char === '\u0003') {
        process.stdout.write('\nCancelled.\n');
        process.exit(1);
      }
      if (char === '\r' || char === '\n') {
        finish();
        return;
      }
      if (char === '\u007f') {
        value = value.slice(0, -1);
        return;
      }
      value += char;
    }

    process.stdin.on('data', onData);
  });
}

if (process.platform !== 'darwin') {
  console.error('This Keychain setup script only works on macOS. Use OPENAI_API_KEY instead.');
  process.exit(1);
}

const apiKey = (await readHidden('Paste your OpenAI API key (hidden): ')).trim();
if (!apiKey) {
  console.error('No key entered.');
  process.exit(1);
}

execFileSync('/usr/bin/security', [
  'add-generic-password',
  '-a',
  userInfo().username,
  '-s',
  SERVICE_NAME,
  '-w',
  apiKey,
  '-U',
], {
  stdio: ['ignore', 'ignore', 'inherit'],
});

console.log('Saved OpenAI API key to macOS Keychain for Curiosity.');
