import fs from 'fs';
import { parseDataFile } from './src/backend/services/dataService.ts';

async function run() {
  fs.writeFileSync('dummy.csv', 'A,B,C\n1,2,3');
  const result = await parseDataFile('dummy.csv', 'dummy.csv', {});
  console.log("Headers:", result.headers);
  console.log("Is array?", Array.isArray(result.headers));
}
run();
