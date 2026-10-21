"""
===================================================================
 BloodFlow Smart IoT — Standard Raspberry Pi (Pi 3 / 4 / 5 / Zero 2W)
 Hardware: RC522 RFID + LCD 16x2 I2C + Emergency Push Button
 Language: Python 3
===================================================================

INSTALL DEPENDENCIES ON RASPBERRY PI:
  sudo apt-get update
  sudo apt-get install -y python3-pip python3-smbus i2c-tools
  sudo raspi-config  --> Interface Options --> Enable SPI and I2C
  pip3 install spidev mfrc522 RPLCD requests RPi.GPIO

RUN:
  python3 bloodflow_raspberry_pi.py

===================================================================
WIRING DIAGRAM (Standard 40-Pin Raspberry Pi Header):
===================================================================

1. RC522 RFID Reader (SPI0):
   RC522 VCC      -> Pin 1  (3.3V)  [WARNING: 3.3V ONLY, NEVER 5V!]
   RC522 GND      -> Pin 6  (GND)
   RC522 RST      -> Pin 22 (GPIO 25)
   RC522 SDA (SS) -> Pin 24 (GPIO 8 / CE0)
   RC522 SCK      -> Pin 23 (GPIO 11 / SCLK)
   RC522 MISO     -> Pin 21 (GPIO 9 / MISO)
   RC522 MOSI     -> Pin 19 (GPIO 10 / MOSI)

2. LCD 16x2 I2C Display (I2C-1):
   LCD VCC        -> Pin 2  (5V)
   LCD GND        -> Pin 9  (GND)
   LCD SDA        -> Pin 3  (GPIO 2 / SDA)
   LCD SCL        -> Pin 5  (GPIO 3 / SCL)

3. Emergency Fire Push Button:
   Button Leg 1   -> Pin 11 (GPIO 17)
   Button Leg 2   -> Pin 14 (GND)
   (Internal pull-up enabled in software - no external resistor needed)
===================================================================
"""

import time
import requests
import RPi.GPIO as GPIO
from mfrc522 import SimpleMFRC522
from RPLCD.i2c import CharLCD

# =========================================================
# CONFIGURATION
# =========================================================
SUPABASE_HOST = "gvwdrbrepbpmhjckdcyq.supabase.co"
SUPABASE_ANON_KEY = "sb_publishable_uPsHJqLyu5jZwpoK0GvoPw_TQUtty3D"
STORAGE_CODE = "ST001"
DEVICE_ID = "BLOOD-BANK-RASPBERRY-PI"

# GPIO Pins (BCM numbering)
BUTTON_PIN = 17    # Physical Pin 11
LCD_I2C_ADDR = 0x27  # Common address for 16x2 PCF8574 (use 0x3F if 0x27 doesn't display)

# Timing
HEARTBEAT_INTERVAL = 60  # seconds
DEBOUNCE_DELAY = 0.3    # seconds

# =========================================================
# INITIALIZATION
# =========================================================
GPIO.setmode(GPIO.BCM)
GPIO.setup(BUTTON_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)

# Initialize LCD
try:
    lcd = CharLCD(i2c_expander='PCF8574', address=LCD_I2C_ADDR, port=1, cols=16, rows=2, dotsize=8)
    lcd.clear()
    lcd.write_string("BloodFlow IoT\nStarting up...")
except Exception as e:
    print(f"[LCD Init Warning] {e}")
    lcd = None

# Initialize RFID
try:
    reader = SimpleMFRC522()
except Exception as e:
    print(f"[RFID Init Warning] {e}")
    reader = None

storage_unit_id = None
last_heartbeat = 0
last_button_press = 0
last_rfid_scan = 0
last_rfid_uid = None

# =========================================================
# SUPABASE API HELPERS
# =========================================================
def get_headers():
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

def fetch_storage_unit_id():
    global storage_unit_id
    url = f"https://{SUPABASE_HOST}/rest/v1/storage_units?storage_code=eq.{STORAGE_CODE}&select=id&limit=1"
    try:
        res = requests.get(url, headers=get_headers(), timeout=5)
        if res.status_code == 200:
            data = res.json()
            if data and len(data) > 0:
                storage_unit_id = data[0].get("id")
                print(f"[✓] Storage Unit ID: {storage_unit_id}")
    except Exception as e:
        print(f"[UUID Error] {e}")

def post_rfid_event(uid_str):
    url = f"https://{SUPABASE_HOST}/rest/v1/rfid_events"
    payload = {
        "rfid_uid": uid_str,
        "action": "ENTERED",
        "result": "SUCCESS"
    }
    if storage_unit_id:
        payload["storage_unit_id"] = storage_unit_id
    try:
        res = requests.post(url, json=payload, headers=get_headers(), timeout=5)
        print(f"[RFID POST] UID: {uid_str} -> HTTP {res.status_code}")
        return res.status_code in [200, 201]
    except Exception as e:
        print(f"[RFID Error] {e}")
        return False

def trigger_fire_emergency():
    url = f"https://{SUPABASE_HOST}/functions/v1/emergency-call?action=fire_emergency"
    payload = {
        "device_id": DEVICE_ID,
        "source": "hardware_button",
        "emergency_type": "FIRE",
        "message": "Fire emergency button pressed on Raspberry Pi Blood Bank Unit"
    }
    try:
        res = requests.post(url, json=payload, headers=get_headers(), timeout=5)
        print(f"[EMERGENCY POST] -> HTTP {res.status_code}")
        return res.status_code in [200, 201]
    except Exception as e:
        print(f"[Emergency Error] {e}")
        return False

def send_heartbeat():
    url = f"https://{SUPABASE_HOST}/rest/v1/iot_devices"
    headers = get_headers()
    headers["Prefer"] = "resolution=merge-duplicates,return=minimal"
    payload = {
        "device_id": DEVICE_ID,
        "status": "online",
        "wifi_status": "connected",
        "device_type": "RASPBERRY_PI_RC522_LCD",
        "firmware_version": "v1.0.0-python"
    }
    if storage_unit_id:
        payload["storage_unit_id"] = storage_unit_id
    try:
        res = requests.post(url, json=payload, headers=headers, timeout=5)
        print(f"[Heartbeat] -> HTTP {res.status_code}")
    except Exception as e:
        print(f"[Heartbeat Error] {e}")

def display_lcd(line1, line2=""):
    if not lcd:
        return
    try:
        lcd.clear()
        lcd.write_string(f"{line1[:16]}\n{line2[:16]}")
    except Exception as e:
        print(f"[LCD Error] {e}")

# =========================================================
# MAIN LOOP
# =========================================================
def main():
    global last_heartbeat, last_button_press, last_rfid_scan, last_rfid_uid
    print("=" * 50)
    print("  BloodFlow IoT Hardware Started on Raspberry Pi")
    print(f"  Device ID: {DEVICE_ID}")
    print("=" * 50)

    fetch_storage_unit_id()
    send_heartbeat()
    last_heartbeat = time.time()
    display_lcd("BloodFlow Ready", "Scan RFID Tag...")

    try:
        while True:
            current_time = time.time()

            # 1. EMERGENCY BUTTON CHECK
            if GPIO.input(BUTTON_PIN) == GPIO.LOW:
                if current_time - last_button_press > DEBOUNCE_DELAY:
                    last_button_press = current_time
                    print("\n🚨 [EMERGENCY] Hardware Push Button Activated!")
                    display_lcd("EMERGENCY!", "FIRE ALERT!")
                    trigger_fire_emergency()
                    time.sleep(3)  # Cooldown
                    display_lcd("BloodFlow Ready", "Scan RFID Tag...")

            # 2. RFID SCAN CHECK (non-blocking read)
            if reader and (current_time - last_rfid_scan > 2.0):
                try:
                    uid_num = reader.read_id_no_block()
                    if uid_num:
                        # Convert to hex representation standard format
                        uid_hex = hex(uid_num)[2:].upper()
                        if uid_hex != last_rfid_uid or (current_time - last_rfid_scan > 4.0):
                            last_rfid_uid = uid_hex
                            last_rfid_scan = current_time
                            print(f"\n🏷️ [RFID] Scanned UID: {uid_hex}")
                            display_lcd("RFID Scanned:", uid_hex)
                            post_rfid_event(uid_hex)
                            time.sleep(2)
                            display_lcd("BloodFlow Ready", "Scan RFID Tag...")
                except Exception as rfid_err:
                    print(f"[RFID Read Err] {rfid_err}")

            # 3. HEARTBEAT PERIODIC CHECK
            if current_time - last_heartbeat > HEARTBEAT_INTERVAL:
                last_heartbeat = current_time
                send_heartbeat()

            time.sleep(0.05)

    except KeyboardInterrupt:
        print("\nStopping BloodFlow IoT program...")
    finally:
        GPIO.cleanup()
        if lcd:
            try:
                lcd.clear()
            except:
                pass

if __name__ == "__main__":
    main()

