import nodemailer from "nodemailer";

type ContactEmail = {
  name: string;
  email: string;
  message: string;
};

/**
 * Envía una notificación por email al administrar mensajes de contacto.
 * Si no hay SMTP configurado, registra el mensaje en consola y devuelve false
 * (el mensaje igualmente queda guardado en la base de datos).
 */
export async function sendContactNotification(
  data: ContactEmail,
): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const to = process.env.CONTACT_EMAIL;

  if (!host || !to) {
    console.log(
      "[mail] SMTP no configurado — nuevo mensaje de contacto recibido:",
      JSON.stringify(data),
    );
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" }
        : undefined,
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || host,
      to,
      replyTo: data.email,
      subject: `Nuevo mensaje de contacto: ${data.name}`,
      text: `Nombre: ${data.name}\nEmail: ${data.email}\n\n${data.message}`,
      html: `<p><strong>${data.name}</strong> — ${data.email}</p><p>${data.message
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/\n/g, "<br>")}</p>`,
    });
    return true;
  } catch (err) {
    console.error("[mail] Error enviando notificación:", err);
    return false;
  }
}
