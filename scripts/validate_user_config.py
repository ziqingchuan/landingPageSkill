#!/usr/bin/env python3
"""Validate user_config_info.json for the compose-landing-page skill."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


SUPPORTED_SUBJECTS = {"中文", "数学", "英文"}
SUPPORTED_DEVICES = {"PC", "移动端"}
KNOWN_FIELDS = {
    "name",
    "phone",
    "email",
    "age",
    "level",
    "grade",
    "region",
    "language",
}


def _extract_json(text: str) -> str:
    text = text.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)```", text, flags=re.S)
    if fenced:
        text = fenced.group(1).strip()

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found.")

    candidate = text[start : end + 1]
    candidate = re.sub(r"\\([_{}\[\]().-])", r"\1", candidate)
    return candidate


def load_config(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    return json.loads(_extract_json(text))


def bool_value(value: Any) -> bool:
    return isinstance(value, bool) and value


def validate(config: dict[str, Any]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    project = config.get("project")
    delivery = config.get("delivery")
    fields = config.get("fields")

    if not isinstance(config.get("version"), str) or not config["version"].strip():
        errors.append("version must be a non-empty string.")

    if not isinstance(project, dict):
        errors.append("project must be an object.")
        project = {}

    if not isinstance(delivery, dict):
        errors.append("delivery must be an object.")
        delivery = {}

    if not isinstance(fields, list):
        errors.append("fields must be an array.")
        fields = []

    subject = project.get("subject")
    if subject not in SUPPORTED_SUBJECTS:
        errors.append("project.subject must be one of: 中文, 数学, 英文.")

    for key in ("name", "language", "theme"):
        if not isinstance(project.get(key), str) or not project[key].strip():
            errors.append(f"project.{key} must be a non-empty string.")

    devices = delivery.get("devices")
    if not isinstance(devices, list) or not set(devices).intersection(SUPPORTED_DEVICES):
        errors.append("delivery.devices must include at least one of: PC, 移动端.")

    for key in ("booking", "multiChild", "multiSubject", "phoneVerify", "emailVerify"):
        if key in delivery and not isinstance(delivery[key], bool):
            errors.append(f"delivery.{key} must be a boolean when present.")

    if bool_value(delivery.get("multiChild")):
        max_children = delivery.get("maxChildren")
        if not isinstance(max_children, int) or not 1 <= max_children <= 3:
            errors.append("delivery.maxChildren must be an integer from 1 to 3 when multiChild is true.")

    field_map: dict[str, dict[str, Any]] = {}
    for index, field in enumerate(fields):
        if not isinstance(field, dict):
            errors.append(f"fields[{index}] must be an object.")
            continue
        field_id = field.get("id")
        if not isinstance(field_id, str) or not field_id:
            errors.append(f"fields[{index}].id must be a non-empty string.")
            continue
        if field_id not in KNOWN_FIELDS:
            warnings.append(f"fields[{index}].id '{field_id}' is not a known field; keep it editable and required if enabled.")
        if not isinstance(field.get("label"), str) or not field["label"].strip():
            errors.append(f"fields[{index}].label must be a non-empty string.")
        if not isinstance(field.get("enabled"), bool):
            errors.append(f"fields[{index}].enabled must be a boolean.")
        if "locked" in field and not isinstance(field["locked"], bool):
            errors.append(f"fields[{index}].locked must be a boolean when present.")
        field_map[field_id] = field

    def enabled(field_id: str) -> bool:
        return bool_value(field_map.get(field_id, {}).get("enabled"))

    if not (enabled("phone") or enabled("email")):
        errors.append("At least one contact field must be enabled: phone or email.")

    if not enabled("region"):
        errors.append("region must be enabled.")

    if subject == "中文":
        if not enabled("age"):
            errors.append("age must be enabled for 中文 courses.")
        if not enabled("level"):
            errors.append("level must be enabled for 中文 courses.")

    if subject in {"英文", "数学"} and not enabled("grade"):
        errors.append("grade must be enabled for 英文 or 数学 courses.")

    if bool_value(delivery.get("phoneVerify")) and not enabled("phone"):
        warnings.append("phoneVerify is true but phone is not enabled.")

    if bool_value(delivery.get("emailVerify")) and not enabled("email"):
        warnings.append("emailVerify is true but email is not enabled.")

    return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate user_config_info.json.")
    parser.add_argument("config", type=Path, help="Path to a JSON file or Markdown file containing JSON.")
    args = parser.parse_args()

    try:
        config = load_config(args.config)
    except Exception as exc:
        print(f"ERROR: failed to read config: {exc}", file=sys.stderr)
        return 2

    errors, warnings = validate(config)

    for warning in warnings:
        print(f"WARNING: {warning}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print("OK: user_config_info.json passed validation.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
