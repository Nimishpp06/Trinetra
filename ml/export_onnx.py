"""Convert the Keras LSTM forecasters to ONNX so the API can drop torch.

torch is ~700 MB installed, which does not fit any free host's Python
bundle. These models are ~1.3k params each, so onnxruntime (~60 MB) is a
far better runtime. Run from the repo root:

    python ml/export_onnx.py

Every conversion is followed by a parity check: the ONNX graph must agree
with Keras to within TOLERANCE across a spread of probe windows. On failure
the script exits non-zero and deletes the .onnx, so the server's Keras
fallback stays authoritative and nothing ships unverified.
"""

import os

# Must be set before the first keras import.
os.environ.setdefault("KERAS_BACKEND", "torch")

import sys
from pathlib import Path

import numpy as np

TOLERANCE = 1e-4
PROBE_COUNT = 128
MODELS_DIR = Path(__file__).resolve().parent.parent / "models" / "trained"
TARGETS = ("lstm_temp", "lstm_aq", "lstm_pm25", "lstm_pm10")


def probe_windows(window: int, features: int, rng) -> list[np.ndarray]:
    """Batch-1 windows in *scaled* space, i.e. what the scalers emit."""
    probes = [
        np.zeros((1, window, features)),  # dead sensors
        np.full((1, window, features), 3.0),  # saturated high
        np.full((1, window, features), -3.0),  # saturated low
        np.full((1, window, features), np.float32(1e-4)),  # near-zero, non-0
    ]
    probes += [
        rng.normal(size=(1, window, features)).astype(np.float32)
        for _ in range(PROBE_COUNT)
    ]
    return [p.astype(np.float32) for p in probes]


def convert(name: str) -> bool:
    import keras
    import onnxruntime as ort

    h5_path = MODELS_DIR / name / "forecaster.h5"
    onnx_path = MODELS_DIR / name / "forecaster.onnx"

    if not h5_path.exists():
        print(f"  SKIP  {name}: {h5_path} not found")
        return False

    model = keras.saving.load_model(h5_path, compile=False)
    _, window, features = model.input_shape

    # The app always scores exactly one window, so pin the batch dim. A
    # fully static shape also takes Keras' supported export path -- dynamic
    # shapes are explicitly not supported on the torch backend.
    spec = keras.InputSpec(shape=(1, window, features), dtype="float32")
    model(np.zeros((1, window, features), dtype="float32"), training=False)
    model.export(str(onnx_path), format="onnx", input_signature=[spec])

    sess = ort.InferenceSession(
        str(onnx_path), providers=["CPUExecutionProvider"]
    )
    graph_in = sess.get_inputs()[0]
    if list(graph_in.shape) != [1, window, features]:
        print(f"  FAIL  {name}: graph expects {graph_in.shape}, want "
              f"[(1, {window}, {features})]")
        onnx_path.unlink(missing_ok=True)
        return False

    worst = 0.0
    for x in probe_windows(window, features, np.random.default_rng(0)):
        expected = model.predict(x, verbose=0)
        got = sess.run(None, {graph_in.name: x})[0]
        worst = max(worst, float(np.max(np.abs(expected - got))))

    status = "OK  " if worst <= TOLERANCE else "FAIL"
    print(f"  {status}  {name}: (1,{window},{features})  "
          f"max|keras-onnx| = {worst:.3e}  (tol {TOLERANCE:.0e})  "
          f"{onnx_path.stat().st_size // 1024} KB")

    if worst > TOLERANCE:
        onnx_path.unlink(missing_ok=True)
        return False
    return True


def main() -> int:
    try:
        import onnxruntime  # noqa: F401
    except ImportError:
        print("onnxruntime is missing. Run: pip install onnxruntime onnx")
        return 1

    print(f"Exporting {len(TARGETS)} models from {MODELS_DIR}")
    failed = [name for name in TARGETS if not convert(name)]

    if failed:
        print(f"\nParity FAILED for: {', '.join(failed)}")
        print("Their .onnx files were removed; the server keeps using Keras.")
        return 1

    print("\nAll models converted and verified. "
          "torch and keras can be dropped from requirements.txt.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
