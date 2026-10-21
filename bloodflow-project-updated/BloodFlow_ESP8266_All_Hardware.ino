/*
 * ===================================================================
 *  BloodFlow Smart IoT — ESP8266 + LCD 16x2 I2C + RC522 + Button
 *  (DS18B20 Temperature Sensor Disabled / Optional)
 *
 *  CURRENT WIRING:
 *  ---------------------------------
 *  1. RC522 RFID READER:
 *     RC522 VCC             → 3V3   (⚠️ 3.3V ONLY — NEVER 5V!)
 *     RC522 GND             → GND
 *     RC522 RST             → D3 (GPIO 0)
 *     RC522 SDA (SS)        → D4 (GPIO 2)
 *     RC522 SCK             → D5 (GPIO 14)
 *     RC522 MISO            → D6 (GPIO 12)
 *     RC522 MOSI            → D7 (GPIO 13)
 *
 *  2. LCD 16x2 I2C DISPLAY:
 *     LCD VCC               → VIN / 5V
 *     LCD GND               → GND
 *     LCD SDA               → D2 (GPIO 4)
 *     LCD SCL               → D1 (GPIO 5)
 *
 *  3. EMERGENCY FIRE PUSH BUTTON:
 *     Button Leg 1          → D0 (GPIO 16)
 *     Button Leg 2          → GND
 *     10kΩ Pull-Up Resistor → between D0 and 3.3V (required!)
 *
 *  4. TEMPERATURE SENSOR (DS18B20) - OMITTED / DISABLED FOR NOW:
 *     Set #define ENABLE_TEMPERATURE true when connecting:
 *     DS18B20 VCC           → 3V3
 *     DS18B20 GND           → GND
 *     DS18B20 DATA          → D8 (GPIO 15) [+ 4.7kΩ pull-up to 3V3]
 *
 *  LIBRARIES — install from Arduino Library Manager:
 *    LiquidCrystal_I2C   (Frank de Brabander)
 *    MFRC522             (GithubCommunity)
 *    ArduinoJson         (Benoit Blanchon) v6 or v7
 *    (Optional) OneWire & DallasTemperature (only if temp enabled)
 * ===================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

// =========================================================
//  ⚙️  CONFIGURATION — CHANGE THESE
// =========================================================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* SUPABASE_HOST     = "gvwdrbrepbpmhjckdcyq.supabase.co";
const char* SUPABASE_ANON_KEY = "sb_publishable_uPsHJqLyu5jZwpoK0GvoPw_TQUtty3D";

const char* STORAGE_CODE = "ST001";
const char* DEVICE_ID    = "BLOOD-BANK-ESP8266";

// Temperature sensor feature flag: set to true when DS18B20 is plugged in, false to disable
#define ENABLE_TEMPERATURE false

// LCD I2C address — try 0x27 first, if blank try 0x3F
#define LCD_ADDRESS 0x27
#define LCD_COLS    16
#define LCD_ROWS    2

// =========================================================
//  📌  PIN DEFINITIONS
// =========================================================
#define BUTTON_PIN   16   // D0 — Emergency Button (needs external 10kΩ pull-up to 3.3V)
#define ONE_WIRE_BUS 15   // D8 — DS18B20 Data

#define RFID_SDA_PIN  2   // D4 — RC522 SDA/SS
#define RFID_RST_PIN  0   // D3 — RC522 RST

// =========================================================
//  TIMING
// =========================================================
const unsigned long DEBOUNCE_MS      = 300;
const unsigned long TEMP_INTERVAL_MS = 15000;   // read temp every 15 s
const unsigned long HEARTBEAT_MS     = 60000;   // device heartbeat every 60 s
const unsigned long ALERT_DISPLAY_MS = 8000;    // show emergency message on LCD for 8 s
const unsigned long RFID_DISPLAY_MS  = 3000;    // show RFID scan on LCD for 3 s

// =========================================================
//  OBJECTS
// =========================================================
LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLS, LCD_ROWS);
OneWire           oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);
MFRC522           rfid(RFID_SDA_PIN, RFID_RST_PIN);
WiFiClientSecure  wifiClient;

// =========================================================
//  STATE
// =========================================================
String storageUnitId = "";
String lastRFIDTag   = "";

unsigned long lastButtonTime     = 0;
unsigned long lastTempTime       = 0;
unsigned long lastHeartbeat      = 0;
unsigned long lastRFIDTime       = 0;
unsigned long emergencyShownAt   = 0;   // when emergency was last shown on LCD
unsigned long rfidShownAt        = 0;   // when RFID scan was shown on LCD

bool emergencyOnScreen = false;
bool rfidOnScreen      = false;
float lastKnownTemp    = 0.0;

// LCD custom characters
byte bellChar[8] = {0x04,0x0E,0x0E,0x0E,0x1F,0x00,0x04,0x00};
byte tempChar[8] = {0x04,0x0A,0x0A,0x0E,0x0E,0x1F,0x0E,0x00};

// =========================================================
//  SETUP
// =========================================================
void setup() {
  Serial.begin(115200);
  delay(800);

  Serial.println(F("\n============================================="));
  Serial.println(F("  BloodFlow IoT — ESP8266 + LCD 16x2 v3.0  "));
  Serial.println(F("============================================="));

  // D0 (GPIO 16) does NOT support INPUT_PULLUP — use INPUT + external 10kΩ pull-up
  pinMode(BUTTON_PIN, INPUT);

  // LCD Init (uses D1/D2 for I2C automatically)
  Wire.begin(4, 5);  // SDA=D2(GPIO4), SCL=D1(GPIO5)
  lcd.init();
  lcd.backlight();
  lcd.createChar(0, bellChar);
  lcd.createChar(1, tempChar);

  lcdShow("BloodFlow IoT", "Starting up...");

#if ENABLE_TEMPERATURE
  // DS18B20 on D8
  tempSensor.begin();
  int ds = tempSensor.getDeviceCount();
  Serial.printf("DS18B20 found: %d sensor(s) on D8\n", ds);
#else
  Serial.println(F("Temperature sensor disabled (RFID & Emergency active)"));
#endif

  // RC522 RFID
  SPI.begin();
  rfid.PCD_Init();
  delay(50);

  // SSL
  wifiClient.setInsecure();

  // Wi-Fi
  lcdShow("Connecting WiFi", WIFI_SSID);
  Serial.print(F("Connecting to "));
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print('.');
  }
  Serial.println();
  Serial.print(F("Connected! IP: "));
  Serial.println(WiFi.localIP());

  lcdShow("WiFi Connected!", WiFi.localIP().toString().c_str());
  delay(1500);

  // Resolve ST001 UUID
  for (int i = 0; i < 3 && storageUnitId.isEmpty(); i++) {
    if (i > 0) { delay(2000); }
    fetchStorageUnitId();
  }

  // Initial heartbeat
  sendHeartbeat(0.0);

  lcdShowReady(0.0);
  Serial.println(F("\n✓ All systems ready!\n"));
}

// =========================================================
//  MAIN LOOP
// =========================================================
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("Wi-Fi lost, reconnecting..."));
    lcdShow("WiFi Lost!", "Reconnecting...");
    WiFi.reconnect();
    delay(3000);
    return;
  }

  // ── EMERGENCY BUTTON (D0) ──────────────────────────────
  // D0 has external 10kΩ pull-up → idle=HIGH, pressed=LOW
  if (digitalRead(BUTTON_PIN) == LOW &&
      (millis() - lastButtonTime) > DEBOUNCE_MS) {
    lastButtonTime = millis();

    Serial.println(F("\n!!! EMERGENCY BUTTON PRESSED !!!"));
    lcdShowEmergency();   // Show alert on LCD immediately

    bool ok = sendFireEmergency();

    if (ok) {
      Serial.println(F("[EMERGENCY ✓] Fire alert dispatched!"));
    } else {
      Serial.println(F("[EMERGENCY ✗] Failed to dispatch!"));
      lcd.setCursor(0, 1);
      lcd.print("Send FAILED!    ");
    }

    delay(3000);  // hardware cooldown after press
  }

  // ── RESTORE LCD AFTER EMERGENCY MESSAGE TIMEOUT ────────
  if (emergencyOnScreen &&
      (millis() - emergencyShownAt) > ALERT_DISPLAY_MS) {
    emergencyOnScreen = false;
    lcdShowReady(lastKnownTemp);
  }

#if ENABLE_TEMPERATURE
  // ── DS18B20 TEMPERATURE (D8) ───────────────────────────
  if (millis() - lastTempTime > TEMP_INTERVAL_MS) {
    lastTempTime = millis();
    readAndPostTemperature();
  }
#endif

  // ── RC522 RFID ─────────────────────────────────────────
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    String uid = getTagUID();

    if (uid != lastRFIDTag || (millis() - lastRFIDTime) > 3000) {
      lastRFIDTag  = uid;
      lastRFIDTime = millis();

      Serial.print(F("\n[RFID] Tag UID: "));
      Serial.println(uid);

      // Show scan on LCD (unless emergency is showing)
      if (!emergencyOnScreen) {
        lcdShowRFID(uid);
      }

      bool ok = postRFIDEvent(uid);
      if (ok) {
        Serial.println(F("[RFID ✓] Logged to Supabase!"));
        // Second row confirmation
        if (!emergencyOnScreen) {
          lcd.setCursor(0, 1);
          lcd.print("Saved!          ");
        }
      } else {
        Serial.println(F("[RFID ✗] Failed to log."));
        if (!emergencyOnScreen) {
          lcd.setCursor(0, 1);
          lcd.print("FAILED! HTTP err");
        }
      }
    }

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  }

  // ── RESTORE LCD AFTER RFID DISPLAY ─────────────────────
  if (rfidOnScreen && !emergencyOnScreen &&
      (millis() - rfidShownAt) > RFID_DISPLAY_MS) {
    rfidOnScreen = false;
    lcdShowReady(lastKnownTemp);
  }

  // ── HEARTBEAT ──────────────────────────────────────────
  if (millis() - lastHeartbeat > HEARTBEAT_MS) {
    lastHeartbeat = millis();
    float t = 0.0;
#if ENABLE_TEMPERATURE
    tempSensor.requestTemperatures();
    float reading = tempSensor.getTempCByIndex(0);
    if (reading != DEVICE_DISCONNECTED_C && reading != -127.0f) {
      t = reading;
    }
#endif
    sendHeartbeat(t);
  }
}

// =========================================================
//  LCD DISPLAY HELPERS
// =========================================================

// Generic 2-line message
void lcdShow(const char* line1, const char* line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}

// Normal idle screen — shows ready / RFID prompt
void lcdShowReady(float tempC) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("BloodFlow  Ready");
  lcd.setCursor(0, 1);
#if ENABLE_TEMPERATURE
  lcd.write(1);  // thermometer icon
  lcd.print(" Temp: ");
  if (tempC <= 0.0) {
    lcd.print("-- °C   ");
  } else {
    lcd.print(tempC, 1);
    lcd.print(" \xDF""C   ");  // °C
  }
#else
  lcd.print("Scan RFID Tag...");
#endif
}

// 🚨 EMERGENCY ALERT — full screen flashing message
void lcdShowEmergency() {
  emergencyOnScreen = true;
  emergencyShownAt  = millis();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.write(0);           // bell icon
  lcd.print(" EMERGENCY! ");
  lcd.write(0);           // bell icon
  lcd.setCursor(0, 1);
  lcd.print(" FIRE ALERT!    ");

  // Flash 3 times so it's noticeable
  for (int i = 0; i < 3; i++) {
    lcd.noBacklight();
    delay(200);
    lcd.backlight();
    delay(200);
  }
}

// Show RFID scan result
void lcdShowRFID(const String& uid) {
  rfidOnScreen = true;
  rfidShownAt  = millis();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("RFID Scanned:");
  lcd.setCursor(0, 1);
  // Show first 16 chars of UID (UID is usually 8 hex chars = fine)
  lcd.print(uid.substring(0, 16));
}

// =========================================================
//  DS18B20 — Read temp, post to Supabase, update LCD
// =========================================================
void readAndPostTemperature() {
  tempSensor.requestTemperatures();
  float tempC = tempSensor.getTempCByIndex(0);

  if (tempC == DEVICE_DISCONNECTED_C || tempC == -127.0f) {
    Serial.println(F("[DS18B20] ✗ Sensor disconnected! Check D8 wiring + 4.7k resistor."));
    if (!emergencyOnScreen && !rfidOnScreen) {
      lcdShow("DS18B20 Error!", "Check D8 wiring");
    }
    return;
  }

  lastKnownTemp = tempC;

  const char* status =
    (tempC < 2.0 || tempC > 6.0) ? "critical" :
    (tempC < 3.0 || tempC > 5.5) ? "warning"  : "normal";

  Serial.printf("[DS18B20] Temp = %.2f °C  (%s)\n", tempC, status);

  // Update idle LCD with latest temperature (only if nothing else showing)
  if (!emergencyOnScreen && !rfidOnScreen) {
    lcdShowReady(tempC);
  }

  // Warn if out of safe range
  if (strcmp(status, "critical") == 0) {
    if (!emergencyOnScreen) {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("TEMP WARNING!   ");
      lcd.setCursor(0, 1);
      lcd.print(tempC, 1);
      lcd.print("\xDF""C OUT RANGE!");
      // Flash backlight as warning
      for (int i = 0; i < 2; i++) {
        lcd.noBacklight(); delay(300);
        lcd.backlight();   delay(300);
      }
    }
    postAlert("TEMPERATURE_CRITICAL", "critical",
              String("Cold storage out of range: ") + tempC + "C (safe: 2-6C)");
  }

  // A. Insert temperature reading
  StaticJsonDocument<256> doc;
  doc["device_id"]   = DEVICE_ID;
  doc["temperature"] = tempC;
  doc["status"]      = status;
  if (!storageUnitId.isEmpty()) doc["storage_unit_id"] = storageUnitId;
  String body; serializeJson(doc, body);

  int code = restPost("/rest/v1/temperature_readings", body);
  if (code == 201 || code == 200)
    Serial.printf("[DB ✓] Temp %.2f °C logged\n", tempC);
  else
    Serial.printf("[DB ✗] Temp insert failed, HTTP %d\n", code);

  // B. PATCH storage_units.current_temperature (updates dashboard card live)
  HTTPClient http;
  String url = String("https://") + SUPABASE_HOST +
               "/rest/v1/storage_units?storage_code=eq." + STORAGE_CODE;
  if (http.begin(wifiClient, url)) {
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey",        SUPABASE_ANON_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
    http.addHeader("Prefer",        "return=minimal");
    StaticJsonDocument<128> pdoc;
    pdoc["current_temperature"] = tempC;
    pdoc["status"]              = status;
    String pb; serializeJson(pdoc, pb);
    int pc = http.PATCH(pb);
    if (pc == 204 || pc == 200)
      Serial.printf("[DB ✓] storage_units %s → %.2f °C (%s)\n", STORAGE_CODE, tempC, status);
    else
      Serial.printf("[DB ✗] PATCH failed, HTTP %d\n", pc);
    http.end();
  }
}

// =========================================================
//  RFID — Log scan to Supabase rfid_events
// =========================================================
bool postRFIDEvent(const String& uid) {
  StaticJsonDocument<256> doc;
  doc["rfid_uid"] = uid;
  doc["action"]   = "ENTERED";
  doc["result"]   = "SUCCESS";
  if (!storageUnitId.isEmpty()) doc["storage_unit_id"] = storageUnitId;
  String body; serializeJson(doc, body);
  Serial.println("RFID POST: " + body);

  int code = restPost("/rest/v1/rfid_events", body);
  Serial.printf("[RFID HTTP] %d\n", code);
  return (code == 201 || code == 200);
}

// =========================================================
//  FIRE EMERGENCY — call Supabase Edge Function
// =========================================================
bool sendFireEmergency() {
  HTTPClient http;
  String url = String("https://") + SUPABASE_HOST +
               "/functions/v1/emergency-call?action=fire_emergency";
  if (!http.begin(wifiClient, url)) return false;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);

  StaticJsonDocument<256> doc;
  doc["device_id"]      = DEVICE_ID;
  doc["source"]         = "hardware_button";
  doc["emergency_type"] = "FIRE";
  doc["message"]        = "Fire emergency button activated at Blood Bank Unit 01";
  String body; serializeJson(doc, body);

  int code = http.POST(body);
  Serial.printf("[EMERGENCY] HTTP %d\n", code);
  if (code > 0) Serial.println(http.getString());
  http.end();
  return (code == 200 || code == 201);
}

// =========================================================
//  ALERT — log to iot_alerts table
// =========================================================
void postAlert(const char* alertType, const char* severity, const String& msg) {
  StaticJsonDocument<256> doc;
  doc["device_id"]  = DEVICE_ID;
  doc["alert_type"] = alertType;
  doc["severity"]   = severity;
  doc["message"]    = msg;
  if (!storageUnitId.isEmpty()) doc["storage_unit_id"] = storageUnitId;
  String body; serializeJson(doc, body);
  restPost("/rest/v1/iot_alerts", body);
}

// =========================================================
//  HEARTBEAT — upsert into iot_devices
// =========================================================
void sendHeartbeat(float tempC) {
  HTTPClient http;
  String url = String("https://") + SUPABASE_HOST + "/rest/v1/iot_devices";
  if (!http.begin(wifiClient, url)) return;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey",        SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Prefer", "resolution=merge-duplicates,return=minimal");

  StaticJsonDocument<256> doc;
  doc["device_id"]       = DEVICE_ID;
  doc["status"]          = "online";
  doc["wifi_status"]     = "connected";
  doc["device_type"]     = "ESP8266_DS18B20_RC522_LCD";
  doc["firmware_version"]= "v3.0.0";
  doc["ip_address"]      = WiFi.localIP().toString();
  if (tempC > 0) doc["last_temperature"] = tempC;
  if (!storageUnitId.isEmpty()) doc["storage_unit_id"] = storageUnitId;
  String body; serializeJson(doc, body);

  int code = http.POST(body);
  if (code == 200 || code == 201)
    Serial.println(F("[HEARTBEAT ✓]"));
  else
    Serial.printf("[HEARTBEAT ✗] HTTP %d\n", code);
  http.end();
}

// =========================================================
//  FETCH storage_units UUID for STORAGE_CODE
// =========================================================
void fetchStorageUnitId() {
  HTTPClient http;
  String url = String("https://") + SUPABASE_HOST +
               "/rest/v1/storage_units?storage_code=eq." +
               STORAGE_CODE + "&select=id&limit=1";
  if (!http.begin(wifiClient, url)) return;
  http.addHeader("apikey",        SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  int code = http.GET();
  Serial.printf("[UUID] HTTP %d\n", code);
  if (code == 200) {
    String body = http.getString();
    StaticJsonDocument<256> doc;
    if (!deserializeJson(doc, body) &&
        doc.is<JsonArray>() && doc.as<JsonArray>().size() > 0) {
      storageUnitId = doc[0]["id"].as<String>();
      Serial.println("✓ UUID = " + storageUnitId);
    }
  }
  http.end();
}

// =========================================================
//  REST POST helper
// =========================================================
int restPost(const String& path, const String& jsonBody) {
  HTTPClient http;
  String url = String("https://") + SUPABASE_HOST + path;
  if (!http.begin(wifiClient, url)) return -1;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey",        SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Prefer",        "return=minimal");
  int code = http.POST(jsonBody);
  http.end();
  return code;
}

// =========================================================
//  RC522 UID → uppercase hex string (e.g. "A3F2B1C0")
// =========================================================
String getTagUID() {
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}
   