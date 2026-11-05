# @category NyX
# Ghidra Jython post-script for static function decompilation (no sample execution).
import io
import json
from ghidra.app.decompiler import DecompInterface

args = getScriptArgs()
if len(args) != 1:
    raise RuntimeError("Expected output report path")

interface = DecompInterface()
interface.openProgram(currentProgram)
functions = []
count = 0
for function in currentProgram.getFunctionManager().getFunctions(True):
    if count >= 60:
        break
    count += 1
    info = {"name": str(function.getName())[:120],
            "address": str(function.getEntryPoint()),
            "signature": str(function.getSignature())[:300]}
    try:
        result = interface.decompileFunction(function, 3, monitor)
        if result is not None and result.decompileCompleted():
            decompiled = result.getDecompiledFunction()
            if decompiled is not None:
                info["pseudocode"] = str(decompiled.getC())[:2500]
    except Exception:
        info["warning"] = "Decompiler could not process this function"
    functions.append(info)
interface.dispose()

report = {"analysisLevel": "ghidra-headless-decompilation",
          "program": str(currentProgram.getName())[:160],
          "language": str(currentProgram.getLanguageID()),
          "compiler": str(currentProgram.getCompilerSpec().getCompilerSpecID()),
          "functions": functions,
          "limitations": "First 60 functions only; decompiler output is approximate and may contain errors."}
with io.open(args[0], "w", encoding="utf-8") as out:
    out.write(unicode(json.dumps(report, ensure_ascii=True)))
