import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function escapeXml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

/* =========================================================
   PHONE NUMBER NORMALIZATION
========================================================= */

function normalizeFromPhoneNumber(value: unknown): string | null {
  const raw = String(value ?? "").trim();

  if (!raw) return null;

  if (raw.startsWith("+")) {
    return `+${raw.replace(/\D/g, "")}`;
  }

  const digits = raw.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  return `+${digits}`;
}

function normalizePhoneNumber(value: unknown): string | null {
  const raw = String(value ?? "").trim();

  if (!raw) return null;

  const digits = raw.replace(/[\s().-]/g, "");

  const defaultCountryCode = (
    Deno.env.get("TWILIO_DEFAULT_COUNTRY_CODE") || "91"
  ).replace(/\D/g, "");

  const e164 = digits.startsWith("+")
    ? `+${digits.slice(1).replace(/\D/g, "")}`
    : digits.startsWith("00")
      ? `+${digits.slice(2).replace(/\D/g, "")}`
      : `+${defaultCountryCode}${digits.replace(/\D/g, "")}`;

  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

/* =========================================================
   NEW:
   GET TWILIO FROM NUMBER FOR SPECIFIC RECIPIENT
========================================================= */

function getTwilioFromForRecipient(
  recipientPhone: string,
): string | null {
  const normalizedRecipient =
    normalizePhoneNumber(recipientPhone);

  if (!normalizedRecipient) {
    return null;
  }

  /*
    Check:

    TWILIO_TO_1  -> TWILIO_FROM_1
    TWILIO_TO_2  -> TWILIO_FROM_2
    TWILIO_TO_3  -> TWILIO_FROM_3
    TWILIO_TO_4  -> TWILIO_FROM_4
    TWILIO_TO_5  -> TWILIO_FROM_5
  */

  for (let i = 1; i <= 5; i++) {
    const configuredTo = normalizePhoneNumber(
      Deno.env.get(`TWILIO_TO_${i}`),
    );

    const configuredFrom = normalizeFromPhoneNumber(
      Deno.env.get(`TWILIO_FROM_${i}`),
    );

    if (
      configuredTo &&
      configuredFrom &&
      configuredTo === normalizedRecipient
    ) {
      return configuredFrom;
    }
  }

  /*
    Fallback to old single-number configuration.
  */

  return normalizeFromPhoneNumber(
    Deno.env.get("TWILIO_FROM_NUMBER"),
  );
}

/* =========================================================
   TWILIO SIGNATURE VALIDATION
========================================================= */

async function isValidTwilioSignature(
  req: Request,
  authToken: string,
  body: Record<string, string>,
): Promise<boolean> {
  const signature =
    req.headers.get("X-Twilio-Signature");

  if (!signature) return false;

  const data =
    new URL(req.url).toString() +
    Object.keys(body)
      .sort()
      .map((key) => `${key}${body[key]}`)
      .join("");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    {
      name: "HMAC",
      hash: "SHA-1",
    },
    false,
    ["sign"],
  );

  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );

  return (
    signature ===
    btoa(
      String.fromCharCode(
        ...new Uint8Array(digest),
      ),
    )
  );
}

/* =========================================================
   MAKE TWILIO VOICE CALL
========================================================= */

async function makeTwilioCall(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  url: string,
): Promise<{
  ok: boolean;
  sid?: string;
  error?: string;
}> {
  try {
    const params = new URLSearchParams();

    params.append("To", to);
    params.append("From", from);
    params.append("Url", url);

    const baseUrl =
      Deno.env.get("TWILIO_BASE_URL") ||
      "https://api.twilio.com";

    const res = await fetch(
      `${baseUrl}/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            btoa(`${accountSid}:${authToken}`),

          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      return {
        ok: true,
        sid: data.sid,
      };
    }

    return {
      ok: false,
      error:
        `Twilio Error ${data.code || res.status}: ` +
        `${data.message || data.detail || "Call failed"} ` +
        `[From: ${from}, To: ${to}]`,
    };
  } catch (err) {
    return {
      ok: false,
      error: String(err),
    };
  }
}

/* =========================================================
   SEND TWILIO SMS
========================================================= */

async function sendTwilioSms(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string,
): Promise<{
  ok: boolean;
  sid?: string;
  error?: string;
}> {
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            btoa(`${accountSid}:${authToken}`),

          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body: new URLSearchParams({
          From: from,
          To: to,
          Body: body,
        }).toString(),
      },
    );

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      return {
        ok: true,
        sid: data.sid,
      };
    }

    return {
      ok: false,
      error:
        data.message ||
        data.code ||
        "Twilio SMS failed",
    };
  } catch (err) {
    return {
      ok: false,
      error: String(err),
    };
  }
}

/* =========================================================
   BLOOD GROUP - HINDI
========================================================= */

function getHindiBloodGroup(group: string): string {
  const clean =
    String(group || "")
      .toUpperCase()
      .trim();

  const map: Record<string, string> = {
    "A+": "ए पॉजिटिव",
    "A-": "ए नेगेटिव",
    "B+": "बी पॉजिटिव",
    "B-": "बी नेगेटिव",
    "AB+": "एबी पॉजिटिव",
    "AB-": "एबी नेगेटिव",
    "O+": "ओ पॉजिटिव",
    "O-": "ओ नेगेटिव",
  };

  return map[clean] || clean;
}

/* =========================================================
   BLOOD GROUP - MARATHI
========================================================= */

function getMarathiBloodGroup(group: string): string {
  const clean =
    String(group || "")
      .toUpperCase()
      .trim();

  const map: Record<string, string> = {
    "A+": "ए पॉझिटिव्ह",
    "A-": "ए निगेटिव्ह",
    "B+": "बी पॉझिटिव्ह",
    "B-": "बी निगेटिव्ह",
    "AB+": "एबी पॉझिटिव्ह",
    "AB-": "एबी निगेटिव्ह",
    "O+": "ओ पॉझिटिव्ह",
    "O-": "ओ निगेटिव्ह",
  };

  return map[clean] || clean;
}

/* =========================================================
   MAIN SERVER
========================================================= */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);

    const action =
      url.searchParams.get("action");

    const providerParam =
      (
        url.searchParams.get("provider") ||
        ""
      ).toLowerCase();

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const supabaseServiceKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    /* =====================================================
       1. TWILIO / PLIVO ANSWER
    ===================================================== */

    if (
      action === "answer" ||
      action === "test_answer" ||
      (
        providerParam === "plivo" &&
        action === "answer"
      )
    ) {
      const emergencyId =
        url.searchParams.get(
          "emergencyId",
        );

      let englishMsg =
        "Urgent Emergency Alert! This is an automated blood emergency call from AIIMS Hospital. We urgently require 2 units of B Positive blood. Please check your inventory immediately.";

      let hindiMsg =
        "आपातकालीन चेतावनी! यह एआईआईएमएस अस्पताल से एक स्वचालित आपातकालीन कॉल है। हमें बी पॉजिटिव रक्त की दो यूनिटों की तत्काल आवश्यकता है। कृपया तुरंत अपने ब्लड बैंक स्टॉक की जांच करें।";

      let marathiMsg =
        "तातडीची आणीबाणी सूचना! ही एआयआईएमएस रुग्णालयाकडून आलेली स्वयंचलित कॉल आहे. आम्हाला बी पॉझिटिव्ह रक्ताच्या दोन युनिटची तातडीने गरज आहे. कृपया तुमच्या रक्तपेढीचा साठा तपासा आणि त्वरित संपर्क साधा.";

      if (
        emergencyId &&
        supabaseUrl &&
        supabaseServiceKey
      ) {
        try {
          const supabase =
            createClient(
              supabaseUrl,
              supabaseServiceKey,
            );

          const { data: em } =
            await supabase
              .from("emergency_requests")
              .select(
                "*, requesting_hospital:hospitals(*)",
              )
              .eq(
                "id",
                emergencyId,
              )
              .maybeSingle();

          if (em) {
            const hospName =
              em.requesting_hospital?.name ||
              "the requesting hospital";

            const units =
              em.units_needed;

            const bgEn =
              em.blood_group;

            const bgHi =
              getHindiBloodGroup(
                em.blood_group,
              );

            const bgMr =
              getMarathiBloodGroup(
                em.blood_group,
              );

            englishMsg =
              `Urgent Emergency Alert! This is an automated call from ${hospName}. ` +
              `We urgently require ${units} unit${units === 1 ? "" : "s"} of ${bgEn} blood. ` +
              `Please check your blood bank inventory and contact ${hospName} immediately.`;

            hindiMsg =
              `आपातकालीन चेतावनी! यह ${hospName} से एक स्वचालित आपातकालीन कॉल है। ` +
              `हमें ${bgHi} रक्त की ${units} यूनिटों की तत्काल आवश्यकता है। ` +
              `कृपया अपने ब्लड बैंक स्टॉक की जांच करें और तुरंत संपर्क करें।`;

            marathiMsg =
              `तातडीची आणीबाणी सूचना! ही ${hospName} रुग्णालयाकडून आलेली स्वयंचलित कॉल आहे। ` +
              `आम्हाला ${bgMr} रक्ताच्या ${units} युनिटची तातडीने गरज आहे। ` +
              `कृपया तुमच्या रक्तपेढीचा साठा तपासा आणि त्वरित संपर्क साधा।`;
          }
        } catch (_) {}
      }

      const xmlResponse =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<Response>\n` +
        `  <Pause length="1"/>\n` +
        `  <Say voice="Polly.Aditi" language="en-IN">${escapeXml(englishMsg)}</Say>\n` +
        `  <Pause length="1.5"/>\n` +
        `  <Say voice="Polly.Aditi" language="hi-IN">${escapeXml(hindiMsg)}</Say>\n` +
        `  <Pause length="1.5"/>\n` +
        `  <Say voice="Polly.Aditi" language="mr-IN">${escapeXml(marathiMsg)}</Say>\n` +
        `  <Pause length="1"/>\n` +
        `  <Say voice="Polly.Aditi" language="mr-IN">धन्यवाद.</Say>\n` +
        `</Response>`;

      return new Response(
        xmlResponse,
        {
          status: 200,
          headers: {
            "Content-Type":
              "text/xml; charset=utf-8",
          },
        },
      );
    }

    /* =====================================================
       READ PAYLOAD
    ===================================================== */

    const contentType =
      req.headers.get("content-type") ||
      "";

    const payload =
      contentType.includes(
        "application/x-www-form-urlencoded",
      )
        ? Object.fromEntries(
            await req.formData(),
          )
        : await req
            .json()
            .catch(() => ({}));

    /* =====================================================
       2. PLIVO STATUS CALLBACK
    ===================================================== */

    const plivoCallUuid =
      String(
        payload.CallUUID ||
          payload.call_uuid ||
          "",
      );

    if (
      plivoCallUuid &&
      supabaseUrl &&
      supabaseServiceKey
    ) {
      const adminClient =
        createClient(
          supabaseUrl,
          supabaseServiceKey,
        );

      const rawStatus =
        String(
          payload.CallStatus ||
            payload.Status ||
            "",
        ).toLowerCase();

      const plivoStatusMap: Record<
        string,
        string
      > = {
        initiated: "initiated",
        ringing: "ringing",
        "in-progress": "answered",
        completed: "completed",
        busy: "no_answer",
        "no-answer": "no_answer",
        failed: "failed",
        rejected: "failed",
      };

      const normalizedStatus =
        plivoStatusMap[
          rawStatus
        ] || "failed";

      await adminClient
        .from("emergency_calls")
        .update({
          call_status:
            normalizedStatus,

          call_duration:
            payload.Duration
              ? Number(
                  payload.Duration,
                )
              : null,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "call_sid",
          plivoCallUuid,
        );

      return jsonResponse({
        received: true,
        provider: "plivo",
      });
    }

    /* =====================================================
       3. EXOTEL CALLBACK
    ===================================================== */

    const exotelSid =
      String(
        payload.CallSid ||
          payload.Sid ||
          "",
      );

    if (
      providerParam === "exotel" &&
      exotelSid &&
      supabaseUrl &&
      supabaseServiceKey
    ) {
      const adminClient =
        createClient(
          supabaseUrl,
          supabaseServiceKey,
        );

      const rawStatus =
        String(
          payload.Status ||
            payload.CallStatus ||
            "",
        ).toLowerCase();

      const exoMap: Record<
        string,
        string
      > = {
        initiated: "initiated",
        ringing: "ringing",
        "in-progress": "answered",
        completed: "completed",
        busy: "no_answer",
        "no-answer": "no_answer",
        failed: "failed",
      };

      const normalizedStatus =
        exoMap[
          rawStatus
        ] || "failed";

      await adminClient
        .from("emergency_calls")
        .update({
          call_status:
            normalizedStatus,

          call_duration:
            payload.Duration ||
            payload.callDuration
              ? Number(
                  payload.Duration ||
                    payload.callDuration,
                )
              : null,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "call_sid",
          exotelSid,
        );

      return jsonResponse({
        received: true,
        provider: "exotel",
      });
    }

    /* =====================================================
       4. TWILIO STATUS CALLBACK
    ===================================================== */

    const twilioCallSid =
      String(
        payload.callSid ||
          payload.CallSid ||
          "",
      );

    const twilioCallStatus =
      String(
        payload.callStatus ||
          payload.CallStatus ||
          "",
      );

    if (
      twilioCallSid &&
      twilioCallStatus &&
      supabaseUrl &&
      supabaseServiceKey
    ) {
      const authToken =
        Deno.env.get(
          "TWILIO_AUTH_TOKEN",
        );

      const formPayload =
        Object.fromEntries(
          Object.entries(
            payload,
          ).map(
            ([key, value]) => [
              key,
              String(value),
            ],
          ),
        );

      if (
        authToken &&
        !(
          await isValidTwilioSignature(
            req,
            authToken,
            formPayload,
          )
        )
      ) {
        return jsonResponse(
          {
            error:
              "Invalid Twilio signature",
          },
          401,
        );
      }

      const adminClient =
        createClient(
          supabaseUrl,
          supabaseServiceKey,
        );

      const statusMap: Record<
        string,
        string
      > = {
        queued: "calling",
        initiated: "initiated",
        ringing: "ringing",
        "in-progress": "answered",
        completed: "completed",
        busy: "no_answer",
        "no-answer": "no_answer",
        canceled: "failed",
        failed: "failed",
      };

      const normalizedStatus =
        statusMap[
          String(
            twilioCallStatus,
          )
        ] || "failed";

      await adminClient
        .from("emergency_calls")
        .update({
          call_status:
            normalizedStatus,

          call_duration:
            payload.callDuration ||
            payload.CallDuration
              ? Number(
                  payload.callDuration ||
                    payload.CallDuration,
                )
              : null,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "call_sid",
          twilioCallSid,
        );

      return jsonResponse({
        received: true,
        provider: "twilio",
      });
    }

    /* =====================================================
       5. TEST TWILIO
    ===================================================== */

    if (payload.testTwilio) {
      const accountSid =
        Deno.env.get(
          "TWILIO_ACCOUNT_SID",
        );

      const authToken =
        Deno.env.get(
          "TWILIO_AUTH_TOKEN",
        );

      const toNumber =
        normalizePhoneNumber(
          payload.toNumber ||
            Deno.env.get(
              "TWILIO_TEST_TO_NUMBER",
            ),
        );

      /*
        IMPORTANT:
        For the test call we also use
        recipient-specific From mapping.
      */

      const fromNumber =
        toNumber
          ? getTwilioFromForRecipient(
              toNumber,
            )
          : normalizeFromPhoneNumber(
              Deno.env.get(
                "TWILIO_FROM_NUMBER",
              ),
            );

      if (
        !accountSid ||
        !authToken ||
        !fromNumber
      ) {
        return jsonResponse(
          {
            error:
              "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and recipient-specific TWILIO_TO_X / TWILIO_FROM_X secrets.",
          },
          400,
        );
      }

      if (!toNumber) {
        return jsonResponse(
          {
            error:
              "No recipient phone number specified.",
          },
          400,
        );
      }

      const mode =
        String(
          payload.mode ||
            "call",
        ).toLowerCase();

      /* ---------------- SMS ---------------- */

      if (mode === "sms") {
        const result =
          await sendTwilioSms(
            accountSid,
            authToken,
            fromNumber,
            toNumber,
            "🚨 BloodFlow Emergency Alert Test\n\n✅ Connection Successful! Your Twilio integration is active.",
          );

        if (result.ok) {
          return jsonResponse({
            success: true,
            message:
              `Test SMS sent to ${toNumber}!`,
            sid: result.sid,
            from: fromNumber,
            to: toNumber,
          });
        }

        return jsonResponse(
          {
            error:
              result.error ||
              "SMS dispatch failed.",
          },
          400,
        );
      }

      /* ---------------- VOICE ---------------- */

      const testAnswerUrl =
        `${supabaseUrl}/functions/v1/emergency-call?action=test_answer`;

      const result =
        await makeTwilioCall(
          accountSid,
          authToken,
          fromNumber,
          toNumber,
          testAnswerUrl,
        );

      if (result.ok) {
        return jsonResponse({
          success: true,

          message:
            `Test Voice Call placed to ${toNumber}!`,

          sid: result.sid,

          from: fromNumber,

          to: toNumber,
        });
      }

      return jsonResponse(
        {
          error:
            result.error ||
            "Voice call failed.",

          from: fromNumber,

          to: toNumber,
        },
        400,
      );
    }

    /* =====================================================
       6. OUTBOUND EMERGENCY BROADCAST
    ===================================================== */

    const {
      emergencyRequestId,
    } = payload;

    const authorization =
      req.headers.get(
        "Authorization",
      );

    if (!authorization) {
      return jsonResponse(
        {
          error:
            "Authentication required",
        },
        401,
      );
    }

    if (!emergencyRequestId) {
      return jsonResponse(
        {
          error:
            "Missing emergencyRequestId",
        },
        400,
      );
    }

    const anonKey =
      Deno.env.get(
        "SUPABASE_ANON_KEY",
      );

    if (
      !supabaseUrl ||
      !supabaseServiceKey ||
      !anonKey
    ) {
      return jsonResponse(
        {
          error:
            "Supabase function configuration is incomplete",
        },
        500,
      );
    }

    const supabase =
      createClient(
        supabaseUrl,
        supabaseServiceKey,
      );

    const userClient =
      createClient(
        supabaseUrl,
        anonKey,
        {
          global: {
            headers: {
              Authorization:
                authorization,
            },
          },
        },
      );

    const {
      data: userData,
    } =
      await userClient.auth.getUser();

    if (!userData.user) {
      return jsonResponse(
        {
          error:
            "Invalid authentication",
        },
        401,
      );
    }

    /* =====================================================
       GET EMERGENCY
    ===================================================== */

    const {
      data: emergency,
    } = await supabase
      .from(
        "emergency_requests",
      )
      .select(
        "*, requesting_hospital:hospitals(*)",
      )
      .eq(
        "id",
        emergencyRequestId,
      )
      .maybeSingle();

    if (!emergency) {
      return jsonResponse(
        {
          error:
            "Emergency request not found",
        },
        404,
      );
    }

    if (
      emergency.requesting_hospital
        ?.managed_by !==
      userData.user.id
    ) {
      return jsonResponse(
        {
          error:
            "Only the requesting hospital can start these calls",
        },
        403,
      );
    }

    /* =====================================================
       GET CALLS
    ===================================================== */

    const {
      data: calls,
    } = await supabase
      .from(
        "emergency_calls",
      )
      .select("*")
      .eq(
        "emergency_request_id",
        emergencyRequestId,
      );

    if (
      !calls ||
      calls.length === 0
    ) {
      return jsonResponse(
        {
          error:
            "No calls to make",
        },
        400,
      );
    }

    /* =====================================================
       PROVIDER
    ===================================================== */

    const configuredProvider =
      (
        Deno.env.get(
          "CALL_PROVIDER",
        ) ||

        (
          Deno.env.get(
            "TWILIO_ACCOUNT_SID",
          )
            ? "twilio"
            : ""
        ) ||

        (
          Deno.env.get(
            "PLIVO_AUTH_ID",
          )
            ? "plivo"
            : ""
        ) ||

        (
          Deno.env.get(
            "EXOTEL_ACCOUNT_SID",
          )
            ? "exotel"
            : ""
        ) ||

        "demo"
      ).toLowerCase();

    /* =====================================================
       GET HOSPITALS
    ===================================================== */

    const hospitalIds =
      calls.map(
        (c) =>
          c.hospital_id,
      );

    const {
      data: targetHospitals,
    } =
      await supabase
        .from("hospitals")
        .select(
          "id, name, phone",
        )
        .in(
          "id",
          hospitalIds,
        );

    const hospitalsById =
      new Map(
        (
          targetHospitals ||
          []
        ).map(
          (t) => [
            t.id,
            t,
          ],
        ),
      );

    /* =====================================================
       PROCESS ALL CALLS
       Promise.all = PARALLEL CALLS
    ===================================================== */

    const results =
      await Promise.all(
        calls.map(
          async (call) => {
            const targetHospital =
              hospitalsById.get(
                call.hospital_id,
              );

            const recipientPhone =
              normalizePhoneNumber(
                targetHospital?.phone,
              );

            /* ---------------------------------------------
               INVALID PHONE
            --------------------------------------------- */

            if (
              !targetHospital ||
              !recipientPhone
            ) {
              await supabase
                .from(
                  "emergency_calls",
                )
                .update({
                  call_status:
                    "failed",

                  updated_at:
                    new Date().toISOString(),
                })
                .eq(
                  "id",
                  call.id,
                );

              return {
                hospitalId:
                  call.hospital_id,

                status:
                  "failed",

                error:
                  "Missing or invalid phone number",
              };
            }

            /* ---------------------------------------------
               ALREADY CALLING
            --------------------------------------------- */

            if (
              call.call_sid &&
              [
                "calling",
                "initiated",
                "ringing",
                "answered",
              ].includes(
                call.call_status,
              )
            ) {
              return {
                hospitalId:
                  call.hospital_id,

                status:
                  call.call_status,

                callSid:
                  call.call_sid,
              };
            }

            /* ---------------------------------------------
               MARK CALLING
            --------------------------------------------- */

            await supabase
              .from(
                "emergency_calls",
              )
              .update({
                call_status:
                  "calling",

                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                "id",
                call.id,
              );

            /* =================================================
               TWILIO
            ================================================= */

            if (
              configuredProvider ===
              "twilio"
            ) {
              const accountSid =
                Deno.env.get(
                  "TWILIO_ACCOUNT_SID",
                );

              const authToken =
                Deno.env.get(
                  "TWILIO_AUTH_TOKEN",
                );

              /*
                THIS IS THE IMPORTANT FIX.

                Instead of:

                TWILIO_FROM_NUMBER

                we now select:

                recipient -> matching From
              */

              const twilioFrom =
                getTwilioFromForRecipient(
                  recipientPhone,
                );

              console.log(
                `BloodFlow Twilio mapping: TO=${recipientPhone} FROM=${twilioFrom}`,
              );

              if (
                !accountSid ||
                !authToken ||
                !twilioFrom
              ) {
                await supabase
                  .from(
                    "emergency_calls",
                  )
                  .update({
                    call_status:
                      "failed",

                    updated_at:
                      new Date().toISOString(),
                  })
                  .eq(
                    "id",
                    call.id,
                  );

                return {
                  hospitalId:
                    call.hospital_id,

                  status:
                    "failed",

                  error:
                    `No Twilio From number configured for recipient ${recipientPhone}`,
                };
              }

              const answerUrl =
                `${supabaseUrl}/functions/v1/emergency-call` +
                `?action=answer&emergencyId=${emergency.id}`;

              const callResult =
                await makeTwilioCall(
                  accountSid,
                  authToken,
                  twilioFrom,
                  recipientPhone,
                  answerUrl,
                );

              if (
                callResult.ok
              ) {
                await supabase
                  .from(
                    "emergency_calls",
                  )
                  .update({
                    call_status:
                      "calling",

                    call_sid:
                      callResult.sid,

                    updated_at:
                      new Date().toISOString(),
                  })
                  .eq(
                    "id",
                    call.id,
                  );

                return {
                  hospitalId:
                    call.hospital_id,

                  status:
                    "calling",

                  provider:
                    "twilio",

                  callSid:
                    callResult.sid,

                  from:
                    twilioFrom,

                  to:
                    recipientPhone,

                  note:
                    "Voice call initiated",
                };
              }

              await supabase
                .from(
                  "emergency_calls",
                )
                .update({
                  call_status:
                    "failed",

                  updated_at:
                    new Date().toISOString(),
                })
                .eq(
                  "id",
                  call.id,
                );

              return {
                hospitalId:
                  call.hospital_id,

                status:
                  "failed",

                error:
                  callResult.error ||
                  "Twilio voice call error",

                from:
                  twilioFrom,

                to:
                  recipientPhone,
              };
            }

            /* =================================================
               PLIVO
            ================================================= */

            if (
              configuredProvider ===
              "plivo"
            ) {
              const authId =
                Deno.env.get(
                  "PLIVO_AUTH_ID",
                );

              const authToken =
                Deno.env.get(
                  "PLIVO_AUTH_TOKEN",
                );

              const fromNumber =
                normalizePhoneNumber(
                  Deno.env.get(
                    "PLIVO_FROM_NUMBER",
                  ),
                );

              if (
                !authId ||
                !authToken ||
                !fromNumber
              ) {
                await supabase
                  .from(
                    "emergency_calls",
                  )
                  .update({
                    call_status:
                      "failed",

                    updated_at:
                      new Date().toISOString(),
                  })
                  .eq(
                    "id",
                    call.id,
                  );

                return {
                  hospitalId:
                    call.hospital_id,

                  status:
                    "failed",

                  error:
                    "Plivo configuration incomplete",
                };
              }

              try {
                const answerUrl =
                  `${supabaseUrl}/functions/v1/emergency-call?provider=plivo&action=answer&emergencyId=${emergency.id}`;

                const callbackUrl =
                  `${supabaseUrl}/functions/v1/emergency-call?provider=plivo&action=callback`;

                const plivoRes =
                  await fetch(
                    `https://api.plivo.com/v1/Account/${authId}/Call/`,
                    {
                      method:
                        "POST",

                      headers: {
                        Authorization:
                          "Basic " +
                          btoa(
                            `${authId}:${authToken}`,
                          ),

                        "Content-Type":
                          "application/json",
                      },

                      body:
                        JSON.stringify(
                          {
                            from:
                              fromNumber,

                            to:
                              recipientPhone,

                            answer_url:
                              answerUrl,

                            answer_method:
                              "GET",

                            callback_url:
                              callbackUrl,

                            callback_method:
                              "POST",
                          },
                        ),
                    },
                  );

                const plivoData =
                  await plivoRes
                    .json()
                    .catch(
                      () => ({}),
                    );

                if (
                  plivoRes.ok
                ) {
                  const sid =
                    plivoData.request_uuid ||
                    plivoData.call_uuid ||
                    plivoData.sid ||
                    `plivo_${Date.now()}`;

                  await supabase
                    .from(
                      "emergency_calls",
                    )
                    .update({
                      call_status:
                        "calling",

                      call_sid:
                        sid,

                      updated_at:
                        new Date().toISOString(),
                    })
                    .eq(
                      "id",
                      call.id,
                    );

                  return {
                    hospitalId:
                      call.hospital_id,

                    status:
                      "calling",

                    callSid:
                      sid,

                    provider:
                      "plivo",
                  };
                }

                await supabase
                  .from(
                    "emergency_calls",
                  )
                  .update({
                    call_status:
                      "failed",

                    updated_at:
                      new Date().toISOString(),
                  })
                  .eq(
                    "id",
                    call.id,
                  );

                return {
                  hospitalId:
                    call.hospital_id,

                  status:
                    "failed",

                  error:
                    plivoData.message ||
                    "Plivo dispatch failed",
                };
              } catch (err) {
                await supabase
                  .from(
                    "emergency_calls",
                  )
                  .update({
                    call_status:
                      "failed",

                    updated_at:
                      new Date().toISOString(),
                  })
                  .eq(
                    "id",
                    call.id,
                  );

                return {
                  hospitalId:
                    call.hospital_id,

                  status:
                    "failed",

                  error:
                    String(err),
                };
              }
            }

            /* =================================================
               EXOTEL
            ================================================= */

            if (
              configuredProvider ===
              "exotel"
            ) {
              const exoSid =
                Deno.env.get(
                  "EXOTEL_ACCOUNT_SID",
                );

              const exoKey =
                Deno.env.get(
                  "EXOTEL_API_KEY",
                );

              const exoToken =
                Deno.env.get(
                  "EXOTEL_API_TOKEN",
                );

              const exoCallerId =
                Deno.env.get(
                  "EXOTEL_CALLER_ID",
                );

              const exoAppId =
                Deno.env.get(
                  "EXOTEL_APP_ID",
                );

              if (
                !exoSid ||
                !exoKey ||
                !exoToken ||
                !exoCallerId
              ) {
                await supabase
                  .from(
                    "emergency_calls",
                  )
                  .update({
                    call_status:
                      "failed",

                    updated_at:
                      new Date().toISOString(),
                  })
                  .eq(
                    "id",
                    call.id,
                  );

                return {
                  hospitalId:
                    call.hospital_id,

                  status:
                    "failed",

                  error:
                    "Exotel configuration incomplete",
                };
              }

              try {
                const params =
                  new URLSearchParams();

                params.append(
                  "From",
                  recipientPhone,
                );

                params.append(
                  "To",
                  exoCallerId,
                );

                params.append(
                  "CallerId",
                  exoCallerId,
                );

                params.append(
                  "CallType",
                  "trans",
                );

                if (exoAppId) {
                  params.append(
                    "Url",
                    `http://my.exotel.com/${exoSid}/exoml/start_voice/${exoAppId}`,
                  );
                }

                params.append(
                  "StatusCallback",
                  `${supabaseUrl}/functions/v1/emergency-call?provider=exotel&action=callback`,
                );

                const exotelRes =
                  await fetch(
                    `https://api.exotel.com/v1/Accounts/${exoSid}/Calls.json`,
                    {
                      method:
                        "POST",

                      headers: {
                        Authorization:
                          "Basic " +
                          btoa(
                            `${exoKey}:${exoToken}`,
                          ),

                        "Content-Type":
                          "application/x-www-form-urlencoded",
                      },

                      body:
                        params.toString(),
                    },
                  );

                const exoData =
                  await exotelRes
                    .json()
                    .catch(
                      () => ({}),
                    );

                if (
                  exotelRes.ok
                ) {
                  const sid =
                    exoData.Call?.Sid ||
                    exoData.Sid ||
                    `exo_${Date.now()}`;

                  await supabase
                    .from(
                      "emergency_calls",
                    )
                    .update({
                      call_status:
                        "calling",

                      call_sid:
                        sid,

                      updated_at:
                        new Date().toISOString(),
                    })
                    .eq(
                      "id",
                      call.id,
                    );

                  return {
                    hospitalId:
                      call.hospital_id,

                    status:
                      "calling",

                    callSid:
                      sid,

                    provider:
                      "exotel",
                  };
                }

                await supabase
                  .from(
                    "emergency_calls",
                  )
                  .update({
                    call_status:
                      "failed",

                    updated_at:
                      new Date().toISOString(),
                  })
                  .eq(
                    "id",
                    call.id,
                  );

                return {
                  hospitalId:
                    call.hospital_id,

                  status:
                    "failed",

                  error:
                    exoData.RestException
                      ?.Message ||
                    "Exotel dispatch failed",
                };
              } catch (err) {
                await supabase
                  .from(
                    "emergency_calls",
                  )
                  .update({
                    call_status:
                      "failed",

                    updated_at:
                      new Date().toISOString(),
                  })
                  .eq(
                    "id",
                    call.id,
                  );

                return {
                  hospitalId:
                    call.hospital_id,

                  status:
                    "failed",

                  error:
                    String(err),
                };
              }
            }

            /* =================================================
               DEMO MODE
            ================================================= */

            const mockSid =
              `demo_${Date.now()}_${call.id.slice(0, 8)}`;

            await supabase
              .from(
                "emergency_calls",
              )
              .update({
                call_status:
                  "calling",

                call_sid:
                  mockSid,

                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                "id",
                call.id,
              );

            setTimeout(
              async () => {
                try {
                  await supabase
                    .from(
                      "emergency_calls",
                    )
                    .update({
                      call_status:
                        "ringing",

                      updated_at:
                        new Date().toISOString(),
                    })
                    .eq(
                      "id",
                      call.id,
                    );

                  setTimeout(
                    async () => {
                      try {
                        await supabase
                          .from(
                            "emergency_calls",
                          )
                          .update({
                            call_status:
                              "answered",

                            call_duration:
                              32,

                            updated_at:
                              new Date().toISOString(),
                          })
                          .eq(
                            "id",
                            call.id,
                          );
                      } catch (_) {}
                    },
                    4500,
                  );
                } catch (_) {}
              },
              2500,
            );

            return {
              hospitalId:
                call.hospital_id,

              status:
                "calling",

              callSid:
                mockSid,

              mode:
                "demo",

              note:
                "Simulated emergency dispatch",
            };
          },
        ),
      );

    return jsonResponse({
      success: true,

      provider:
        configuredProvider,

      results,
    });
  } catch (err) {
    return jsonResponse(
      {
        error:
          err instanceof Error
            ? err.message
            : "Internal server error",
      },
      500,
    );
  }
});