import {test} from 'node:test';
import assert from 'node:assert/strict';
import {estimateLaunch,FREE_CEILINGS} from './launch-capacity.mjs';

test('Hard free ceilings are tracked separately from NyX per-user allowances',()=>{
  assert.equal(FREE_CEILINGS.workerRequestsPerDay,100000);
  assert.equal(FREE_CEILINGS.neuronsPerDay,10000);
  assert.equal(FREE_CEILINGS.d1RowsReadPerDay,5000000);
  assert.equal(FREE_CEILINGS.d1RowsWrittenPerDay,100000);
});

test('Small synthetic trial fits with 20% daily headroom',()=>{
  const x=estimateLaunch({
    dailyActiveUsers:20,chatPerUser:6,searchPerUser:2,imagesPerUser:0,
    neuronsPerChat:18,neuronsPerSearch:32,neuronsPerImage:0,
    workerRequestsPerUser:24
  });
  assert.equal(x.fitsAssumptions,true);
  assert.equal(x.bindingConstraint,'none');
  assert.ok(x.neuronHeadroom>0);
});

test('Large synthetic launch fails safe when demand exceeds free Neurons',()=>{
  const x=estimateLaunch({
    dailyActiveUsers:1000,chatPerUser:6,searchPerUser:2,imagesPerUser:1,
    neuronsPerChat:20,neuronsPerSearch:35,neuronsPerImage:300,
    workerRequestsPerUser:30
  });
  assert.equal(x.fitsAssumptions,false);
  assert.equal(x.bindingConstraint,'AI inference');
  assert.ok(x.neuronHeadroom<0);
});

test('Workers requests can be the limiting factor if model cost is low',()=>{
  const x=estimateLaunch({
    dailyActiveUsers:200,chatPerUser:1,searchPerUser:0,imagesPerUser:0,
    neuronsPerChat:1,neuronsPerSearch:0,neuronsPerImage:0,
    workerRequestsPerUser:600
  });
  assert.equal(x.fitsAssumptions,false);
  assert.equal(x.bindingConstraint,'Worker requests');
});

test('Reject invalid assumptions instead of promising false capacity',()=>{
  const good={dailyActiveUsers:10,chatPerUser:1,searchPerUser:1,imagesPerUser:0,
    neuronsPerChat:10,neuronsPerSearch:20,neuronsPerImage:100,workerRequestsPerUser:10};
  assert.throws(()=>estimateLaunch({...good,dailyActiveUsers:-2}),/nonnegative/);
  assert.throws(()=>estimateLaunch({...good,dailyActiveUsers:3.5}),/integer/);
  assert.throws(()=>estimateLaunch({...good,neuronsPerSearch:NaN}),/nonnegative/);
  assert.throws(()=>estimateLaunch({...good,reserveFraction:1}),/reserveFraction/);
});
