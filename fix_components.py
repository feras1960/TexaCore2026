import os
import re

out_dir = 'src/app/(dashboard)/new-dashboard/_components'
shared_dir = os.path.join(out_dir, 'shared')

with open('/Users/macbook/Downloads/DashboardPage.tsx', 'r') as f:
    text = f.read()

def extract(func_name):
    pattern = r"function\s+" + func_name + r"\s*[<\(]"
    match = re.search(pattern, text)
    if not match: return None
    lines = text[match.start():].split('\n')
    out = []
    for line in lines:
        out.append(line)
        if line == "}": break
    return "\n".join(out)

skel = extract('SkeletonBlock')
if skel:
    with open(os.path.join(shared_dir, 'SkeletonBlock.tsx'), 'w') as f:
        f.write(f"export {skel}\n")

# Now inject proper imports into the ones that use SkeletonBlock
for root, dirs, files in os.walk(out_dir):
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        with open(path, 'r') as f:
            content = f.read()
        
        needs_skel = 'SkeletonBlock' in content and 'export function SkeletonBlock' not in content
        if needs_skel:
            prefix = './shared/SkeletonBlock' if 'shared' not in root else './SkeletonBlock'
            import_line = f"import {{ SkeletonBlock }} from '{prefix}';\n"
            content = import_line + content
            with open(path, 'w') as f:
                f.write(content)

print("Fixed skeleton imports")
