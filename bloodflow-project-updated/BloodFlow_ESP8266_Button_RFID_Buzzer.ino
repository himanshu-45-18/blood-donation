/*
 * ===================================================================
 *  BloodFlow Smart IoT — Push Button + RC522 RFID + Warning Buzzer
 *  Device: NodeMCU ESP8266
 *
 *  COMPLETE WIRING DIAGRAM:
 *  -------------------------------------------------------------
 *  1. EMERGENCY PUSH BUTTON:
 *     Button Leg 1          → D2 (GPIO 4)   [Internal Pull-Up: no resistor needed!]
 *     Button Leg 2          → GND
 *
 *  2. WARNING BUZZER:
 *     Buzzer Positive (+)   → D1 (GPIO 5)
 *     Buzzer Negative (-)   → GND
 *
 *  3. RC522 RFID READER (SPI):
 *     RC522 VCC             → 3V3   (⚠️ 3.3V ONLY — NEVER CONNECT TO 5V!)
 *     RC522 GND             → GND
 *     RC522 RST             → 3V3   (Tied to 3.3V to prevent bootloader hang)
 *     RC522 SDA (SS)        → D4 (GPIO 2)
 *     RC522 SCK             → D5 (GPIO 14)
 *     RC522 MISO            → D6 (GPIO 12)
 *     RC522 MOSI            → D7 (GPIO 13)
 *
 *  LIBRARIES NEEDED (Install in Arduino Library Manager):
 *  - MFRC522 by GithubCommunity
 *  - ArduinoJson by Benoit Blanchon (v6 or v7)
 * ===================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

// =========================================================
//  ⚙️  CONFIGURATION — PUT YOUR WIFI CREDENTIALS HERE
// =========================================================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Supabase Configuration
const char* SUPABASE_HOST     = "gvwdrbrepbpmhjckdcyq.supabase.co";
const char* SUPABASE_ANON_KEY = "sb_publishable_uPsHJqLyu5jZwpoK0GvoPw_TQUtty3D";
const char* STORAGE_CODE      = "ST001";
const char* DEVICE_ID         = "BLOOD-BANK-ESP8266";

// =========================================================
//  📌  PIN DEFINITIONS
// =========================================================
#define BUTTON_PIN    4   // D2 — Emergency Button (INPUT_PULLUP)
#define BUZZER_PIN    5   // D1 — Warning Buzzer (+)
#define ONBOARD_LED   2   // D4 — Onboard blue LED

#define RFID_SS_PIN   2   // D4 (GPIO 2) — RC522 SDA/SS
#define RFID_RST_PIN  255 // Unused / Tied to 3.3V (255 = dummy pin)

// =========================================================
//  OBJECTS & TIMING
// =========================================================
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
WiFiClientSecure wifiClient;

const unsigned long DEBOUNCE_MS  = 400;
const unsigned long HEARTBEAT_MS = 60000;

unsigned long lastButtonTime = 0;
unsigned long lastRFIDTime   = 0;
unsigned long lastHeartbeat  = 0;

String storageUnitId = "";
String lastRFIDTag   = "";

// =========================================================
//  🔊 BUZZER PATTERNS
// =========================================================
// Quick beep on successful RFID scan
void beepRFID() {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(120);
  digitalWrite(BUZZER_PIN, LOW);
}

// Loud urgent siren alarm for emergency button
void beepEmergencyAlarm() {
  for (int i = 0; i < 5; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(ONBOARD_LED, LOW);  // LED ON
    delay(150);
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(ONBOARD_LED, HIGH); // LED OFF
    delay(100);
  }
}

// Short double beep when ready
void beepReady() {
  digitalWrite(BUZZER_PIN, HIGH); delay(80);
  digitalWrite(BUZZER_PIN, LOW);  delay(60);
  digitalWrite(BUZZER_PIN, HIGH); delay(80);
  digitalWrite(BUZZER_PIN, LOW);
}

// =========================================================
//  🌐 SUPABASE API CALLS
// =========================================================

// 1. Dispatch Emergency Voice Call
bool triggerEmergencyCall() {
  Serial.println(F("\n🚨 >>> DISPATCHING EMERGENCY FIRE CALL TO TWILIO <<<"));
  
  // Sound alarm immediately
  beepEmergencyAlarm();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[ERROR] Wi-Fi offline — cannot dispatch Twilio call."));
    return false;
  }

  HTTPClient http;
  String url = String("https://") + SUPABASE_HOST +
               "/functions/v1/emergency-call?action=fire_emergency";

  if (!http.begin(wifiClient, url)) {
    Serial.println(F("[ERROR] HTTPS setup failed!"));
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);

  StaticJsonDocument<256> doc;
  doc["device_id"]      = DEVICE_ID;
  doc["source"]         = "hardware_button";
  doc["emergency_type"] = "FIRE";
  doc["message"]        = "Fire emergency push button activated at Blood Bank!";
  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);
  Serial.printf("[EMERGENCY HTTP] Code: %d\n", httpCode);

  if (httpCode > 0) {
    Serial.println("Response: " + http.getString());
  }
  http.end();
  return (httpCode == 200 || httpCode == 201);
}

// 2. Post RFID Scan to Supabase
bool postRFIDEvent(const String& uid) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[RFID] Wi-Fi offline — scanned locally only."));
    return false;
  }

  HTTPClient http;
  String url = String("https://") + SUPABASE_HOST + "/rest/v1/rfid_events";

  if (!http.begin(wifiClient, url)) return false;

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Prefer", "return=minimal");

  StaticJsonDocument<256> doc;
  doc["rfid_uid"] = uid;
  doc["action"]   = "ENTERED";
  doc["result"]   = "SUCCESS";
  if (!storageUnitId.isEmpty()) doc["storage_unit_id"] = storageUnitId;
  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);
  Serial.printf("[RFID HTTP] Code: %d\n", httpCode);
  http.end();
  return (httpCode == 201 || httpCode == 200);
}

// 3. Resolve ST001 Storage Unit UUID
void fetchStorageUnitId() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  String url = String("https://") + SUPABASE_HOST +
               "/rest/v1/storage_units?storage_code=eq." + STORAGE_CODE + "&select=id&limit=1";
  if (!http.begin(wifiClient, url)) return;
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  int httpCode = http.GET();
  if (httpCode == 200) {
    String body = http.getString();
    StaticJsonDocument<256> doc;
    if (!deserializeJson(doc, body) && doc.is<JsonArray>() && doc.as<JsonArray>().size() > 0) {
      storageUnitId = doc[0]["id"].as<String>();
      Serial.println("✓ Storage UUID = " + storageUnitId);
    }
  }
  http.end();
}

// 4. Send Periodic Online Heartbeat
void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  String url = String("https://") + SUPABASE_HOST + "/rest/v1/iot_devices";
  if (!http.begin(wifiClient, url)) return;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Prefer", "resolution=merge-duplicates,return=minimal");

  StaticJsonDocument<256> doc;
  doc["device_id"]        = DEVICE_ID;
  doc["status"]           = "online";
  doc["wifi_status"]      = "connected";
  doc["device_type"]      = "ESP8266_RC522_BUZZER_BUTTON";
  doc["firmware_version"] = "v3.1.0";
  doc["ip_address"]       = WiFi.localIP().toString();
  if (!storageUnitId.isEmpty()) doc["storage_unit_id"] = storageUnitId;
  String body;
  serializeJson(doc, body);

  http.POST(body);
  http.end();
}

// Helper: Read RFID UID as uppercase Hex String
String getTagUID() {
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

// =========================================================
//  SETUP
// =========================================================
void setup() {
  Serial.begin(115200);
  delay(600);

  Serial.println(F("\n=============================================="));
  Serial.println(F("  BloodFlow — Button + RFID + Buzzer System   "));
  Serial.println(F("=============================================="));

  // Initialize Buzzer & LED
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW); // Buzzer OFF

  pinMode(ONBOARD_LED, OUTPUT);
  digitalWrite(ONBOARD_LED, HIGH); // LED OFF

  // Initialize Emergency Button (Internal pull-up)
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  // Initialize RC522 RFID
  SPI.begin();
  rfid.PCD_Init();
  delay(50);
  Serial.println(F("✓ RC522 RFID Reader initialized."));

  // SSL (ignore cert)
  wifiClient.setInsecure();

  // Connect to Wi-Fi
  Serial.print(F("Connecting to Wi-Fi: "));
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(400);
    Serial.print('.');
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(F("✓ Wi-Fi Connected! IP: "));
    Serial.println(WiFi.localIP());
    fetchStorageUnitId();
    sendHeartbeat();
    beepReady(); // Beep twice to signal ready
  } else {
    Serial.println(F("⚠️ Wi-Fi timed out — running in offline test mode."));
  }

  Serial.println(F("\n>>> SYSTEM READY:"));
  Serial.println(F("  • Tap RFID card to scan"));
  Serial.println(F("  • Press button on D2 for Emergency Fire Alert\n"));
}

// =========================================================
//  MAIN LOOP
// =========================================================
void loop() {
  // 1. Wi-Fi Background Reconnection
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastCheck = 0;
    if (millis() - lastCheck > 15000) {
      lastCheck = millis();
      Serial.println(F("Reconnecting to Wi-Fi..."));
      WiFi.reconnect();
    }
  }

  // 2. CHECK EMERGENCY PUSH BUTTON (D2)
  if (digitalRead(BUTTON_PIN) == LOW && (millis() - lastButtonTime > DEBOUNCE_MS)) {
    lastButtonTime = millis();

    Serial.println(F("\n🚨 [ALARM] EMERGENCY BUTTON PRESSED!"));
    bool ok = triggerEmergencyCall();

    if (ok) {
      Serial.println(F("✓ [EMERGENCY] Automated Call Dispatched Successfully!"));
    } else {
      Serial.println(F("✗ [EMERGENCY] Dispatch failed or Wi-Fi offline."));
    }

    delay(3000); // Cooldown to prevent spam
    Serial.println(F("System reset to normal.\n"));
  }

  // 3. CHECK RC522 RFID SCAN
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    String uid = getTagUID();

    if (uid != lastRFIDTag || (millis() - lastRFIDTime > 3000)) {
      lastRFIDTag  = uid;
      lastRFIDTime = millis();

      Serial.print(F("\n🏷️ [RFID DETECTED] UID: "));
      Serial.println(uid);

      // Sound quick confirmation beep
      beepRFID();

      bool ok = postRFIDEvent(uid);
      if (ok) {
        Serial.println(F("✓ [RFID] Successfully logged to Supabase!"));
      } else {
        Serial.println(F("✗ [RFID] Failed to send to cloud (Wi-Fi or network issue)."));
      }
    }

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  }

  // 4. PERIODIC HEARTBEAT
  if (millis() - lastHeartbeat > HEARTBEAT_MS) {
    lastHeartbeat = millis();
    sendHeartbeat();
  }
}
