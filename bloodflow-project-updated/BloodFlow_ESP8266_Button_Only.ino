/*
 * ===================================================================
 *  BloodFlow Smart IoT — Push Button ONLY (Emergency Fire Alert)
 *  Device: NodeMCU ESP8266
 *
 *  SUPER SIMPLE 2-WIRE CONNECTION (NO EXTERNAL RESISTOR NEEDED!):
 *  -------------------------------------------------------------
 *  Button Leg 1  →  D2 (GPIO 4)
 *  Button Leg 2  →  GND
 *
 *  (Uses ESP8266 internal INPUT_PULLUP: Idle = HIGH, Pressed = LOW)
 *
 *  LIBRARIES NEEDED:
 *  - ESP8266WiFi & ESP8266HTTPClient (Built into ESP8266 Board package)
 *  - ArduinoJson (Install from Arduino Library Manager)
 * ===================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// =========================================================
//  ⚙️  PUT YOUR WIFI NAME & PASSWORD HERE:
// =========================================================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Supabase Configuration (Already Pre-filled)
const char* SUPABASE_HOST     = "gvwdrbrepbpmhjckdcyq.supabase.co";
const char* SUPABASE_ANON_KEY = "sb_publishable_uPsHJqLyu5jZwpoK0GvoPw_TQUtty3D";
const char* DEVICE_ID         = "BLOOD-BANK-ESP8266";

// Button Pin — D2 (GPIO 4) has built-in pull-up (no resistor required!)
#define BUTTON_PIN   4    // NodeMCU pin D2
#define ONBOARD_LED  2    // D4 blue LED for visual confirmation

const unsigned long DEBOUNCE_MS = 400;
unsigned long lastPressTime = 0;

WiFiClientSecure wifiClient;

bool triggerEmergencyCall() {
  Serial.println(F("\n🚨 >>> DISPATCHING EMERGENCY CALL TO TWILIO <<<"));
  
  // Blink LED rapidly
  for (int i = 0; i < 4; i++) {
    digitalWrite(ONBOARD_LED, LOW);  // LED ON
    delay(80);
    digitalWrite(ONBOARD_LED, HIGH); // LED OFF
    delay(80);
  }

  HTTPClient http;
  String url = String("https://") + SUPABASE_HOST +
               "/functions/v1/emergency-call?action=fire_emergency";

  if (!http.begin(wifiClient, url)) {
    Serial.println(F("[ERROR] Failed to initialize HTTPS connection!"));
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);

  StaticJsonDocument<256> doc;
  doc["device_id"]      = DEVICE_ID;
  doc["source"]         = "hardware_button";
  doc["emergency_type"] = "FIRE";
  doc["message"]        = "Fire emergency push button pressed at Blood Bank!";
  String body;
  serializeJson(doc, body);

  Serial.println("Payload: " + body);
  int httpCode = http.POST(body);

  Serial.printf("[HTTP Response] Code: %d\n", httpCode);
  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Response: " + response);
  } else {
    Serial.printf("[HTTP Error] %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
  return (httpCode == 200 || httpCode == 201);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println(F("\n=============================================="));
  Serial.println(F("  BloodFlow — Emergency Button Only System    "));
  Serial.println(F("=============================================="));

  pinMode(ONBOARD_LED, OUTPUT);
  digitalWrite(ONBOARD_LED, HIGH); // LED OFF (active LOW on NodeMCU)

  // Use internal pull-up resistor: Idle = HIGH, Pressed = LOW
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  // SSL (ignore cert for simplicity)
  wifiClient.setInsecure();

  // Connect to Wi-Fi
  Serial.print(F("Connecting to Wi-Fi: "));
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(400);
    Serial.print('.');
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(F("✓ Connected! IP Address: "));
    Serial.println(WiFi.localIP());
    // Solid LED blink twice to confirm ready
    digitalWrite(ONBOARD_LED, LOW);
    delay(300);
    digitalWrite(ONBOARD_LED, HIGH);
  } else {
    Serial.println(F("⚠️ Wi-Fi not connected! Check SSID and Password."));
  }

  Serial.println(F("\n>>> READY! Press button on pin D2 anytime! <<<\n"));
}

void loop() {
  // Reconnect Wi-Fi in background if disconnected
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastCheck = 0;
    if (millis() - lastCheck > 10000) {
      lastCheck = millis();
      Serial.println(F("Reconnecting to Wi-Fi..."));
      WiFi.reconnect();
    }
  }

  // Check if button pressed (LOW when pressed with INPUT_PULLUP)
  if (digitalRead(BUTTON_PIN) == LOW && (millis() - lastPressTime > DEBOUNCE_MS)) {
    lastPressTime = millis();

    Serial.println(F("\n🔘 BUTTON PRESSED DETECTED!"));
    
    if (WiFi.status() == WL_CONNECTED) {
      bool success = triggerEmergencyCall();
      if (success) {
        Serial.println(F("✓ SUCCESS: Emergency call dispatched to phone!"));
      } else {
        Serial.println(F("✗ FAILED to dispatch emergency call. Check logs above."));
      }
    } else {
      Serial.println(F("⚠️ Cannot dispatch: Wi-Fi is currently offline."));
    }

    // Cooldown pause so one press doesn't double-trigger
    delay(3000);
    Serial.println(F("Ready for next press...\n"));
  }
}
