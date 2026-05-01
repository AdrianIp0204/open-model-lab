try:
    from .translate_content import main
except ImportError:  # pragma: no cover - script execution path
    from translate_content import main


if __name__ == "__main__":
    raise SystemExit(main())
