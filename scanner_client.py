#!/usr/bin/env python3

import json
import os
import sys
from typing import Iterable, Optional
from urllib.parse import urlparse

import evdev
import requests

DEFAULT_SERVER_URL = "https://deans-server-x4daosqtwq-an.a.run.app/api/qr/scan"
SCANNER_DEVICE_ENV = "SCANNER_DEVICE"
SCANNER_NAME_HINT_ENV = "SCANNER_NAME_HINT"
SERVER_URL_ENV = "SCANNER_SERVER_URL"

DEVICE_NAME_HINTS = (
    "scanner",
    "scancode",
    "barcode",
    "qr",
    "honeywell",
    "zebra",
    "symbol",
    "datalogic",
)

KEY_MAPPINGS = {
    evdev.ecodes.KEY_1: "1",
    evdev.ecodes.KEY_2: "2",
    evdev.ecodes.KEY_3: "3",
    evdev.ecodes.KEY_4: "4",
    evdev.ecodes.KEY_5: "5",
    evdev.ecodes.KEY_6: "6",
    evdev.ecodes.KEY_7: "7",
    evdev.ecodes.KEY_8: "8",
    evdev.ecodes.KEY_9: "9",
    evdev.ecodes.KEY_0: "0",
    evdev.ecodes.KEY_KP1: "1",
    evdev.ecodes.KEY_KP2: "2",
    evdev.ecodes.KEY_KP3: "3",
    evdev.ecodes.KEY_KP4: "4",
    evdev.ecodes.KEY_KP5: "5",
    evdev.ecodes.KEY_KP6: "6",
    evdev.ecodes.KEY_KP7: "7",
    evdev.ecodes.KEY_KP8: "8",
    evdev.ecodes.KEY_KP9: "9",
    evdev.ecodes.KEY_KP0: "0",
    evdev.ecodes.KEY_A: "a",
    evdev.ecodes.KEY_B: "b",
    evdev.ecodes.KEY_C: "c",
    evdev.ecodes.KEY_D: "d",
    evdev.ecodes.KEY_E: "e",
    evdev.ecodes.KEY_F: "f",
    evdev.ecodes.KEY_G: "g",
    evdev.ecodes.KEY_H: "h",
    evdev.ecodes.KEY_I: "i",
    evdev.ecodes.KEY_J: "j",
    evdev.ecodes.KEY_K: "k",
    evdev.ecodes.KEY_L: "l",
    evdev.ecodes.KEY_M: "m",
    evdev.ecodes.KEY_N: "n",
    evdev.ecodes.KEY_O: "o",
    evdev.ecodes.KEY_P: "p",
    evdev.ecodes.KEY_Q: "q",
    evdev.ecodes.KEY_R: "r",
    evdev.ecodes.KEY_S: "s",
    evdev.ecodes.KEY_T: "t",
    evdev.ecodes.KEY_U: "u",
    evdev.ecodes.KEY_V: "v",
    evdev.ecodes.KEY_W: "w",
    evdev.ecodes.KEY_X: "x",
    evdev.ecodes.KEY_Y: "y",
    evdev.ecodes.KEY_Z: "z",
    evdev.ecodes.KEY_MINUS: "-",
    evdev.ecodes.KEY_EQUAL: "=",
    evdev.ecodes.KEY_SLASH: "/",
    evdev.ecodes.KEY_DOT: ".",
    evdev.ecodes.KEY_COMMA: ",",
    evdev.ecodes.KEY_SEMICOLON: ";",
}


def normalize_server_url(raw_url: str) -> str:
    cleaned_url = raw_url.strip().rstrip("/")
    if not cleaned_url:
        return DEFAULT_SERVER_URL

    parsed = urlparse(cleaned_url)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError(
            f"Invalid scanner server URL: {raw_url!r}. "
            "Use a full URL such as https://deans-server-x4daosqtwq-an.a.run.app/api/qr/scan"
        )

    if parsed.path.endswith("/api/qr/scan"):
        return cleaned_url

    return f"{cleaned_url}/api/qr/scan"


def get_server_url() -> str:
    return normalize_server_url(os.getenv(SERVER_URL_ENV, DEFAULT_SERVER_URL))


def iter_input_devices() -> Iterable[evdev.InputDevice]:
    for device_path in evdev.list_devices():
        yield evdev.InputDevice(device_path)


def device_has_keyboard_keys(device: evdev.InputDevice) -> bool:
    capabilities = device.capabilities().get(evdev.ecodes.EV_KEY, [])
    return bool(capabilities)


def find_scanner_device() -> evdev.InputDevice:
    configured_device = os.getenv(SCANNER_DEVICE_ENV)
    if configured_device:
        return evdev.InputDevice(configured_device)

    name_hint = os.getenv(SCANNER_NAME_HINT_ENV, "").strip().lower()
    hints = tuple(filter(None, (name_hint, *DEVICE_NAME_HINTS)))

    candidates = []
    fallback_devices = []

    for device in iter_input_devices():
        if not device_has_keyboard_keys(device):
            continue

        fallback_devices.append(device)
        lower_name = device.name.lower()
        if any(hint in lower_name for hint in hints):
            candidates.append(device)

    if candidates:
        return candidates[0]

    if len(fallback_devices) == 1:
        return fallback_devices[0]

    available = "\n".join(
        f"  {device.path}: {device.name}" for device in fallback_devices
    ) or "  No keyboard-like input devices found."

    raise FileNotFoundError(
        "Unable to auto-detect the QR scanner.\n"
        f"Set {SCANNER_DEVICE_ENV} to the correct /dev/input/eventX path.\n"
        f"Available devices:\n{available}"
    )


def send_user_id(user_id: str) -> Optional[dict]:
    normalized_user_id = user_id.strip().upper()
    if not normalized_user_id:
        return None

    try:
        server_url = get_server_url()
        print(f"Sending user ID: {normalized_user_id}")
        print(f"Target URL: {server_url}")

        response = requests.post(
            server_url,
            json={"userId": normalized_user_id},
            headers={"Content-Type": "application/json"},
            timeout=10,
        )

        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        return result

    except requests.exceptions.RequestException as error:
        print(f"Error sending request: {error}")
        return None
    except json.JSONDecodeError as error:
        print(f"Error decoding response: {error}")
        print(f"Raw response: {response.text}")
        return None


def append_keycode(current_scan: list[str], keycode_name) -> None:
    if isinstance(keycode_name, str):
        keycode = getattr(evdev.ecodes, keycode_name, None)
        mapped = KEY_MAPPINGS.get(keycode)
        if mapped:
            current_scan.append(mapped)
        return

    if isinstance(keycode_name, list):
        for candidate in keycode_name:
            previous_length = len(current_scan)
            append_keycode(current_scan, candidate)
            if len(current_scan) > previous_length:
                return


def listen_scanner() -> None:
    device = None

    try:
        device = find_scanner_device()
        print(f"Listening to scanner: {device.name}")
        print(f"Device path: {device.path}")
        print(f"Server URL: {get_server_url()}")
        print("Waiting for scans... (Press Ctrl+C to exit)\n")

        device.grab()
        current_scan: list[str] = []

        for event in device.read_loop():
            if event.type != evdev.ecodes.EV_KEY:
                continue

            key_event = evdev.categorize(event)
            if key_event.keystate != key_event.key_down:
                continue

            if key_event.keycode in ("KEY_ENTER", "KEY_KPENTER"):
                if current_scan:
                    user_id = "".join(current_scan)
                    print(f"\nScanned: {user_id}")
                    send_user_id(user_id)
                    current_scan = []
                    print("\nWaiting for next scan...")
                continue

            append_keycode(current_scan, key_event.keycode)

    except PermissionError:
        print("Permission denied while opening the scanner device.")
        print(f"Try: sudo -E python3 {sys.argv[0]}")
        sys.exit(1)
    except FileNotFoundError as error:
        print(error)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nStopping scanner listener...")
        sys.exit(0)
    except Exception as error:
        print(f"Unexpected error: {error}")
        sys.exit(1)
    finally:
        if device is not None:
            try:
                device.ungrab()
            except OSError:
                pass


if __name__ == "__main__":
    print("=== Scanner Client for Dean's Server ===\n")
    listen_scanner()
