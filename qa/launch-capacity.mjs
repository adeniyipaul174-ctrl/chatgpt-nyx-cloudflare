/**
 * Pure planning tool. No Cloudflare API, model inference, writes or network use.
 * All per-request neuron inputs are hypothetical until confirmed against billing metrics.
 */
export const FREE_CEILINGS = Object.freeze({
  workerRequestsPerDay:100_000,
  neuronsPerDay:10_000,
  d1RowsReadPerDay:5_000_000,
  d1RowsWrittenPerDay:100_000
});

function nonnegativeNumber(value,label){
  if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new TypeError(label+' must be finite and nonnegative');
  return value;
}

/**
 * Estimate daily demand, with explicit reserve and per-feature accounting.
 * This is NOT a billing estimator or a way to raise provider quotas.
 */
export function estimateLaunch({
  dailyActiveUsers,
  chatPerUser=0,searchPerUser=0,imagesPerUser=0,
  neuronsPerChat,neuronsPerSearch,neuronsPerImage,
  workerRequestsPerUser=0,
  reserveFraction=0.2
}){
  const input={dailyActiveUsers,chatPerUser,searchPerUser,imagesPerUser,
    neuronsPerChat,neuronsPerSearch,neuronsPerImage,workerRequestsPerUser};
  for(const [name,value] of Object.entries(input))nonnegativeNumber(value,name);
  if(!Number.isInteger(dailyActiveUsers))throw TypeError('dailyActiveUsers must be an integer');
  if(typeof reserveFraction!=='number'||reserveFraction<0||reserveFraction>=1)throw RangeError('reserveFraction must be in [0,1)');
  const neuronsPerUser=chatPerUser*neuronsPerChat+searchPerUser*neuronsPerSearch+imagesPerUser*neuronsPerImage;
  const neuronsDemand=dailyActiveUsers*neuronsPerUser;
  const workerDemand=dailyActiveUsers*workerRequestsPerUser;
  const neuronsBudget=FREE_CEILINGS.neuronsPerDay*(1-reserveFraction);
  const workerBudget=FREE_CEILINGS.workerRequestsPerDay*(1-reserveFraction);
  return {
    dailyActiveUsers,
    assumedNeuronsPerUser:neuronsPerUser,
    estimatedNeurons:neuronsDemand,
    estimatedWorkerRequests:workerDemand,
    reservedNeuronBudget:neuronsBudget,
    reservedWorkerBudget:workerBudget,
    neuronHeadroom:Math.round(neuronsBudget-neuronsDemand),
    workerHeadroom:Math.round(workerBudget-workerDemand),
    fitsAssumptions:neuronsDemand<=neuronsBudget&&workerDemand<=workerBudget,
    bindingConstraint:neuronsDemand>neuronsBudget?'AI inference':workerDemand>workerBudget?'Worker requests':'none',
    note:'Planning only. Validate actual neurons per request, provider 429s, D1 row usage and cost before public launch.'
  };
}
