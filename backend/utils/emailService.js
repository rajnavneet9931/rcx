// utils/emailService.js
// Handles ALL outgoing emails for TechSphere
// 1. Order confirmation          → sent when order is placed
// 2. Order status update         → sent when admin changes order status
// 3. Service request status      → sent when admin updates service ticket

const nodemailer = require('nodemailer');

// Reuse the same Gmail transporter used for OTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatINR(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function formatDate(date) {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

// Standard branded email wrapper — navy header + gold bar + white body
function wrapEmail(bodyHtml, previewText = '') {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${previewText}</title>
</head>
<body style="margin:0;padding:24px 0;background:#f0ede8;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;">

    <!-- Header -->
    <div style="background:#1a3a5c;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
      <div style="font-size:26px;font-weight:800;color:#ffffff;">
        ⚡ Jeecom<span style="color:#d4a843;"> IT</span>
      </div>
      <div style="color:rgba(255,255,255,0.55);font-size:12px;margin-top:4px;">
        IT Sales &amp; Services · Gurugram, Haryana
      </div>
    </div>

    <!-- Gold line -->
    <div style="height:4px;background:linear-gradient(90deg,#b8860b,#d4a843,#b8860b);"></div>

    <!-- Body -->
    <div style="background:#ffffff;padding:32px;">
      ${bodyHtml}

      <!-- Divider -->
      <div style="border-top:1px solid #e2ddd6;margin:28px 0 20px;"></div>

      <!-- Contact line -->
      <p style="font-size:12px;color:#9a948e;line-height:1.7;margin:0;">
        Questions? Email us at
        <a href="mailto:${process.env.GMAIL_USER}"
           style="color:#1a3a5c;font-weight:600;">${process.env.GMAIL_USER}</a>
        or call <strong>+91 87895 52086</strong>.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#1a3a5c;border-radius:0 0 12px 12px;padding:18px 32px;text-align:center;">
      <div style="color:rgba(255,255,255,0.45);font-size:11px;line-height:1.8;">
        © 2025 Jeecom Information Technology · Gurugram, Haryana, India<br>
        This is an automated message. Please do not reply directly.
      </div>
    </div>

  </div>
</body>
</html>`;
}

// ─── Colour + icon for each order status ─────────────────────────────────────
function getOrderStatusStyle(status) {
  const map = {
    'Pending':    { bg: '#fef3c7', color: '#92400e', icon: '⏳' },
    'Confirmed':  { bg: '#d1fae5', color: '#065f46', icon: '✅' },
    'Processing': { bg: '#dbeafe', color: '#1e40af', icon: '⚙️'  },
    'Shipped':    { bg: '#ede9fe', color: '#5b21b6', icon: '🚚' },
    'Delivered':  { bg: '#d1fae5', color: '#065f46', icon: '🎉' },
    'Cancelled':  { bg: '#fee2e2', color: '#991b1b', icon: '❌' },
  };
  return map[status] || { bg: '#f3f4f6', color: '#374151', icon: '📦' };
}

// ─── Colour + icon for each service status ────────────────────────────────────
function getServiceStatusStyle(status) {
  const map = {
    'Received':            { bg: '#dbeafe', color: '#1e40af', icon: '📥' },
    'Diagnosing':          { bg: '#fef3c7', color: '#92400e', icon: '🔍' },
    'In Progress':         { bg: '#ede9fe', color: '#5b21b6', icon: '🔧' },
    'Waiting for Parts':   { bg: '#ffedd5', color: '#9a3412', icon: '⏸️'  },
    'Ready for Pickup':    { bg: '#d1fae5', color: '#065f46', icon: '✅' },
    'Completed':           { bg: '#d1fae5', color: '#065f46', icon: '🎉' },
    'Cancelled':           { bg: '#fee2e2', color: '#991b1b', icon: '❌' },
  };
  return map[status] || { bg: '#f3f4f6', color: '#374151', icon: '🔧' };
}

// ─── Human-readable message for each order status ────────────────────────────
function getOrderStatusMessage(status, customerName) {
  const msgs = {
    'Pending':    `Hi ${customerName}, your order has been received and is awaiting processing.`,
    'Confirmed':  `Hi ${customerName}, great news! Your order has been confirmed and is being prepared.`,
    'Processing': `Hi ${customerName}, your order is currently being processed and packed by our team.`,
    'Shipped':    `Hi ${customerName}, your order is on its way! It has been shipped and will reach you soon.`,
    'Delivered':  `Hi ${customerName}, your order has been delivered. We hope you love your purchase!`,
    'Cancelled':  `Hi ${customerName}, your order has been cancelled. If you did not request this, please contact us immediately.`,
  };
  return msgs[status] || `Hi ${customerName}, your order status has been updated to "${status}".`;
}

// ─── Human-readable message for each service status ──────────────────────────
function getServiceStatusMessage(status, customerName) {
  const msgs = {
    'Received':            `Hi ${customerName}, we have received your service request and it is in our queue.`,
    'Diagnosing':          `Hi ${customerName}, our technician is currently diagnosing your device to identify the issue.`,
    'In Progress':         `Hi ${customerName}, your device is actively being repaired by our technical team.`,
    'Waiting for Parts':   `Hi ${customerName}, we are waiting for a spare part to arrive before we can continue. We'll update you as soon as it's in stock.`,
    'Ready for Pickup':    `Hi ${customerName}, great news! Your device is repaired and ready for pickup at our store.`,
    'Completed':           `Hi ${customerName}, your service request has been completed. Thank you for choosing Jeecom Information Technology!`,
    'Cancelled':           `Hi ${customerName}, your service request has been cancelled. Please contact us if you have any questions.`,
  };
  return msgs[status] || `Hi ${customerName}, your service request status has been updated to "${status}".`;
}

// ═════════════════════════════════════════════════════════════════════════════
// EMAIL 1 — Order Confirmation (sent when order is first placed)
// ═════════════════════════════════════════════════════════════════════════════
const sendOrderConfirmationEmail = async (order, paymentId = null) => {
  try {
    const itemRows = order.items.map(item => `
      <tr>
        <td style="padding:11px 14px;border-bottom:1px solid #e2ddd6;font-size:13px;color:#1a1714;">
          ${item.name}
        </td>
        <td style="padding:11px 14px;border-bottom:1px solid #e2ddd6;font-size:13px;
                   color:#5a5650;text-align:center;">${item.quantity}</td>
        <td style="padding:11px 14px;border-bottom:1px solid #e2ddd6;font-size:13px;
                   color:#5a5650;text-align:right;">${formatINR(item.price)}</td>
        <td style="padding:11px 14px;border-bottom:1px solid #e2ddd6;font-size:13px;
                   font-weight:700;color:#1a1714;text-align:right;">
          ${formatINR(item.price * item.quantity)}
        </td>
      </tr>
    `).join('');

    const body = `
      <!-- Success banner -->
      <div style="background:#2d6a4f;border-radius:8px;padding:18px;text-align:center;margin-bottom:24px;">
        <div style="font-size:28px;margin-bottom:6px;">✅</div>
        <div style="color:#ffffff;font-size:18px;font-weight:700;">Order Confirmed!</div>
        <div style="color:rgba(255,255,255,0.75);font-size:13px;margin-top:4px;">
          Thank you for shopping with Jeecom Information Technology
        </div>
      </div>

      <p style="font-size:15px;color:#1a1714;margin:0 0 6px;">
        Dear <strong>${order.customer.name}</strong>,
      </p>
      <p style="font-size:13px;color:#5a5650;line-height:1.7;margin:0 0 24px;">
        Your order has been placed and confirmed. Here is a summary:
      </p>

      <!-- Order meta -->
      <div style="background:#f7f6f3;border-radius:8px;padding:18px;
                  margin-bottom:24px;border-left:4px solid #b8860b;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:11px;color:#9a948e;text-transform:uppercase;
                       letter-spacing:0.08em;padding-bottom:3px;">Order Number</td>
            <td style="font-size:11px;color:#9a948e;text-transform:uppercase;
                       letter-spacing:0.08em;padding-bottom:3px;text-align:right;">Date</td>
          </tr>
          <tr>
            <td style="font-size:20px;font-weight:800;color:#1a3a5c;">#${order.orderNumber}</td>
            <td style="font-size:13px;color:#5a5650;text-align:right;">${formatDate(order.createdAt)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top:10px;border-top:1px solid #e2ddd6;"></td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#5a5650;">
              <strong>Payment:</strong> ${order.paymentMethod}
              ${paymentId ? `<br><span style="font-size:11px;color:#9a948e;">Ref: ${paymentId}</span>` : ''}
            </td>
            <td style="text-align:right;">
              <span style="background:#d1fae5;color:#065f46;font-size:11px;font-weight:700;
                           padding:4px 10px;border-radius:4px;text-transform:uppercase;">
                ${order.status}
              </span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Items -->
      <div style="font-size:11px;font-weight:700;color:#9a948e;text-transform:uppercase;
                  letter-spacing:0.08em;margin-bottom:10px;">Items Ordered</div>
      <div style="border:1px solid #e2ddd6;border-radius:8px;overflow:hidden;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#1a3a5c;">
              <th style="padding:9px 14px;text-align:left;font-size:10px;
                         color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:0.07em;">Product</th>
              <th style="padding:9px 14px;text-align:center;font-size:10px;
                         color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:0.07em;">Qty</th>
              <th style="padding:9px 14px;text-align:right;font-size:10px;
                         color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:0.07em;">Price</th>
              <th style="padding:9px 14px;text-align:right;font-size:10px;
                         color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:0.07em;">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr style="background:#f7f6f3;">
              <td colspan="3" style="padding:13px 14px;font-size:13px;font-weight:700;
                                     color:#5a5650;text-align:right;">Grand Total</td>
              <td style="padding:13px 14px;font-size:20px;font-weight:800;
                         color:#1a3a5c;text-align:right;">${formatINR(order.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      ${order.customer.address ? `
      <div style="background:#f7f6f3;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
        <div style="font-size:11px;color:#9a948e;text-transform:uppercase;
                    letter-spacing:0.08em;margin-bottom:5px;">Delivery Address</div>
        <div style="font-size:13px;color:#1a1714;line-height:1.6;">📍 ${order.customer.address}</div>
      </div>` : ''}

      <!-- Next steps -->
      <div style="border:1px solid #e2ddd6;border-radius:8px;padding:18px;">
        <div style="font-size:13px;font-weight:700;color:#1a3a5c;margin-bottom:10px;">📦 What happens next?</div>
        <div style="font-size:13px;color:#5a5650;line-height:2;">
          ✅ &nbsp;Order confirmed &amp; being processed<br>
          🔍 &nbsp;Our team will verify and pack your items<br>
          🚚 &nbsp;Shipped within 1–2 business days<br>
          📬 &nbsp;You'll get an email update at every step
        </div>
      </div>

      <!-- PDF note -->
      <div style="background:#f0f9ff;border-radius:8px;padding:14px 18px;margin-top:20px;
                  border-left:4px solid #0284c7;">
        <div style="font-size:13px;color:#0369a1;">
          📎 <strong>Your invoice is attached</strong> to this email as a PDF.
          Need a GST invoice? Reply to this email or contact us with your GSTIN.
        </div>
      </div>
    `;

    // Generate PDF bill
    const { generateBillPDF } = require('./pdfService');
    const pdfBuffer = await generateBillPDF(order);

    await transporter.sendMail({
      from: `"Jeecom Information Technology" <${process.env.GMAIL_USER}>`,
      to: order.customer.email,
      subject: `✅ Order Confirmed — #${order.orderNumber} | Jeecom IT`,
      html: wrapEmail(body, `Order Confirmed #${order.orderNumber}`),
      attachments: [
        {
          filename: `JeecomIT-Invoice-${order.orderNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    console.log(`📧 Confirmation email + PDF → ${order.customer.email} (#${order.orderNumber})`);
  } catch (err) {
    console.error(`⚠️  Confirmation email failed (${order.customer.email}):`, err.message);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// EMAIL 1B — GST Invoice (sent on customer request or admin trigger)
// ═════════════════════════════════════════════════════════════════════════════
const sendGSTInvoiceEmail = async (order) => {
  try {
    const { generateGSTInvoicePDF } = require('./pdfService');
    const pdfBuffer = await generateGSTInvoicePDF(order);

    const body = `
      <div style="background:#fef3c7;border-radius:8px;padding:20px;
                  text-align:center;margin-bottom:24px;">
        <div style="font-size:32px;margin-bottom:8px;">🧾</div>
        <div style="font-size:18px;font-weight:800;color:#92400e;">GST Tax Invoice</div>
        <div style="font-size:13px;color:#b45309;margin-top:4px;">
          As requested for Order #${order.orderNumber}
        </div>
      </div>

      <p style="font-size:14px;color:#5a5650;line-height:1.7;margin:0 0 20px;">
        Dear <strong>${order.customer.name}</strong>,<br><br>
        Please find your GST Tax Invoice attached to this email as a PDF.
        This invoice includes a full breakdown of CGST and SGST charges as per
        Indian GST regulations.
      </p>

      <div style="background:#f7f6f3;border-radius:8px;padding:18px;
                  margin-bottom:20px;border-left:4px solid #b8860b;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:11px;color:#9a948e;padding-bottom:3px;">Invoice Number</td>
            <td style="font-size:11px;color:#9a948e;padding-bottom:3px;text-align:right;">Date</td>
          </tr>
          <tr>
            <td style="font-size:18px;font-weight:800;color:#1a3a5c;">INV-${order.orderNumber}</td>
            <td style="font-size:13px;color:#5a5650;text-align:right;">${formatDate(order.createdAt)}</td>
          </tr>
          <tr><td colspan="2" style="padding-top:8px;border-top:1px solid #e2ddd6;"></td></tr>
          <tr>
            <td style="font-size:13px;color:#5a5650;">Total Amount (Incl. GST)</td>
            <td style="font-size:18px;font-weight:800;color:#1a3a5c;text-align:right;">
              ₹${Number(order.totalAmount).toLocaleString('en-IN')}
            </td>
          </tr>
        </table>
      </div>

      <div style="background:#f0f9ff;border-radius:8px;padding:14px 18px;
                  border-left:4px solid #0284c7;">
        <div style="font-size:13px;color:#0369a1;">
          📎 <strong>GST Tax Invoice is attached</strong> as a PDF to this email.<br>
          <span style="font-size:12px;">
            Our GSTIN: <strong>${process.env.COMPANY_GSTIN || '03AABCT1332L000'}</strong>
          </span>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Jeecom Information Technology" <${process.env.GMAIL_USER}>`,
      to: order.customer.email,
      subject: `🧾 GST Invoice — INV-${order.orderNumber} | Jeecom IT`,
      html: wrapEmail(body, `GST Invoice INV-${order.orderNumber}`),
      attachments: [
        {
          filename: `JeecomIT-GST-Invoice-${order.orderNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    console.log(`📧 GST Invoice email + PDF → ${order.customer.email} (INV-${order.orderNumber})`);
  } catch (err) {
    console.error(`⚠️  GST invoice email failed:`, err.message);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// EMAIL 2 — Order Status Update (sent when admin changes order status)
// ═════════════════════════════════════════════════════════════════════════════
const sendOrderStatusEmail = async (order) => {
  try {
    const style = getOrderStatusStyle(order.status);
    const message = getOrderStatusMessage(order.status, order.customer.name);

    const body = `
      <!-- Status badge -->
      <div style="background:${style.bg};border-radius:8px;padding:20px;
                  text-align:center;margin-bottom:24px;">
        <div style="font-size:36px;margin-bottom:8px;">${style.icon}</div>
        <div style="font-size:20px;font-weight:800;color:${style.color};">
          Order ${order.status}
        </div>
      </div>

      <p style="font-size:14px;color:#5a5650;line-height:1.7;margin:0 0 24px;">
        ${message}
      </p>

      <!-- Order reference -->
      <div style="background:#f7f6f3;border-radius:8px;padding:18px;
                  margin-bottom:24px;border-left:4px solid #b8860b;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:11px;color:#9a948e;text-transform:uppercase;
                       letter-spacing:0.08em;padding-bottom:4px;">Order Number</td>
            <td style="font-size:11px;color:#9a948e;text-transform:uppercase;
                       letter-spacing:0.08em;padding-bottom:4px;text-align:right;">Updated</td>
          </tr>
          <tr>
            <td style="font-size:20px;font-weight:800;color:#1a3a5c;">#${order.orderNumber}</td>
            <td style="font-size:13px;color:#5a5650;text-align:right;">${formatDate(new Date())}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top:10px;border-top:1px solid #e2ddd6;"></td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#5a5650;">
              <strong>Total:</strong> ${formatINR(order.totalAmount)}
            </td>
            <td style="text-align:right;">
              <span style="background:${style.bg};color:${style.color};font-size:11px;
                           font-weight:700;padding:4px 10px;border-radius:4px;
                           text-transform:uppercase;">${order.status}</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Items summary -->
      <div style="font-size:11px;font-weight:700;color:#9a948e;text-transform:uppercase;
                  letter-spacing:0.08em;margin-bottom:10px;">Your Items</div>
      <div style="border:1px solid #e2ddd6;border-radius:8px;overflow:hidden;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          ${order.items.map(item => `
            <tr>
              <td style="padding:10px 14px;border-bottom:1px solid #e2ddd6;
                         font-size:13px;color:#1a1714;">${item.name}</td>
              <td style="padding:10px 14px;border-bottom:1px solid #e2ddd6;
                         font-size:13px;color:#5a5650;text-align:center;">×${item.quantity}</td>
              <td style="padding:10px 14px;border-bottom:1px solid #e2ddd6;
                         font-size:13px;font-weight:600;color:#1a1714;text-align:right;">
                ${formatINR(item.price * item.quantity)}
              </td>
            </tr>
          `).join('')}
        </table>
      </div>

      <!-- Specific message for shipped status -->
      ${order.status === 'Shipped' ? `
      <div style="background:#ede9fe;border-radius:8px;padding:16px 18px;margin-bottom:16px;
                  border-left:4px solid #7c3aed;">
        <div style="font-size:13px;font-weight:700;color:#5b21b6;margin-bottom:6px;">
          🚚 Your order is on its way!
        </div>
        <div style="font-size:13px;color:#5a5650;line-height:1.6;">
          Please keep your phone handy — the delivery agent may call you before delivery.
          If you're unavailable, they will attempt redelivery the next business day.
        </div>
      </div>` : ''}

      <!-- Specific message for delivered status -->
      ${order.status === 'Delivered' ? `
      <div style="background:#d1fae5;border-radius:8px;padding:16px 18px;margin-bottom:16px;
                  border-left:4px solid #059669;">
        <div style="font-size:13px;font-weight:700;color:#065f46;margin-bottom:6px;">
          🎉 Thank you for your purchase!
        </div>
        <div style="font-size:13px;color:#5a5650;line-height:1.6;">
          We hope you love your new product. If you have any issues, contact us within
          7 days and we'll make it right.
        </div>
      </div>` : ''}

      <!-- Specific message for cancelled status -->
      ${order.status === 'Cancelled' ? `
      <div style="background:#fee2e2;border-radius:8px;padding:16px 18px;margin-bottom:16px;
                  border-left:4px solid #dc2626;">
        <div style="font-size:13px;font-weight:700;color:#991b1b;margin-bottom:6px;">
          ❌ Order Cancelled
        </div>
        <div style="font-size:13px;color:#5a5650;line-height:1.6;">
          If you paid online, your refund will be processed within 5–7 business days
          to your original payment method. Contact us if you have any questions.
        </div>
      </div>` : ''}
    `;

    const subjectMap = {
      'Shipped':   `🚚 Your Order #${order.orderNumber} Has Been Shipped | Jeecom IT`,
      'Delivered': `🎉 Your Order #${order.orderNumber} Has Been Delivered | Jeecom IT`,
      'Cancelled': `❌ Your Order #${order.orderNumber} Has Been Cancelled | Jeecom IT`,
      'Confirmed': `✅ Your Order #${order.orderNumber} Is Confirmed | Jeecom IT`,
    };
    const subject = subjectMap[order.status]
      || `📦 Order #${order.orderNumber} — Status: ${order.status} | Jeecom IT`;

    await transporter.sendMail({
      from: `"Jeecom Information Technology" <${process.env.GMAIL_USER}>`,
      to: order.customer.email,
      subject,
      html: wrapEmail(body, subject),
    });

    console.log(`📧 Order status email → ${order.customer.email} (${order.status})`);
  } catch (err) {
    console.error(`⚠️  Order status email failed:`, err.message);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// EMAIL 3 — Service Request Status Update (sent when admin updates ticket)
// Includes service charge when estimatedCost is set
// ═════════════════════════════════════════════════════════════════════════════
const sendServiceStatusEmail = async (serviceRequest) => {
  try {
    const style = getServiceStatusStyle(serviceRequest.status);
    const message = getServiceStatusMessage(serviceRequest.status, serviceRequest.customer.name);
    const hasCost = serviceRequest.estimatedCost && serviceRequest.estimatedCost > 0;

    const body = `
      <!-- Status badge -->
      <div style="background:${style.bg};border-radius:8px;padding:20px;
                  text-align:center;margin-bottom:24px;">
        <div style="font-size:36px;margin-bottom:8px;">${style.icon}</div>
        <div style="font-size:20px;font-weight:800;color:${style.color};">
          Service ${serviceRequest.status}
        </div>
      </div>

      <p style="font-size:14px;color:#5a5650;line-height:1.7;margin:0 0 24px;">
        ${message}
      </p>

      <!-- Ticket reference -->
      <div style="background:#f7f6f3;border-radius:8px;padding:18px;
                  margin-bottom:24px;border-left:4px solid #b8860b;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:11px;color:#9a948e;text-transform:uppercase;
                       letter-spacing:0.08em;padding-bottom:4px;">Ticket Number</td>
            <td style="font-size:11px;color:#9a948e;text-transform:uppercase;
                       letter-spacing:0.08em;padding-bottom:4px;text-align:right;">Updated</td>
          </tr>
          <tr>
            <td style="font-size:18px;font-weight:800;color:#1a3a5c;">
              ${serviceRequest.ticketNumber}
            </td>
            <td style="font-size:13px;color:#5a5650;text-align:right;">${formatDate(new Date())}</td>
          </tr>
          <tr><td colspan="2" style="padding-top:10px;border-top:1px solid #e2ddd6;"></td></tr>
          <tr>
            <td style="font-size:13px;color:#5a5650;">
              <strong>Service:</strong> ${serviceRequest.serviceType}
            </td>
            <td style="text-align:right;">
              <span style="background:${style.bg};color:${style.color};font-size:11px;
                           font-weight:700;padding:4px 10px;border-radius:4px;
                           text-transform:uppercase;">${serviceRequest.status}</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Device info -->
      ${(serviceRequest.deviceInfo?.brand || serviceRequest.deviceInfo?.type) ? `
      <div style="font-size:11px;font-weight:700;color:#9a948e;text-transform:uppercase;
                  letter-spacing:0.08em;margin-bottom:10px;">Device</div>
      <div style="border:1px solid #e2ddd6;border-radius:8px;padding:14px 18px;
                  font-size:13px;color:#1a1714;margin-bottom:24px;">
        🖥️ &nbsp;${[serviceRequest.deviceInfo?.brand, serviceRequest.deviceInfo?.type,
                     serviceRequest.deviceInfo?.model].filter(Boolean).join(' · ')}
      </div>` : ''}

      <!-- Service Charge Box — shown when estimatedCost is set -->
      ${hasCost ? `
      <div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:8px;
                  padding:20px;margin-bottom:24px;">
        <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:14px;">
          💰 Service Charge Estimate
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:13px;color:#92400e;padding:4px 0;">Service Type</td>
            <td style="font-size:13px;color:#92400e;font-weight:600;text-align:right;">
              ${serviceRequest.serviceType}
            </td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#92400e;padding:4px 0;">Estimated Cost</td>
            <td style="font-size:22px;font-weight:800;color:#b45309;text-align:right;">
              ${formatINR(serviceRequest.estimatedCost)}
            </td>
          </tr>
        </table>
        <div style="border-top:1px solid #fcd34d;margin-top:12px;padding-top:12px;
                    font-size:12px;color:#92400e;line-height:1.6;">
          ⚠️ This is an <strong>estimate</strong>. Final charges may vary based on
          parts used and actual work done. You will be informed before any work
          exceeding this estimate is carried out.
        </div>
      </div>` : ''}

      <!-- Tech notes from admin -->
      ${serviceRequest.adminNotes ? `
      <div style="background:#f0f9ff;border-radius:8px;padding:16px 18px;
                  margin-bottom:24px;border-left:4px solid #0284c7;">
        <div style="font-size:11px;font-weight:700;color:#0369a1;text-transform:uppercase;
                    letter-spacing:0.08em;margin-bottom:6px;">Note from Our Technician</div>
        <div style="font-size:13px;color:#1a1714;line-height:1.7;">
          "${serviceRequest.adminNotes}"
        </div>
      </div>` : ''}

      <!-- Ready for pickup message -->
      ${serviceRequest.status === 'Ready for Pickup' ? `
      <div style="background:#d1fae5;border-radius:8px;padding:16px 18px;margin-bottom:16px;
                  border-left:4px solid #059669;">
        <div style="font-size:13px;font-weight:700;color:#065f46;margin-bottom:6px;">
          ✅ Your device is ready!
        </div>
        <div style="font-size:13px;color:#5a5650;line-height:1.6;">
          Please visit our store at <strong>Sector 4, Urban Estate, Gurugram, Haryana 122001</strong> during
          business hours (Mon–Sat, 10 AM – 7 PM) with this ticket number:
          <strong>${serviceRequest.ticketNumber}</strong>
          ${hasCost ? `<br>Please bring <strong>${formatINR(serviceRequest.estimatedCost)}</strong> for the service charges.` : ''}
        </div>
      </div>` : ''}

      <p style="font-size:12px;color:#9a948e;margin:0;">
        Please quote your ticket number <strong>${serviceRequest.ticketNumber}</strong>
        in all communications with us.
      </p>
    `;

    const subjectMap = {
      'Ready for Pickup':  `✅ Device Ready for Pickup — ${serviceRequest.ticketNumber} | Jeecom IT`,
      'Completed':         `🎉 Service Completed — ${serviceRequest.ticketNumber} | Jeecom IT`,
      'In Progress':       `🔧 Work Started on Your Device — ${serviceRequest.ticketNumber} | Jeecom IT`,
      'Waiting for Parts': `⏸️ Waiting for Spare Part — ${serviceRequest.ticketNumber} | Jeecom IT`,
      'Cancelled':         `❌ Service Request Cancelled — ${serviceRequest.ticketNumber} | Jeecom IT`,
    };
    const subject = subjectMap[serviceRequest.status]
      || `🔧 Service Update — ${serviceRequest.ticketNumber} | Jeecom IT`;

    await transporter.sendMail({
      from: `"Jeecom Information Technology" <${process.env.GMAIL_USER}>`,
      to: serviceRequest.customer.email,
      subject,
      html: wrapEmail(body, subject),
    });

    console.log(`📧 Service email → ${serviceRequest.customer.email} (${serviceRequest.status})`);
  } catch (err) {
    console.error(`⚠️  Service status email failed:`, err.message);
  }
};

module.exports = {
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendServiceStatusEmail,
  sendGSTInvoiceEmail,
};