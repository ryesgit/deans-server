#!/usr/bin/env python3

import evdev
import requests
import json
import sys
from typing import Optional

SCANNER_DEVICE = "/dev/input/event6"
SERVER_URL = "http://localhost:3001/api/qr/scan"

KEY_MAPPINGS = {
    evdev.ecodes.KEY_1: '1', evdev.ecodes.KEY_2: '2', evdev.ecodes.KEY_3: '3',
    evdev.ecodes.KEY_4: '4', evdev.ecodes.KEY_5: '5', evdev.ecodes.KEY_6: '6',
    evdev.ecodes.KEY_7: '7', evdev.ecodes.KEY_8: '8', evdev.ecodes.KEY_9: '9',
    evdev.ecodes.KEY_0: '0',
    evdev.ecodes.KEY_A: 'a', evdev.ecodes.KEY_B: 'b', evdev.ecodes.KEY_C: 'c',
    evdev.ecodes.KEY_D: 'd', evdev.ecodes.KEY_E: 'e', evdev.ecodes.KEY_F: 'f',
    evdev.ecodes.KEY_G: 'g', evdev.ecodes.KEY_H: 'h', evdev.ecodes.KEY_I: 'i',
    evdev.ecodes.KEY_J: 'j', evdev.ecodes.KEY_K: 'k', evdev.ecodes.KEY_L: 'l',
    evdev.ecodes.KEY_M: 'm', evdev.ecodes.KEY_N: 'n', evdev.ecodes.KEY_O: 'o',
    evdev.ecodes.KEY_P: 'p', evdev.ecodes.KEY_Q: 'q', evdev.ecodes.KEY_R: 'r',
    evdev.ecodes.KEY_S: 's', evdev.ecodes.KEY_T: 't', evdev.ecodes.KEY_U: 'u',
    evdev.ecodes.KEY_V: 'v', evdev.ecodes.KEY_W: 'w', evdev.ecodes.KEY_X: 'x',
    evdev.ecodes.KEY_Y: 'y', evdev.ecodes.KEY_Z: 'z',
    evdev.ecodes.KEY_MINUS: '-', evdev.ecodes.KEY_EQUAL: '=',
    evdev.ecodes.KEY_SLASH: '/', evdev.ecodes.KEY_DOT: '.',
    evdev.ecodes.KEY_COMMA: ',', evdev.ecodes.KEY_SEMICOLON: ';',
}

def send_user_id(user_id: str) -> Optional[dict]:
    try:
        print(f"Sending user ID: {user_id.upper()}")
        response = requests.post(
            SERVER_URL,
            json={"userId": user_id.upper()},
            headers={"Content-Type": "application/json"},
            timeout=10
        )

        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")

        return result

    except requests.exceptions.RequestException as e:
        print(f"Error sending request: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"Error decoding response: {e}")
        print(f"Raw response: {response.text}")
        return None

def listen_scanner():
    try:
        device = evdev.InputDevice(SCANNER_DEVICE)
        print(f"Listening to scanner: {device.name}")
        print(f"Device path: {SCANNER_DEVICE}")
        print("Waiting for scans... (Press Ctrl+C to exit)\n")

        device.grab()

        current_scan = []

        for event in device.read_loop():
            if event.type == evdev.ecodes.EV_KEY:
                key_event = evdev.categorize(event)

                if key_event.keystate == key_event.key_down:
                    if key_event.keycode == 'KEY_ENTER':
                        if current_scan:
                            user_id = ''.join(current_scan)
                            print(f"\nScanned: {user_id}")
                            send_user_id(user_id)
                            current_scan = []
                            print("\nWaiting for next scan...")

                    elif isinstance(key_event.keycode, str):
                        keycode = getattr(evdev.ecodes, key_event.keycode, None)
                        if keycode in KEY_MAPPINGS:
                            current_scan.append(KEY_MAPPINGS[keycode])

                    elif isinstance(key_event.keycode, list):
                        for kc_name in key_event.keycode:
                            keycode = getattr(evdev.ecodes, kc_name, None)
                            if keycode in KEY_MAPPINGS:
                                current_scan.append(KEY_MAPPINGS[keycode])
                                break

    except PermissionError:
        print(f"Permission denied. Run with sudo:")
        print(f"sudo python3 {sys.argv[0]}")
        sys.exit(1)
    except FileNotFoundError:
        print(f"Scanner device not found: {SCANNER_DEVICE}")
        print("Available devices:")
        for device_path in evdev.list_devices():
            device = evdev.InputDevice(device_path)
            print(f"  {device_path}: {device.name}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nStopping scanner listener...")
        device.ungrab()
        sys.exit(0)
    except Exception as e:
        print(f"Unexpected error: {e}")
        if 'device' in locals():
            device.ungrab()
        sys.exit(1)

if __name__ == "__main__":
    print("=== Scanner Client for Dean's Server ===\n")
    listen_scanner()
