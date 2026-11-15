/* NyX Work: REA-only. Chat and Code keep their own model controls and code. */
(function () {
"use strict";
const $ = id => document.getElementById(id);
const chatTab = $("nxTabChat"), workTab = $("nxTabWork"), pane = $("nxWorkPane");
const fileInput = $("nxReaFile"), actionInput = $("nxReaAction");
const runButton = $("nxReaRun"), status = $("nxReaStatus");
const resultPre = $("nxReaResult"), resultDetails = $("nxReaResultsDetails");
if (!chatTab || !workTab || !pane || !fileInput || !actionInput || !runButton || !status || !resultPre || !resultDetails) return;

// This module never calls a chat model or forwards REA output to model APIs.
let stage = "chat";
let busy = false;
const storage = "nyx_work_chat_v1_" + String(window.nyxAccount?.id || "device");
// Retain access to existing Work history for compatibility; do not replay model
// conversations in the new standalone REA workspace or delete stored data.
let archivedHistory = [];
try {
  const saved = window.nyxAccount?.id ? JSON.parse(sessionStorage.getItem(storage) || "[]") : [];
  if (Array.isArray(saved)) archivedHistory = saved.filter(x => x && ["user","assistant"].includes(x.role) && typeof x.content === "string").slice(-150);
} catch {}
function setStage(next) {
  stage = next === "work" ? "work" : "chat";
  const on = stage === "work";
  document.body.dataset.nxStage = stage;
  chatTab.classList.toggle("active", !on);
  workTab.classList.toggle("active", on);
  chatTab.setAttribute("aria-selected", String(!on));
  workTab.setAttribute("aria-selected", String(on));
  pane.hidden = !on;
  if (on) {
    try { $("sidebar")?.classList.remove("open"); } catch {}
  }
  window.nxUnifiedHistoryBridge?.activate(stage);
}
window.nxEnterWork = function (task, submit = false) {
  setStage("work");
  if (typeof task === "string" && task.trim()) {
    status.textContent = "Work now uses REA only. Choose an APK or ASAR file for direct analysis.";
  }
  fileInput.focus();
};
chatTab.addEventListener("click", () => setStage("chat"));
workTab.addEventListener("click", () => setStage("work"));
document.addEventListener("click", event => {
  if (event.target.closest("#newSide,#newTop") && stage === "work") setStage("chat");
}, true);

window.nxWorkHistoryAPI = {
  load(messages) {
    archivedHistory = Array.isArray(messages) ? messages.slice(-150).filter(x => x && ["user","assistant"].includes(x.role) && typeof x.content === "string").map(x => ({role:x.role,content:x.content})) : [];
  },
  read() { return archivedHistory.slice(); },
  stage: setStage,
  resetAccount() {
    archivedHistory = [];
    busy = false;
    runButton.disabled = false;
    fileInput.value = "";
    resultPre.textContent = "";
    resultDetails.hidden = true;
    resultDetails.open = false;
    status.textContent = "";
    setStage("chat");
  }
};

const maxUploadBytes = 24 * 1024 * 1024;
fileInput.addEventListener("change", () => {
  const name = fileInput.files?.[0]?.name?.toLowerCase() || "";
  if (name.endsWith(".asar")) actionInput.value = "javascript";
  else if (name.endsWith(".apk") && actionInput.value === "javascript") actionInput.value = "apk";
});

runButton.addEventListener("click", async () => {
  if (busy) return;
  const file = fileInput.files?.[0];
  if (!file) { status.textContent = "Choose an APK or ASAR file first."; return; }
  const lowerName = file.name.toLowerCase();
  const extension = lowerName.endsWith(".apk") ? ".apk" : lowerName.endsWith(".asar") ? ".asar" : "";
  if (!extension || file.size > maxUploadBytes || !file.size) {
    status.textContent = "Select a non-empty APK or ASAR file no larger than 24 MiB.";
    return;
  }
  const action = actionInput.value;
  if ((extension === ".apk" && action === "javascript") || (extension === ".asar" && action !== "javascript")) {
    status.textContent = "Select an analysis operation matching your file type.";
    return;
  }
  busy = true;
  runButton.disabled = true;
  resultPre.textContent = "";
  resultDetails.hidden = true;
  resultDetails.open = false;
  try {
    status.textContent = "Uploading file to REA…";
    const uploadedResponse = await fetch("/api/work/rea-upload", {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: {"Content-Type":"application/octet-stream","X-REA-Extension":extension,"X-NyX-Client":"web"},
      body: file
    });
    const uploaded = await uploadedResponse.json();
    if (!uploadedResponse.ok || !uploaded.ok || typeof uploaded.target !== "string") {
      throw Error(uploaded.error || "REA upload is unavailable.");
    }

    status.textContent = "REA is analyzing the artifact…";
    const analysisResponse = await fetch("/api/work/rea-analyze", {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: {"Content-Type":"application/json","X-NyX-Client":"web"},
      body: JSON.stringify({action, target: uploaded.target})
    });
    const report = await analysisResponse.json();
    resultPre.textContent = JSON.stringify(report, null, 2);
    resultDetails.hidden = false;
    resultDetails.open = true;
    status.textContent = analysisResponse.ok && report.ok ?
      "REA analysis complete. Raw evidence displayed below." :
      (report.error || "REA returned an error. See raw results.");
  } catch (error) {
    status.textContent = error?.message || "The REA analysis service is unavailable.";
  } finally {
    busy = false;
    runButton.disabled = false;
  }
});
const params = new URLSearchParams(location.search);
if (params.get("work") === "1") setStage("work");
})();