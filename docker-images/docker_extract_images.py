import subprocess
import json
import sys
import os.path

fname = os.path.abspath(sys.argv[1])
name = os.path.basename(fname)
if name.endswith(".tar.gz"):
   name = name[:-7]
else:
   name = f'{name}.img'

workspace = os.path.abspath('.')
tmpdir = os.path.join(workspace, '.tmp')
targetdir = os.path.join(workspace, name)
subprocess.check_output(["mkdir", "-p", tmpdir])
subprocess.check_output(["mkdir", "-p", targetdir])
print("extracting docker image ...")
subprocess.check_output(["tar", "zxf", fname], cwd=tmpdir)
manifestFname = os.path.join(tmpdir, "manifest.json")
with open(manifestFname, 'r') as f:
   manifest = json.loads(f.read())
for tarFname in manifest[0]["Layers"]:
   print(f"extracting layer {tarFname} ...")
   tarFname = os.path.join(tmpdir, tarFname)
   subprocess.check_output(["tar", "xf", tarFname], cwd=targetdir)
subprocess.check_output(["rm", "-rf", tmpdir])
print("Done.")
