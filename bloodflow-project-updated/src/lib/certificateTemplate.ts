import { CERTIFICATE_LOGO_DATA_URI } from './certificateLogo';
import type { Certificate } from './supabase';

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function buildCertificateHtml(certificate: Certificate) {
  const donorName = certificate.donor_name || 'Donor';
  const date = formatDate(certificate.donation_date);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${certificate.certificate_number} — BloodFlow Certificate</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Poppins:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Poppins', Arial, sans-serif;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 24px;
  }
  .certificate {
    position: relative;
    width: 1000px;
    max-width: 100%;
    background: #ffffff;
    overflow: hidden;
    border-radius: 12px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.15);
    padding: 64px 72px;
  }
  .ribbon {
    position: absolute;
    width: 380px;
    height: 130px;
  }
  .ribbon-tl {
    top: -55px;
    left: -110px;
    transform: rotate(-45deg);
    background: linear-gradient(90deg, #7f1d1d 0%, #7f1d1d 30%, #ffffff 30%, #ffffff 34%, #b91c1c 34%, #b91c1c 100%);
  }
  .ribbon-br {
    bottom: -55px;
    right: -110px;
    transform: rotate(-45deg);
    background: linear-gradient(90deg, #b91c1c 0%, #b91c1c 66%, #ffffff 66%, #ffffff 70%, #7f1d1d 70%, #7f1d1d 100%);
  }
  .logo {
    position: absolute;
    top: 40px;
    right: 48px;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    object-fit: cover;
    box-shadow: 0 4px 14px rgba(0,0,0,0.15);
  }
  .content { position: relative; z-index: 2; text-align: center; }
  h1 {
    color: #7f1d1d;
    font-weight: 800;
    font-size: 40px;
    letter-spacing: 1px;
    margin: 0 0 4px;
  }
  h2 {
    color: #7f1d1d;
    font-weight: 600;
    font-size: 30px;
    letter-spacing: 4px;
    margin: 0 0 28px;
  }
  .awarded-to {
    font-size: 17px;
    color: #334155;
    margin-bottom: 8px;
  }
  .donor-name {
    font-family: 'Great Vibes', cursive;
    font-size: 56px;
    color: #7f1d1d;
    margin: 4px 0 6px;
  }
  .underline {
    width: 320px;
    height: 2px;
    background: #7f1d1d;
    margin: 0 auto 22px;
  }
  .blurb {
    max-width: 640px;
    margin: 0 auto 28px;
    font-size: 15.5px;
    line-height: 1.7;
    color: #475569;
  }
  .meta-row {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 28px;
    font-size: 13.5px;
    color: #64748b;
  }
  .meta-row span { margin: 0 16px; }
  .meta-row strong { color: #1e293b; }
  .given-on {
    font-weight: 700;
    color: #7f1d1d;
    font-size: 17px;
    margin-bottom: 40px;
  }
  .bottom-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    text-align: left;
  }
  .rosette { width: 90px; height: auto; }
  .signature {
    text-align: right;
  }
  .signature .name {
    font-weight: 700;
    color: #7f1d1d;
    font-size: 15px;
  }
  .signature .title {
    font-size: 12.5px;
    color: #64748b;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .certificate { box-shadow: none; border-radius: 0; }
  }
</style>
</head>
<body>
  <div class="certificate">
    <div class="ribbon ribbon-tl"></div>
    <div class="ribbon ribbon-br"></div>
    <img class="logo" src="${CERTIFICATE_LOGO_DATA_URI}" alt="BloodFlow" />

    <div class="content">
      <h1>BLOOD DONATION</h1>
      <h2>CERTIFICATE</h2>

      <p class="awarded-to">This certificate is proudly awarded to</p>
      <p class="donor-name">${donorName}</p>
      <div class="underline"></div>

      <p class="blurb">
        to honor their selfless act of donating blood at <strong>${certificate.hospital_name}</strong>,
        which has helped save lives and bring hope to those in need.
      </p>

      <div class="meta-row">
        <span>Certificate No. <strong>${certificate.certificate_number}</strong></span>
        <span>Blood Group <strong>${certificate.donor_blood_group || 'N/A'}</strong></span>
        <span>Units Donated <strong>${certificate.units_collected}</strong></span>
      </div>

      <p class="given-on">Given on this day, ${date}</p>

      <div class="bottom-row">
        <svg class="rosette" viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg">
          <polygon points="50,60 20,125 40,110 50,130 60,110 80,125" fill="#7f1d1d"/>
          <circle cx="50" cy="42" r="38" fill="#b91c1c"/>
          <circle cx="50" cy="42" r="27" fill="#f5c542"/>
        </svg>
        <div class="signature">
          <p class="name">Himanshu Kukde</p>
          <p class="title">Director, BloodFlow Services</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
