from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.demo_data import generate_demo_dataset  # noqa: E402


if __name__ == "__main__":
    output = generate_demo_dataset(ROOT / "data" / "sample_sales.csv")
    print(f"Generated demo dataset: {output}")
