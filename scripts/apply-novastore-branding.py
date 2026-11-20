#!/usr/bin/env python3
"""Apply NovaStore identity and palette to the pinned SideStore source checkout."""
from pathlib import Path
import json
import plistlib
import re

root = Path(__file__).resolve().parents[1] / "NovaStoreCore"
plist_path = root / "AltStore" / "Info.plist"
build_config = root / "Build.xcconfig"
onboarding_path = root / "SideStore" / "Views" / "Onboarding" / "OnboardingView.swift"

for required in (plist_path, build_config, onboarding_path):
    if not required.is_file():
        raise SystemExit(f"Expected upstream file is missing: {required}")

with plist_path.open("rb") as f:
    info = plistlib.load(f)
info["CFBundleDisplayName"] = "NovaStore"
url_types = info.setdefault("CFBundleURLTypes", [])
general = next((item for item in url_types if item.get("CFBundleURLName") == "SideStore General"), None)
if general is not None:
    schemes = general.setdefault("CFBundleURLSchemes", [])
    if "novastore" not in schemes:
        schemes.append("novastore")
with plist_path.open("wb") as f:
    plistlib.dump(info, f, sort_keys=False)

source = onboarding_path.read_text()
source = source.replace("Welcome to SideStore", "Welcome to NovaStore")
source = source.replace("SideStore can use local network access", "NovaStore can use local network access")
onboarding_path.write_text(source)

# Use a distinct app ID and app-group namespace. Keep Debug and Release identical.
config = build_config.read_text()
replacements = {
    r"(?m)^DEVELOPMENT_TEAM\s*=.*$": "DEVELOPMENT_TEAM =",
    r"(?m)^ORG_IDENTIFIER\s*=.*$": "ORG_IDENTIFIER = com.novastore",
    r"(?m)^PRODUCT_NAME\s*=.*$": "PRODUCT_NAME = NovaStore",
    r"(?m)^BASE_BUNDLE_ID\s*=.*$": "BASE_BUNDLE_ID = com.novastore.app",
    r"(?m)^MAIN_BUNDLE_IDENTIFIER\[config=Debug\]\s*=.*$": "MAIN_BUNDLE_IDENTIFIER[config=Debug] = $(BASE_BUNDLE_ID)",
    r"(?m)^MAIN_BUNDLE_IDENTIFIER\[config=Release\]\s*=.*$": "MAIN_BUNDLE_IDENTIFIER[config=Release] = $(BASE_BUNDLE_ID)",
    r"(?m)^APP_GROUP_IDENTIFIER\s*=.*$": "APP_GROUP_IDENTIFIER = $(MAIN_BUNDLE_IDENTIFIER)",
    r"(?m)^ICLOUD_CONTAINER_IDENTIFIER\s*=.*$": "ICLOUD_CONTAINER_IDENTIFIER = iCloud.com.novastore.app",
}
for pattern, replacement in replacements.items():
    config, count = re.subn(pattern, lambda _: replacement, config)
    if count != 1:
        raise SystemExit(f"Expected exactly one Build.xcconfig setting for {pattern}, found {count}")
build_config.write_text(config)

# NovaStore palette: near-black surfaces with violet/indigo accent gradients.
palette = {
    "Background": {"dark": (0.035, 0.035, 0.060), "light": (1.0, 1.0, 1.0)},
    "GradientTop": {"dark": (0.30, 0.20, 0.92), "light": (0.36, 0.24, 0.94)},
    "GradientBottom": {"dark": (0.12, 0.10, 0.42), "light": (0.22, 0.16, 0.68)},
    "SettingsHighlighted": {"dark": (0.42, 0.30, 1.0), "light": (0.38, 0.25, 0.94)},
}
for name, variants in palette.items():
    color_file = root / "AltStore" / "Resources" / "Assets.xcassets" / "Colors" / f"{name}.colorset" / "Contents.json"
    if not color_file.is_file():
        raise SystemExit(f"Missing color asset: {color_file}")
    data = json.loads(color_file.read_text())
    for entry in data.get("colors", []):
        dark = any(a.get("appearance") == "luminosity" and a.get("value") == "dark" for a in entry.get("appearances", []))
        rgb = variants["dark" if dark else "light"]
        entry["color"] = {"color-space": "srgb", "components": {
            "red": f"{rgb[0]:.3f}", "green": f"{rgb[1]:.3f}",
            "blue": f"{rgb[2]:.3f}", "alpha": "1.000"
        }}
    color_file.write_text(json.dumps(data, indent=2) + "\n")

print("NovaStore name, bundle namespace, onboarding text and violet palette applied.")
