"""
Download Kaggle datasets for burnout prediction model training.
"""
import os
import sys
import json
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Set up Kaggle credentials
kaggle_dir = Path.home() / '.kaggle'
kaggle_dir.mkdir(exist_ok=True)

credentials = {
    "username": "zaid69",
    "key": "dfc5e549493c0744f5ce9ed7d89f8d43"
}

kaggle_json = kaggle_dir / 'kaggle.json'
with open(kaggle_json, 'w') as f:
    json.dump(credentials, f)

# Set permissions (important for Kaggle API)
os.chmod(kaggle_json, 0o600)

print("[OK] Kaggle credentials configured")

# Download datasets
import kaggle

data_dir = Path(__file__).parent.parent / 'data' / 'kaggle_raw'
data_dir.mkdir(parents=True, exist_ok=True)

datasets = [
    ('mdsultanulislamovi/student-stress-monitoring-datasets', 'stress_monitoring'),
    ('salahuddinahmedshuvo/student-mental-stress-and-coping-mechanisms', 'mental_stress_coping'),
]

print(f"\n[INFO] Downloading datasets to: {data_dir}\n")

for dataset_id, folder_name in datasets:
    output_path = data_dir / folder_name
    output_path.mkdir(exist_ok=True)
    
    print(f"[INFO] Downloading: {dataset_id}")
    try:
        kaggle.api.dataset_download_files(
            dataset_id,
            path=str(output_path),
            unzip=True,
            quiet=False
        )
        print(f"[OK] Downloaded to: {output_path}\n")
    except Exception as e:
        print(f"[ERROR] Error downloading {dataset_id}: {e}\n")

print("[SUCCESS] All downloads complete!")

