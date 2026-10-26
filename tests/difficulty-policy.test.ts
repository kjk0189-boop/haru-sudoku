import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyze} from '../src/logic';
import {acceptsDifficulty} from '../src/difficulty-policy';
import {createSession,restoreSession} from '../src/session';

test('old generated games retain their original grade and progress after v2 tightening',()=>{
  const givens=[...'084002700070005003000000201920100000000200000038604900001700040090008050047500009'].map(Number);
  const rating=analyze(givens);assert.equal(rating.difficulty,'expert');
  assert.equal(acceptsDifficulty('expert',givens,rating),false);
  const old=createSession({id:`gen-1-${givens.join('')}`,difficulty:'expert',givens,solution:rating.solution});
  old.elapsed=87;old.hints=2;old.notes[givens.indexOf(0)]=[1,2];
  assert.deepEqual(restoreSession(JSON.stringify(old)),old);
  const forged=structuredClone(old);forged.puzzleId=forged.puzzle!.id=`gen-v2-1-${givens.join('')}`;
  assert.equal(restoreSession(JSON.stringify(forged)),null,'v2 prefix must not bypass the stricter qualification');
});
