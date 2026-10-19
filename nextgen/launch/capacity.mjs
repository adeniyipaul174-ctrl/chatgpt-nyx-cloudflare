/**
 * NyX pre-launch, OFFLINE capacity estimator.
 * Free-tier figures are Cloudflare published plan allocations (2026-10-19),
 * NOT account usage or a promise of throughput.
 *
 * Source: https://developers.cloudflare.com/workers-ai/platform/pricing/
 * Source: https://developers.cloudflare.com/workers/platform/limits/
 * Source: https://developers.cloudflare.com/workers/platform/pricing/
 *
 * No API keys, network, billing or production Worker integration.
 */
export const FREE_LIMITS=Object.freeze({
  workerRequestsPerDay:100_000,
  workersAiNeuronsPerDay:10_000,
  d1RowsReadPerDay:5_000_000,
  d1RowsWrittenPerDay:100_000,
  dailyReset:"00:00 UTC"
});
// Published neurons per 1,000,000 tokens. These rates can change.
// All other models, especially image generation, require measured usage.
export const NEURONS_PER_MILLION_TOKENS=Object.freeze({
  "@cf/meta/llama-3.1-8b-instruct-fp8-fast":Object.freeze({input:4119,output:34868}),
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast":Object.freeze({input:26668,output:204805}),
  "@cf/meta/llama-3.2-1b-instruct":Object.freeze({input:2457,output:18252})
});
export function estimateTextNeurons({model,inputTokens,outputTokens}){
  const rates=NEURONS_PER_MILLION_TOKENS[model];
  if(!rates)throw new RangeError("Model has no verified neuron rate; don't invent a cost");
  if(!Number.isSafeInteger(inputTokens)||inputTokens<0||!Number.isSafeInteger(outputTokens)||outputTokens<0)
    throw new RangeError("Token counts must be nonnegative integers");
  return (inputTokens*rates.input+outputTokens*rates.output)/1_000_000;
}
export function estimateAvailableResponses({
 model="@cf/meta/llama-3.1-8b-instruct-fp8-fast",
 inputTokens=1500,outputTokens=500,
 aiReserveNeurons=2500,
 estimatedExtraNeuronsPerResponse=0,
 expectedWorkerRequestsPerResponse=2,
 expectedDbRowsWrittenPerResponse=2,
 expectedDbRowsReadPerResponse=50
}={}){
  for(const [name,value] of Object.entries({aiReserveNeurons,estimatedExtraNeuronsPerResponse,
     expectedWorkerRequestsPerResponse,expectedDbRowsWrittenPerResponse,expectedDbRowsReadPerResponse})){
    if(!Number.isFinite(value)||value<0)throw new RangeError("Invalid "+name);
  }
  if(aiReserveNeurons>FREE_LIMITS.workersAiNeuronsPerDay)throw new RangeError("Reserve exceeds allocation");
  const perResponse=estimateTextNeurons({model,inputTokens,outputTokens})+estimatedExtraNeuronsPerResponse;
  if(perResponse<=0)throw new RangeError("Response needs measurable model usage");
  const byAi=Math.floor((FREE_LIMITS.workersAiNeuronsPerDay-aiReserveNeurons)/perResponse);
  const byWorker=expectedWorkerRequestsPerResponse?Math.floor(FREE_LIMITS.workerRequestsPerDay/expectedWorkerRequestsPerResponse):Infinity;
  const byWrite=expectedDbRowsWrittenPerResponse?Math.floor(FREE_LIMITS.d1RowsWrittenPerDay/expectedDbRowsWrittenPerResponse):Infinity;
  const byRead=expectedDbRowsReadPerResponse?Math.floor(FREE_LIMITS.d1RowsReadPerDay/expectedDbRowsReadPerResponse):Infinity;
  return {
    model,estimatedNeuronsPerResponse:Number(perResponse.toFixed(3)),
    estimatedDailyTextResponses:Math.min(byAi,byWorker,byRead,byWrite),
    ceilings:{workersAi:byAi,workerRequests:byWorker,d1Writes:byWrite,d1Reads:byRead},
    disclaimer:"Illustrative text-only planning estimate. Excludes unknown image consumption, prompt rewrites, search synthesis, provider usage and retries; not a live billing meter."
  };
}
export function recommendPilotPolicy({
 dailyNeuronsUsed,dailyNeuronsBudget=FREE_LIMITS.workersAiNeuronsPerDay,
 reserveRatio=.2,estimatedNeuronsPerRequest,requestedMessagesPerUser=5
}){
  if(!Number.isFinite(dailyNeuronsUsed)||dailyNeuronsUsed<0||!Number.isFinite(dailyNeuronsBudget)||dailyNeuronsBudget<=0||
    !Number.isFinite(reserveRatio)||reserveRatio<0||reserveRatio>=1||
    !Number.isFinite(estimatedNeuronsPerRequest)||estimatedNeuronsPerRequest<=0||
    !Number.isInteger(requestedMessagesPerUser)||requestedMessagesPerUser<=0)
    throw new RangeError("Missing valid measured usage and limits");
  const remaining=Math.max(0,dailyNeuronsBudget*(1-reserveRatio)-dailyNeuronsUsed);
  const safelyEstimated=Math.floor(remaining/estimatedNeuronsPerRequest);
  return {
    allowNewRequests:safelyEstimated>0,
    pilotUsersAtRequestedAllowance:Math.floor(safelyEstimated/requestedMessagesPerUser),
    responsesRemainingEstimate:safelyEstimated,
    note:"Advisory only. Actual Workers AI daily quota must be checked through Cloudflare. This function does NOT enforce a global cap."
  };
}
