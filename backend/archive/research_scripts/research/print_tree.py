import os, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def tree(path: Path, prefix: str = ""):
    items = sorted(os.listdir(path))
    for i, name in enumerate(items):
        p = path / name
        connector = "`-- " if i == len(items) - 1 else "|-- "
        print(prefix + connector + name)
        if p.is_dir():
            new_prefix = prefix + ("    " if i == len(items) - 1 else "|   ")
            tree(p, new_prefix)

if __name__ == "__main__":
    out = ROOT / "folder_tree.txt"
    with open(out, "w", encoding="utf-8") as f:
        sys.stdout = f
        print("Project tree for:", str(ROOT))
        tree(ROOT)
    sys.stdout = sys.__stdout__
    print(f"Saved folder tree to: {out}")

# Run: python research/print_tree.py
