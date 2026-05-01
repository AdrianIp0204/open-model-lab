try:
    from .validate_overlays import main
except ImportError:  # pragma: no cover - script execution path
    from validate_overlays import main


if __name__ == "__main__":
    raise SystemExit(main())
