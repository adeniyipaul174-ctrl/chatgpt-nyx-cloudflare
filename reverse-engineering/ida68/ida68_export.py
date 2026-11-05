# IDA Pro 6.8 / IDAPython 2.7 best-effort export script.
# Executes INSIDE a locally licensed IDA installation. Never runs the input binary.
# Run in batch mode after setting NYX_IDA_REPORT_PATH to a writable JSON filename.
import os
import json
import hashlib
import idc
import idaapi
import idautils

MAX_FUNCTIONS = 300
MAX_INSTRUCTIONS = 100
MAX_PSEUDOCODE_CHARS = 10000


def as_text(value):
    try:
        if isinstance(value, unicode):
            return value
    except NameError:
        if isinstance(value, str):
            return value
    try:
        return str(value).decode('utf-8', 'replace')
    except Exception:
        try:
            return unicode(value)
        except Exception:
            return u''


def file_hash(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as source:
        while True:
            block = source.read(1024 * 1024)
            if not block:
                break
            digest.update(block)
    return digest.hexdigest()


def input_path():
    try:
        value = idc.GetInputFilePath()
        if value and os.path.isfile(value):
            return value
    except Exception:
        pass
    raise RuntimeError('IDA did not provide an accessible input-file path')


def main():
    output = os.environ.get('NYX_IDA_REPORT_PATH')
    if not output:
        raise RuntimeError('Set NYX_IDA_REPORT_PATH to a writable JSON file')
    idc.Wait()
    filename = input_path()
    decompiler_ok = False
    try:
        decompiler_ok = bool(idaapi.init_hexrays_plugin())
    except Exception:
        pass
    results = []
    for address in idautils.Functions():
        if len(results) >= MAX_FUNCTIONS:
            break
        asm = []
        for ea in idautils.FuncItems(address):
            if len(asm) >= MAX_INSTRUCTIONS:
                break
            try:
                asm.append('0x%X  %s' % (ea, as_text(idc.GetDisasm(ea))))
            except Exception:
                pass
        pseudo = None
        if decompiler_ok:
            try:
                func = idaapi.get_func(address)
                if func:
                    pseudo = as_text(idaapi.decompile(func))[:MAX_PSEUDOCODE_CHARS]
                    try:
                        pseudo = as_text(idaapi.tag_remove(pseudo))
                    except Exception:
                        pass
            except Exception:
                pass
        results.append({
            'address': '0x%X' % address,
            'name': as_text(idc.GetFunctionName(address))[:256],
            'disassembly': u'\n'.join(asm)[:10000],
            'pseudocode': pseudo
        })
    report = {
        'format': 'nyx-ida-report-v1',
        'source_sha256': file_hash(filename),
        'decompiler_available': decompiler_ok,
        'functions': results
    }
    encoded = json.dumps(report, ensure_ascii=True, separators=(',', ':'))
    with open(output, 'wb') as stream:
        if not isinstance(encoded, bytes):
            encoded = encoded.encode('utf-8')
        stream.write(encoded)
    print('NyX IDA report saved: %s (%d functions)' % (output, len(results)))


if __name__ == '__main__':
    try:
        main()
        idc.Exit(0)
    except Exception as exc:
        print('NyX IDA export failed: %s' % exc)
        idc.Exit(1)
