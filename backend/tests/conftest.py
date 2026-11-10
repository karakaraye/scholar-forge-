import pytest


@pytest.fixture(autouse=True)
def isolated_media_root(settings, tmp_path):
    """Keeps uploads and generated exports out of the source tree during tests."""
    settings.MEDIA_ROOT = tmp_path / "media"
    return settings.MEDIA_ROOT
