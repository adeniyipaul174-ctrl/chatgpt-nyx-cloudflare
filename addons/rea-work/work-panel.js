/**
 * Mount the REA tool panel only where NYX's authenticated Work-mode controller
 * explicitly calls this module. Does not change Chat/Code tabs or navigation.
 *
 * import { mountReaWorkPanel } from "./work-panel.js";
 * mountReaWorkPanel(document.querySelector("#nyx-work-rea-slot"));
 */
export function mountReaWorkPanel(root) {
  if (!root || root.dataset.reaMounted === "1") return;
  root.dataset.reaMounted = "1";
  const panel = document.createElement("section");
  panel.setAttribute("aria-label", "REA reverse engineering tools");
  panel.className = "nyx-rea-panel";

  const heading = document.createElement("h3");
  heading.textContent = "Reverse Engineering (REA)";
  const help = document.createElement("p");
  help.textContent = "Analyze software artifacts you own or are authorized to inspect. Analysis runs on your configured private Linux runner.";

  const fileLabel = document.createElement("label");
  fileLabel.textContent = "Select an APK or ASAR";
  const upload = document.createElement("input");
  upload.type = "file";
  upload.accept = ".apk,.asar";
  fileLabel.append(upload);
  const choices = document.createElement("select");
  for (const [value, label] of [
    ["apk", "Inspect Android APK"],
    ["apk_signature", "Inspect APK signature"],
    ["javascript", "Analyze JavaScript / Electron ASAR"]
  ]) {
    const opt = document.createElement("option");
    opt.value = value; opt.textContent = label;
    choices.append(opt);
  }
  const run = document.createElement("button");
  run.type = "button";
  run.textContent = "Upload and analyze";
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  const result = document.createElement("pre");
  result.style.whiteSpace = "pre-wrap";
  result.style.overflowWrap = "anywhere";
  result.style.maxHeight = "380px";
  result.style.overflow = "auto";
  const preview = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Analysis results";
  preview.append(summary, result);
  panel.append(heading, help, fileLabel, choices, run, status, preview);
  root.append(panel);

  run.addEventListener("click", async () => {
    const file = upload.files?.[0];
    if (!file) { status.textContent = "Choose an artifact first."; return; }
    const ext = file.name.toLowerCase().endsWith(".apk") ? ".apk" : file.name.toLowerCase().endsWith(".asar") ? ".asar" : "";
    if (!ext || file.size > 24 * 1024 * 1024) { status.textContent = "Only APK or ASAR files up to 24 MiB are supported."; return; }
    if (ext === ".asar" && choices.value !== "javascript" || ext === ".apk" && choices.value === "javascript") {
      status.textContent = "Select an analysis type matching your file.";
      return;
    }
    run.disabled = true; preview.open = false; result.textContent = "";
    try {
      status.textContent = "Uploading artifact…";
      const response = await fetch("/api/work/rea-upload", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream", "X-REA-Extension": ext },
        body: file
      });
      const data = await response.json();
      if (!response.ok || !data.ok || typeof data.target !== "string") throw Error(data.error || "Upload failed");
      status.textContent = "Analyzing with REA…";
      const inspected = await fetch("/api/work/rea-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({action: choices.value, target: data.target})
      });
      const evidence = await inspected.json();
      result.textContent = JSON.stringify(evidence, null, 2);
      preview.open = true;
      status.textContent = inspected.ok && evidence.ok ? "REA analysis complete." : "REA analysis returned an error; see results.";
    } catch (e) {
      status.textContent = e instanceof Error ? e.message : "REA request failed";
    } finally { run.disabled = false; }
  });
}
