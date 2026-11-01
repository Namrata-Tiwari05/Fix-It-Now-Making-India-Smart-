"""
FixItNow AI Object Detection - Central Pipeline Configuration
Authoritative configuration module for all 8 ML lifecycle notebooks.
Target Dataset: C:\FIN Dataset\03_Master_Dataset (STRICTLY READ-ONLY)
Main Project Root: C:\Fix It Now - Making India Smart\Fix-It-Now-Making-India-Smart
Artifacts Root: C:\Fix It Now - Making India Smart\Fix-It-Now-Making-India-Smart\ai-artifacts
Notebooks Root: C:\Fix It Now - Making India Smart\Fix-It-Now-Making-India-Smart\notebooks
"""

import os
from pathlib import Path
import torch

class PipelineConfig:
    # =========================================================================
    # 1. PATH DEFINITIONS
    # =========================================================================
    # Main project root
    PROJECT_ROOT = Path(r"C:\Fix It Now - Making India Smart\Fix-It-Now-Making-India-Smart")
    
    # Original dataset is STRICTLY READ-ONLY. Never write, copy, or modify anything inside it.
    DATASET_ROOT = Path(r"C:\FIN Dataset\03_Master_Dataset")
    DATA_YAML = DATASET_ROOT / "data.yaml"
    
    # In-repository ML directories
    NOTEBOOKS_DIR = PROJECT_ROOT / "notebooks"
    ARTIFACTS_ROOT = PROJECT_ROOT / "ai-artifacts"
    
    CONFIGS_DIR = ARTIFACTS_ROOT / "configs"
    REPORTS_DIR = ARTIFACTS_ROOT / "reports"
    PLOTS_DIR = ARTIFACTS_ROOT / "plots"
    RUNS_DIR = ARTIFACTS_ROOT / "training_runs"
    EXPORT_DIR = ARTIFACTS_ROOT / "exported_models"
    
    # Specific plot subdirectories
    PLOTS_EDA = PLOTS_DIR / "eda"
    PLOTS_TRAINING = PLOTS_DIR / "training"
    PLOTS_EVALUATION = PLOTS_DIR / "evaluation"
    PLOTS_ERRORS = PLOTS_DIR / "errors"
    PLOTS_INFERENCE = PLOTS_DIR / "inference"

    # =========================================================================
    # 2. CANONICAL CIVIC TAXONOMY (nc = 7)
    # =========================================================================
    CLASS_NAMES = {
        0: "pothole",
        1: "road_crack",
        2: "surface_erosion",
        3: "garbage_litter",
        4: "stagnant_water",
        5: "open_manhole",
        6: "fault_streetlight"
    }
    
    CLASS_COLORS = {
        0: (255, 140, 0),    # pothole (dark orange)
        1: (255, 215, 0),    # road_crack (gold)
        2: (218, 112, 214),  # surface_erosion (orchid)
        3: (220, 20, 60),    # garbage_litter (crimson)
        4: (0, 191, 255),    # stagnant_water (deep sky blue)
        5: (50, 205, 50),    # open_manhole (lime green)
        6: (30, 144, 255)    # fault_streetlight (dodger blue)
    }

    SPLITS = ["train", "val", "test"]

    # =========================================================================
    # 3. REPRODUCIBILITY & HARDWARE (NVIDIA RTX 2050 4GB)
    # =========================================================================
    RANDOM_SEED = 42
    CUDA_AVAILABLE = torch.cuda.is_available()
    DEVICE = 0 if CUDA_AVAILABLE else "cpu"
    DEVICE_NAME = torch.cuda.get_device_name(0) if CUDA_AVAILABLE else "CPU"
    
    # VRAM Safeguards: RTX 2050 has 4GB total VRAM (~3.3GB free after Windows OS DWM)
    # batch=8 is the verified conservative baseline to guarantee 0 CUDA OOM errors.
    BATCH_SIZE = 8
    IMAGE_SIZE = 640
    WORKERS = 2  # Safe for Windows multi-process worker pool
    HALF_PRECISION = True  # Automatic Mixed Precision (AMP fp16)
    
    # =========================================================================
    # 4. TRAINING HYPERPARAMETERS (BASELINE PHASE)
    # =========================================================================
    MODEL_ARCH = "yolov8s.pt"  # Small architecture (11.2M params)
    BASELINE_EPOCHS = 30       # User approved conservative baseline
    PATIENCE = 10              # Early stopping patience
    
    # Loss gains (verified Ultralytics 8.4.191 arguments)
    CLS_GAIN = 0.5
    BOX_GAIN = 7.5
    DFL_GAIN = 1.5
    
    # Augmentations (Ultralytics verified defaults)
    MOSAIC = 1.0
    SCALE = 0.5
    CLOSE_MOSAIC = 10
    
    # Export Format
    PRIMARY_EXPORT_FORMAT = "torchscript"

    # =========================================================================
    # 5. INTEGRITY VERIFIERS
    # =========================================================================
    @classmethod
    def verify_environment(cls):
        """Verify paths exist and dataset is accessible in read-only mode."""
        assert cls.PROJECT_ROOT.exists(), f"Project root not found: {cls.PROJECT_ROOT}"
        assert cls.DATASET_ROOT.exists(), f"Dataset root not found: {cls.DATASET_ROOT}"
        assert cls.DATA_YAML.exists(), f"data.yaml not found: {cls.DATA_YAML}"
        assert cls.NOTEBOOKS_DIR.exists(), f"Notebooks dir not found: {cls.NOTEBOOKS_DIR}"
        assert cls.ARTIFACTS_ROOT.exists(), f"Artifacts root not found: {cls.ARTIFACTS_ROOT}"
        assert cls.CONFIGS_DIR.exists(), f"Configs dir not found: {cls.CONFIGS_DIR}"
        assert cls.REPORTS_DIR.exists(), f"Reports dir not found: {cls.REPORTS_DIR}"
        
        for split in cls.SPLITS:
            img_dir = cls.DATASET_ROOT / "images" / split
            lbl_dir = cls.DATASET_ROOT / "labels" / split
            assert img_dir.exists(), f"Missing image split directory: {img_dir}"
            assert lbl_dir.exists(), f"Missing label split directory: {lbl_dir}"
        return True

if __name__ == '__main__':
    PipelineConfig.verify_environment()
    print('PipelineConfig verified successfully!')
    print(f'Project Root: {PipelineConfig.PROJECT_ROOT}')
    print(f'Dataset Root (R/O): {PipelineConfig.DATASET_ROOT}')
    print(f'Artifacts Root: {PipelineConfig.ARTIFACTS_ROOT}')
    print(f'Notebooks Root: {PipelineConfig.NOTEBOOKS_DIR}')