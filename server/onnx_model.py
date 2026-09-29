"""ONNX inference for the LSTM forecasters.

The torch backend is ~700 MB installed, which will not fit a free host's
Python bundle. These models are ~1.3k params each, so onnxruntime (~60 MB)
runs them to within 1e-7 of Keras -- verified by ml/export_onnx.py.

`OnnxRegressor.predict()` duck-types `keras.Model.predict()`, so
`forecast_multi()` and `/predict` keep calling `model.predict(x, verbose=0)`
unchanged.

ONNX is the shipping path. The Keras `.h5` branch only exists so local dev
keeps working before `ml/export_onnx.py` has been run.
"""

from pathlib import Path

import numpy as np


class OnnxRegressor:
    """Minimal stand-in for keras.Model on the inference-only surface."""

    def __init__(self, path):
        import onnxruntime as ort

        self.path = Path(path)
        self._session = ort.InferenceSession(
            str(self.path), providers=["CPUExecutionProvider"]
        )
        self._input = self._session.get_inputs()[0].name
        self.input_shape = tuple(self._session.get_inputs()[0].shape)

    def predict(self, x, verbose=0, **kwargs):
        """Same contract as keras.Model.predict: ndarray in, ndarray out.

        Casts to float32 because ONNX is strict about dtype, while Keras
        silently accepts the float64 arrays the scaler pipeline produces.
        """
        arr = np.asarray(x, dtype=np.float32)
        return self._session.run(None, {self._input: arr})[0]


def load_regressor(directory, stem="forecaster"):
    """Load ``<directory>/<stem>.onnx``, falling back to ``<stem>.h5``.

    Returns None when neither exists or neither can be loaded; callers
    treat that as "model unavailable" rather than raising.
    """
    directory = Path(directory)

    onnx_path = directory / f"{stem}.onnx"
    if onnx_path.exists():
        try:
            return OnnxRegressor(onnx_path)
        except Exception:
            pass  # unusable graph -- fall through to the Keras copy

    h5_path = directory / f"{stem}.h5"
    if h5_path.exists():
        try:
            from keras.models import load_model

            return load_model(str(h5_path), compile=False)
        except Exception:
            return None
    return None
